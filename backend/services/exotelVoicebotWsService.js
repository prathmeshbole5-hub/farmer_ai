/* ==========================================================================
   KrishiMitra AI — Exotel Voicebot WebSocket Service (Phase 2B)
   Path: /exotel-voicebot

   ISOLATED MODULE:
   - Attaches WebSocket Server to existing Node HTTP server on /exotel-voicebot.
   - Handles Exotel Voicebot stream protocol: connected, start, media, dtmf, mark, clear, stop.
   - Buffers 8000 Hz 16-bit mono linear PCM audio per session.
   - Performs End-of-Speech / VAD detection.
   - Connects to Sarvam Saaras v3 STT -> Gemma 3 AI -> Sarvam Bulbul v3 TTS.
   - Resamples TTS audio to 8000 Hz s16le PCM and streams back over WSS.
   - Maintains continuous conversation loop for follow-up questions.
   ========================================================================== */

'use strict';

const WebSocket    = require('ws');
const fs           = require('fs');
const path         = require('path');
const { logger }   = require('../middleware/logger');
const speech       = require('./speechService');
const farmerCall   = require('./farmerCallService');

// ── In-Memory Sessions Registry ───────────────────────────────────────────────
const activeSessions   = new Map(); // Key: streamSid -> Session Object
let wssInstance        = null;
let totalConnections   = 0;

// ── Constants for Audio VAD & Resampling ──────────────────────────────────────
const SILENCE_ENERGY_THRESHOLD = 300;   // 16-bit amplitude threshold for silence
const MIN_SPEECH_BYTES         = 12800; // ~800ms of 8000Hz 16-bit mono PCM (8000 * 2 * 0.8)
const MAX_SPEECH_BYTES         = 128000;// ~8 seconds max per utterance
const SILENCE_CHUNKS_THRESHOLD = 25;    // ~500ms of continuous silence after speech
const CHUNK_FRAME_BYTES        = 320;   // 20ms frame size at 8000Hz 16-bit mono (8000 * 2 * 0.02)

const TEMP_CALL_DIR = path.join(__dirname, '..', 'uploads', 'farmer_calls');
if (!fs.existsSync(TEMP_CALL_DIR)) {
  fs.mkdirSync(TEMP_CALL_DIR, { recursive: true });
}

// ==============================================================================
// AUDIO HELPER FUNCTIONS
// ==============================================================================

/**
 * Prepend a 44-byte WAV header to raw 16-bit PCM bytes.
 */
function createWavBuffer(pcmBuffer, sampleRate = 8000, numChannels = 1, bitDepth = 16) {
  const dataSize   = pcmBuffer.length;
  const headerSize = 44;
  const wavBuffer   = Buffer.alloc(headerSize + dataSize);

  // RIFF chunk descriptor
  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(36 + dataSize, 4);
  wavBuffer.write('WAVE', 8);

  // fmt sub-chunk
  wavBuffer.write('fmt ', 12);
  wavBuffer.writeUInt32LE(16, 16);               // Subchunk1Size (16 for PCM)
  wavBuffer.writeUInt16LE(1, 20);                // AudioFormat (1 for PCM)
  wavBuffer.writeUInt16LE(numChannels, 22);      // NumChannels
  wavBuffer.writeUInt32LE(sampleRate, 24);       // SampleRate
  wavBuffer.writeUInt32LE(sampleRate * numChannels * (bitDepth / 8), 28); // ByteRate
  wavBuffer.writeUInt16LE(numChannels * (bitDepth / 8), 32);              // BlockAlign
  wavBuffer.writeUInt16LE(bitDepth, 34);         // BitsPerSample

  // data sub-chunk
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(dataSize, 40);

  // Copy raw PCM payload
  pcmBuffer.copy(wavBuffer, 44);

  return wavBuffer;
}

/**
 * Calculate Root Mean Square (RMS) energy of a 16-bit PCM audio chunk.
 */
function calculateAudioEnergy(pcmBuffer) {
  if (!pcmBuffer || pcmBuffer.length < 2) return 0;
  const numSamples = Math.floor(pcmBuffer.length / 2);
  let sumSquare = 0;

  for (let i = 0; i < numSamples; i++) {
    const sample = pcmBuffer.readInt16LE(i * 2);
    sumSquare += sample * sample;
  }

  return Math.sqrt(sumSquare / numSamples);
}

/**
 * Parse WAV audio buffer and resample 16-bit PCM to 8000 Hz mono s16le PCM.
 */
function resampleWavTo8kPcm(wavBuffer) {
  if (!wavBuffer || wavBuffer.length < 44) return Buffer.alloc(0);

  // Read WAV header
  let numChannels = wavBuffer.readUInt16LE(22);
  let sampleRate  = wavBuffer.readUInt32LE(24);

  // Find data chunk offset
  let dataOffset = 44;
  for (let i = 12; i < wavBuffer.length - 8; i++) {
    if (
      wavBuffer[i] === 0x64 &&     // 'd'
      wavBuffer[i+1] === 0x61 &&   // 'a'
      wavBuffer[i+2] === 0x74 &&   // 't'
      wavBuffer[i+3] === 0x61      // 'a'
    ) {
      dataOffset = i + 8;
      break;
    }
  }

  const pcmRaw = wavBuffer.subarray(dataOffset);
  const inNumSamples = Math.floor(pcmRaw.length / (2 * numChannels));
  if (inNumSamples <= 0) return Buffer.alloc(0);

  // Convert input to mono Int16Array
  const monoSamples = new Int16Array(inNumSamples);
  for (let i = 0; i < inNumSamples; i++) {
    let sum = 0;
    for (let c = 0; c < numChannels; c++) {
      sum += pcmRaw.readInt16LE((i * numChannels + c) * 2);
    }
    monoSamples[i] = Math.round(sum / numChannels);
  }

  // Resample to 8000 Hz via linear interpolation
  const targetRate = 8000;
  const outNumSamples = Math.floor((inNumSamples * targetRate) / sampleRate);
  const outPcm = Buffer.alloc(outNumSamples * 2);
  const ratio = sampleRate / targetRate;

  for (let i = 0; i < outNumSamples; i++) {
    const srcPos = i * ratio;
    const index0 = Math.floor(srcPos);
    const index1 = Math.min(index0 + 1, inNumSamples - 1);
    const frac   = srcPos - index0;

    const s0 = monoSamples[index0];
    const s1 = monoSamples[index1];
    const interpolated = Math.round(s0 + frac * (s1 - s0));

    outPcm.writeInt16LE(Math.max(-32768, Math.min(32767, interpolated)), i * 2);
  }

  return outPcm;
}

// ==============================================================================
// REAL AI PIPELINE EXECUTOR (STT -> AI -> TTS -> Resample -> Exotel WSS)
// ==============================================================================

/**
 * Process a complete speech segment accumulated from the farmer's live phone call.
 */
async function processSpeechSegment(session) {
  if (session.isProcessing || session.audioBuffers.length === 0) return;

  session.isProcessing = true;
  const streamSid      = session.streamSid;
  const startTime      = Date.now();

  // Combine accumulated PCM buffers
  const fullPcm      = Buffer.concat(session.audioBuffers);
  session.audioBuffers = []; // Clear buffer for next utterance
  session.silenceChunksCount = 0;

  if (fullPcm.length < MIN_SPEECH_BYTES) {
    logger.debug(`[EXOTEL-AI] Audio segment too short (${fullPcm.length} bytes), ignoring.`);
    session.isProcessing = false;
    return;
  }

  logger.info(`[EXOTEL-AI] Starting Voicebot Pipeline for session ${streamSid} (${fullPcm.length} bytes PCM)`);

  const tempFile = path.join(TEMP_CALL_DIR, `call_segment_${Date.now()}_${Math.random().toString(36).substring(7)}.wav`);
  let responseAudioSent = false;

  try {
    // 1. Convert 8k PCM to WAV file format
    const wavBuffer = createWavBuffer(fullPcm, 8000, 1, 16);
    fs.writeFileSync(tempFile, wavBuffer);

    // ── STT ──────────────────────────────────────────────────────────────────
    const sttStart = Date.now();
    logger.info(`[EXOTEL-AI] Step 1: STT starting (Saaras v3)...`);
    const sttRes = await speech.transcribeAudio(tempFile);
    const sttMs  = Date.now() - sttStart;

    if (!sttRes.success || !sttRes.transcript) {
      logger.warn(`[EXOTEL-AI] STT_ERROR: ${sttRes.error || 'Empty transcript'} (${sttMs}ms)`);
      session.isProcessing = false;
      return;
    }

    const transcript = sttRes.transcript.trim();
    const lang       = sttRes.language || session.language || 'hi';
    session.language = lang; // preserve detected language for session

    logger.info(`[EXOTEL-AI] STT_SUCCESS (${sttMs}ms): Lang="${lang}", Text="${transcript}"`);

    // ── AI GENERATION ────────────────────────────────────────────────────────
    const aiStart = Date.now();
    logger.info(`[EXOTEL-AI] Step 2: AI Response starting (Gemma 3)...`);
    const aiRes   = await farmerCall.generateAIResponse(transcript, lang);
    const aiMs    = Date.now() - aiStart;

    if (!aiRes.success || !aiRes.reply) {
      logger.warn(`[EXOTEL-AI] AI_ERROR: ${aiRes.error || 'Empty reply'} (${aiMs}ms)`);
      session.isProcessing = false;
      return;
    }

    const aiReply = aiRes.reply.trim();
    logger.info(`[EXOTEL-AI] AI_SUCCESS (${aiMs}ms): Reply="${aiReply}"`);

    // ── TTS SYNTHESIS ────────────────────────────────────────────────────────
    const ttsStart = Date.now();
    logger.info(`[EXOTEL-AI] Step 3: TTS Synthesis starting (Bulbul v3)...`);
    const ttsRes   = await speech.synthesizeSpeech(aiReply, lang);
    const ttsMs    = Date.now() - ttsStart;

    if (!ttsRes.success || !ttsRes.audioBase64) {
      logger.warn(`[EXOTEL-AI] TTS_ERROR: ${ttsRes.error || 'No audio base64'} (${ttsMs}ms)`);
      session.isProcessing = false;
      return;
    }

    logger.info(`[EXOTEL-AI] TTS_SUCCESS (${ttsMs}ms): Received ${ttsRes.audioBase64.length} base64 chars`);

    // ── RESAMPLE & CHUNK FOR EXOTEL ──────────────────────────────────────────
    const convStart  = Date.now();
    const rawTtsBuffer = Buffer.from(ttsRes.audioBase64, 'base64');
    const pcm8kResampled = resampleWavTo8kPcm(rawTtsBuffer);
    const convMs     = Date.now() - convStart;

    logger.info(`[EXOTEL-AI] Resampled TTS WAV -> 8000Hz PCM s16le (${pcm8kResampled.length} bytes, ${convMs}ms)`);

    // ── STREAM BACK TO EXOTEL OVER WSS ───────────────────────────────────────
    const ws = session.ws;
    if (ws && ws.readyState === WebSocket.OPEN && pcm8kResampled.length > 0) {
      const totalFrames = Math.ceil(pcm8kResampled.length / CHUNK_FRAME_BYTES);
      logger.info(`[EXOTEL-AI] Streaming ${totalFrames} audio frames to Exotel streamSid=${streamSid}...`);

      for (let offset = 0; offset < pcm8kResampled.length; offset += CHUNK_FRAME_BYTES) {
        if (ws.readyState !== WebSocket.OPEN) {
          logger.warn(`[EXOTEL-AI] Stream ${streamSid} WebSocket closed prematurely during audio streaming.`);
          break;
        }

        const frame = pcm8kResampled.subarray(offset, offset + CHUNK_FRAME_BYTES);
        const payloadBase64 = frame.toString('base64');

        try {
          ws.send(JSON.stringify({
            event: 'media',
            stream_sid: streamSid,
            media: {
              payload: payloadBase64
            }
          }), (err) => {
            if (err) logger.warn(`[EXOTEL-AI] Error sending media frame on streamSid=${streamSid}: ${err.message}`);
          });
        } catch (sendErr) {
          logger.warn(`[EXOTEL-AI] Synchronous send exception on streamSid=${streamSid}: ${sendErr.message}`);
          break;
        }

        // Pacing frame dispatch (~20ms per frame)
        await new Promise(r => setTimeout(r, 18));
      }

      // Send Mark event after complete response audio
      ws.send(JSON.stringify({
        event: 'mark',
        stream_sid: streamSid,
        mark: {
          name: 'ai_response_complete'
        }
      }));

      responseAudioSent = true;
      const totalMs = Date.now() - startTime;
      logger.info(`[EXOTEL-AI] AUDIO_SENT successfully! Pipeline Latency: STT=${sttMs}ms, AI=${aiMs}ms, TTS=${ttsMs}ms, TOTAL=${totalMs}ms`);
    } else {
      logger.warn(`[EXOTEL-AI] Cannot stream audio: WebSocket closed or audio buffer empty.`);
    }

  } catch (pipelineErr) {
    logger.error(`[EXOTEL-AI] Pipeline Exception: ${pipelineErr.message}`);
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlink(tempFile, () => {});
    }
    session.isProcessing = false;
  }
}

// ==============================================================================
// WEBSOCKET SERVER ATTACHMENT & EVENT HANDLER
// ==============================================================================

/**
 * Initialize Exotel Voicebot WebSocket Server on the existing HTTP server.
 * Path: /exotel-voicebot
 */
function initExotelWsServer(httpServer) {
  if (wssInstance) {
    logger.warn('[EXOTEL-WSS] WebSocket server already initialized.');
    return wssInstance;
  }

  wssInstance = new WebSocket.Server({
    noServer: true,
    path: '/exotel-voicebot'
  });

  // Catch unhandled WSS server-level errors to prevent process crash
  wssInstance.on('error', (err) => {
    logger.error(`[EXOTEL-WSS] WebSocket Server Error: ${err.message}`);
  });

  // Handle upgrade requests safely on /exotel-voicebot path
  httpServer.on('upgrade', (request, socket, head) => {
    socket.on('error', (err) => {
      logger.warn(`[EXOTEL-WSS] Upgrade Socket Error: ${err.message}`);
    });

    try {
      const host = request.headers.host || 'localhost';
      const pathname = new URL(request.url, `http://${host}`).pathname;

      if (pathname === '/exotel-voicebot') {
        wssInstance.handleUpgrade(request, socket, head, (ws) => {
          wssInstance.emit('connection', ws, request);
        });
      }
    } catch (urlErr) {
      logger.warn(`[EXOTEL-WSS] Upgrade URL Parse Error: ${urlErr.message}`);
    }
  });

  wssInstance.on('connection', (ws, req) => {
    totalConnections++;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logger.info(`[EXOTEL-WSS] Connected from ${clientIp}`);

    let currentStreamSid = null;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString('utf8'));
        const event = data.event;

        switch (event) {
          case 'connected':
            logger.info('[EXOTEL-WSS] Exotel protocol connected event received');
            break;

          case 'start': {
            const startObj   = data.start || {};
            currentStreamSid = data.stream_sid || startObj.stream_sid || `stream_${Date.now()}`;
            const callSid    = startObj.call_sid || 'unknown_call';
            const fromPhone  = startObj.from || 'Unknown';
            const toPhone    = startObj.to || 'Unknown';
            const format     = startObj.media_format || {};

            const session = {
              streamSid:          currentStreamSid,
              callSid,
              farmerPhone:        fromPhone,
              exoPhone:           toPhone,
              mediaFormat:        {
                encoding:   format.encoding || 'audio/x-l16',
                sampleRate: format.sample_rate || 8000,
                channels:   format.channels || 1
              },
              startTime:          Date.now(),
              audioBuffers:       [],
              totalBytes:         0,
              chunkCount:         0,
              silenceChunksCount: 0,
              hasSpoken:          false,
              isProcessing:       false,
              language:           'hi',
              status:             'active',
              ws
            };

            activeSessions.set(currentStreamSid, session);
            logger.info(`[EXOTEL-WSS] Start: streamSid=${currentStreamSid}, callSid=${callSid}, from=${fromPhone}`);
            break;
          }

          case 'media': {
            const streamSid = data.stream_sid || currentStreamSid;
            const session   = activeSessions.get(streamSid);
            const payload   = data.media ? data.media.payload : null;

            if (payload && session && !session.isProcessing) {
              const pcmChunk = Buffer.from(payload, 'base64');
              const energy   = calculateAudioEnergy(pcmChunk);

              if (energy > SILENCE_ENERGY_THRESHOLD) {
                // Active speech chunk
                session.hasSpoken = true;
                session.silenceChunksCount = 0;
                session.audioBuffers.push(pcmChunk);
                session.totalBytes += pcmChunk.length;
                session.chunkCount++;
              } else if (session.hasSpoken) {
                // Post-speech silence chunk
                session.audioBuffers.push(pcmChunk);
                session.totalBytes += pcmChunk.length;
                session.chunkCount++;
                session.silenceChunksCount++;

                // If silence duration reached threshold AND buffer >= MIN_SPEECH_BYTES -> trigger AI pipeline!
                if (
                  session.silenceChunksCount >= SILENCE_CHUNKS_THRESHOLD &&
                  session.totalBytes >= MIN_SPEECH_BYTES
                ) {
                  logger.info(`[EXOTEL-WSS] End-of-Speech detected (silence=${session.silenceChunksCount} chunks, audio=${session.totalBytes} bytes). Triggering AI Pipeline...`);
                  session.hasSpoken = false;
                  processSpeechSegment(session);
                }
              }

              // Max speech buffer safety fallback
              if (session.totalBytes >= MAX_SPEECH_BYTES) {
                logger.info(`[EXOTEL-WSS] Max speech buffer reached (${session.totalBytes} bytes). Triggering AI Pipeline...`);
                session.hasSpoken = false;
                processSpeechSegment(session);
              }
            }
            break;
          }

          case 'dtmf': {
            const digit = data.dtmf ? data.dtmf.digit : data.digit;
            logger.info(`[EXOTEL-WSS] DTMF received: digit=${digit}, streamSid=${currentStreamSid}`);
            break;
          }

          case 'mark': {
            const markName = data.mark ? data.mark.name : 'unnamed';
            logger.info(`[EXOTEL-WSS] Mark reached: name=${markName}, streamSid=${currentStreamSid}`);
            break;
          }

          case 'clear': {
            logger.info(`[EXOTEL-WSS] Clear event received: streamSid=${currentStreamSid}`);
            break;
          }

          case 'stop': {
            const streamSid = data.stream_sid || currentStreamSid;
            const session   = activeSessions.get(streamSid);
            if (session) {
              session.status  = 'completed';
              session.endTime = Date.now();
              const durationMs = session.endTime - session.startTime;
              logger.info(`[EXOTEL-WSS] Stop: streamSid=${streamSid}, duration=${(durationMs / 1000).toFixed(2)}s, totalAudioBytes=${session.totalBytes}`);
            } else {
              logger.info(`[EXOTEL-WSS] Stop: streamSid=${streamSid}`);
            }
            break;
          }

          default:
            logger.debug(`[EXOTEL-WSS] Received event "${event}": ${message.toString().substring(0, 100)}`);
            break;
        }

      } catch (err) {
        logger.warn(`[EXOTEL-WSS] Invalid message frame: ${err.message}`);
      }
    });

    ws.on('error', (err) => {
      logger.warn(`[EXOTEL-WSS] Socket error on stream ${currentStreamSid}: ${err.message}`);
    });

    ws.on('close', (code, reason) => {
      logger.info(`[EXOTEL-WSS] Session closed: streamSid=${currentStreamSid || 'unknown'}, code=${code}`);
      if (currentStreamSid && activeSessions.has(currentStreamSid)) {
        const session = activeSessions.get(currentStreamSid);
        session.status = 'closed';
        setTimeout(() => activeSessions.delete(currentStreamSid), 5 * 60 * 1000);
      }
    });
  });

  logger.info('[EXOTEL-WSS] WebSocket server attached to HTTP server at path /exotel-voicebot');
  return wssInstance;
}

/**
 * Get WSS server health & active session diagnostics.
 */
function getWsStatus() {
  const activeCount = Array.from(activeSessions.values()).filter(s => s.status === 'active').length;
  return {
    path:             '/exotel-voicebot',
    attached:         !!wssInstance,
    activeSessions:   activeCount,
    totalSessions:    activeSessions.size,
    totalConnections,
    audioFormat:      'Linear PCM / s16le / 8000 Hz / Mono / Base64',
    aiPipelineReady:  true
  };
}

/**
 * Get summary list of active sessions (safe for debug endpoint).
 */
function getActiveSessions() {
  const list = [];
  activeSessions.forEach((s, key) => {
    list.push({
      streamSid:   key,
      callSid:     s.callSid,
      farmerPhone: s.farmerPhone ? `${s.farmerPhone.substring(0, 4)}***` : 'Unknown',
      status:      s.status,
      chunkCount:  s.chunkCount,
      totalBytes:  s.totalBytes,
      isProcessing: s.isProcessing,
      durationSec: ((Date.now() - s.startTime) / 1000).toFixed(1)
    });
  });
  return list;
}

module.exports = {
  initExotelWsServer,
  getWsStatus,
  getActiveSessions,
  processSpeechSegment,
  createWavBuffer,
  resampleWavTo8kPcm
};
