/* ==========================================================================
   KrishiMitra AI — Sarvam Voice Call Service (Phase 1)
   Isolated Voice Call Module for Basic Phone Assistance

   Responsibilities:
   1. Transcribe farmer audio → Sarvam Saaras v3 STT → transcript + language
   2. Generate concise phone-friendly AI response → Ollama/Gemma 3
   3. Synthesize speech audio → Sarvam Bulbul v3 TTS → base64 audio stream
   4. Complete end-to-end pipeline for phone call backend

   SECURITY: SARVAM_API_KEY remains strictly server-side.
   ========================================================================== */

'use strict';

const fs       = require('fs');
const FormData = require('form-data');
const fetch    = require('node-fetch');

// ── Constants ─────────────────────────────────────────────────────────────────
const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text';
const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech';

const STT_TIMEOUT_MS = 30_000;   // 30 s timeout for STT
const TTS_TIMEOUT_MS = 30_000;   // 30 s timeout for TTS
const AI_TIMEOUT_MS  = 60_000;   // 60 s timeout for AI

// ── Sarvam TTS Language Code Mapping (Bulbul v3) ──────────────────────────────
const LANG_MAP_TTS = {
  hi: 'hi-IN',
  gu: 'gu-IN',
  mr: 'mr-IN',
  pa: 'pa-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  bn: 'bn-IN',
  en: 'en-IN'
};

// ── System Prompt for Phone Voice Assistant ────────────────────────────────────
const PHONE_ASSISTANT_PROMPT = `You are KrishiMitra, an agricultural AI voice call assistant for Indian farmers speaking over a mobile phone.

RULES FOR PHONE CONVERSATION:
1. Keep your reply VERY CONCISE and SIMPLE (maximum 2 to 4 short sentences).
2. Spoken tone: Avoid markdown formatting, asterisks, bullet points, or lists.
3. LANGUAGE MATCHING:
   - Reply in the EXACT same language used by the farmer (Hindi, Gujarati, Marathi, Punjabi, Tamil, English, or Hinglish).
   - If the transcript is in Hindi, respond strictly in simple spoken Hindi.
   - If in Gujarati, respond in simple spoken Gujarati.
   - If in Marathi, respond in simple spoken Marathi.
4. AGRICULTURAL SAFETY & RESPONSIBILITY:
   - Do NOT blindly prescribe dangerous chemical pesticides or dosages.
   - If you need crucial information to diagnose (e.g. crop age, symptom duration), ask ONE brief follow-up question.
   - If uncertain or for severe crop diseases, state: "सही निदान के लिए नजदीकी कृषि विशेषज्ञ से सलाह लें।"
   - Never invent agricultural facts.`;

// ── Helper: Timeout fetch wrapper ─────────────────────────────────────────────
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ==============================================================================
// 1. SPEECH TO TEXT — Sarvam Saaras v3
// ==============================================================================
/**
 * Transcribe farmer audio file using Sarvam Saaras v3 STT.
 *
 * @param {string} audioFilePath - Absolute path to uploaded audio file
 * @returns {Promise<{
 *   success: boolean,
 *   transcript?: string,
 *   language?: string,
 *   languageCode?: string,
 *   error?: string,
 *   errorCode?: string
 * }>}
 */
async function transcribeAudio(audioFilePath) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return {
      success:   false,
      error:     'Sarvam API key is missing. Please configure SARVAM_API_KEY in backend .env file.',
      errorCode: 'MISSING_API_KEY'
    };
  }

  if (!audioFilePath || !fs.existsSync(audioFilePath)) {
    return {
      success:   false,
      error:     'Audio file not found on server.',
      errorCode: 'MISSING_AUDIO_FILE'
    };
  }

  const stats = fs.statSync(audioFilePath);
  if (stats.size === 0) {
    return {
      success:   false,
      error:     'Audio file is empty.',
      errorCode: 'EMPTY_AUDIO_FILE'
    };
  }

  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(audioFilePath));
    form.append('model', 'saaras:v3');
    form.append('mode', 'transcribe');

    const response = await fetchWithTimeout(
      SARVAM_STT_URL,
      {
        method:  'POST',
        headers: {
          'api-subscription-key': apiKey,
          ...form.getHeaders()
        },
        body: form
      },
      STT_TIMEOUT_MS
    );

    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch (_) {}
      return {
        success:   false,
        error:     `Sarvam Saaras STT returned HTTP ${response.status}: ${errBody}`,
        errorCode: `STT_HTTP_${response.status}`
      };
    }

    const data = await response.json();
    const transcript = (data.transcript || '').trim();

    if (!transcript) {
      return {
        success:   false,
        error:     'Speech could not be understood. Please speak clearly into the microphone.',
        errorCode: 'EMPTY_TRANSCRIPT'
      };
    }

    const rawLang   = data.language_code || 'en';
    const shortLang = rawLang.split('-')[0].toLowerCase();

    return {
      success:      true,
      transcript,
      language:     shortLang,
      languageCode: rawLang
    };

  } catch (err) {
    if (err.name === 'AbortError') {
      return {
        success:   false,
        error:     `Sarvam STT timed out after ${STT_TIMEOUT_MS / 1000}s.`,
        errorCode: 'STT_TIMEOUT'
      };
    }
    return {
      success:   false,
      error:     `Sarvam STT error: ${err.message}`,
      errorCode: 'STT_ERROR'
    };
  }
}

// ==============================================================================
// 2. AI RESPONSE GENERATION — Concise Spoken Reply
// ==============================================================================
/**
 * Generate agricultural response formatted for phone conversation.
 *
 * @param {string} transcript - Farmer question transcript
 * @param {string} language   - Short language code (hi, gu, mr, en, etc.)
 * @returns {Promise<{
 *   success: boolean,
 *   reply?: string,
 *   error?: string,
 *   errorCode?: string
 * }>}
 */
async function generateAIResponse(transcript, language = 'en') {
  if (!transcript || !transcript.trim()) {
    return {
      success:   false,
      error:     'Transcript is empty.',
      errorCode: 'EMPTY_TRANSCRIPT'
    };
  }

  const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const OLLAMA_MODEL    = process.env.OLLAMA_MODEL    || 'gemma3';

  const prompt = `${PHONE_ASSISTANT_PROMPT}

Farmer question (${language}): "${transcript.trim()}"

KrishiMitra spoken response:`;

  try {
    const response = await fetchWithTimeout(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          model:   OLLAMA_MODEL,
          prompt,
          stream:  false,
          options: { temperature: 0.6, top_p: 0.9 }
        })
      },
      AI_TIMEOUT_MS
    );

    if (!response.ok) {
      let errMsg = `HTTP ${response.status}`;
      try { errMsg = (await response.json()).error || errMsg; } catch (_) {}
      return {
        success:   false,
        error:     `AI provider returned error: ${errMsg}`,
        errorCode: `AI_HTTP_${response.status}`
      };
    }

    const data  = await response.json();
    const reply = (data.response || '').trim();

    if (!reply) {
      return {
        success:   false,
        error:     'AI returned empty response.',
        errorCode: 'AI_EMPTY_RESPONSE'
      };
    }

    return {
      success: true,
      reply
    };

  } catch (err) {
    if (err.name === 'AbortError') {
      return {
        success:   false,
        error:     'AI generation timed out.',
        errorCode: 'AI_TIMEOUT'
      };
    }
    if (
      err.code === 'ECONNREFUSED' ||
      err.cause?.code === 'ECONNREFUSED' ||
      err.message?.includes('ECONNREFUSED')
    ) {
      return {
        success:   false,
        error:     'Ollama AI service is offline. Please start Ollama server.',
        errorCode: 'AI_OFFLINE'
      };
    }
    return {
      success:   false,
      error:     `AI error: ${err.message}`,
      errorCode: 'AI_ERROR'
    };
  }
}

// ==============================================================================
// 3. TEXT TO SPEECH — Sarvam Bulbul v3
// ==============================================================================
/**
 * Convert text response to audio via Sarvam Bulbul v3.
 *
 * @param {string} text     - Response text to convert
 * @param {string} language - Language code (hi, gu, mr, en, etc.)
 * @returns {Promise<{
 *   success: boolean,
 *   audioBase64?: string,
 *   mimeType?: string,
 *   error?: string,
 *   errorCode?: string
 * }>}
 */
async function synthesizeSpeech(text, language = 'en') {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return {
      success:   false,
      error:     'Sarvam API key is missing.',
      errorCode: 'MISSING_API_KEY'
    };
  }

  if (!text || !text.trim()) {
    return {
      success:   false,
      error:     'Text for speech synthesis is empty.',
      errorCode: 'EMPTY_TEXT'
    };
  }

  const cleanText   = text.trim().substring(0, 1000);
  const ttsLangCode = LANG_MAP_TTS[language] || 'hi-IN';

  try {
    const response = await fetchWithTimeout(
      SARVAM_TTS_URL,
      {
        method:  'POST',
        headers: {
          'Content-Type':         'application/json',
          'api-subscription-key': apiKey
        },
        body: JSON.stringify({
          inputs:               [cleanText],
          target_language_code: ttsLangCode,
          model:                'bulbul:v3',
          enable_preprocessing: true
        })
      },
      TTS_TIMEOUT_MS
    );

    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch (_) {}
      return {
        success:   false,
        error:     `Sarvam Bulbul TTS returned HTTP ${response.status}: ${errBody}`,
        errorCode: `TTS_HTTP_${response.status}`
      };
    }

    const data        = await response.json();
    const audioBase64 = Array.isArray(data.audios) && data.audios[0] ? data.audios[0] : null;

    if (!audioBase64) {
      return {
        success:   false,
        error:     'Sarvam TTS returned no audio.',
        errorCode: 'TTS_EMPTY_AUDIO'
      };
    }

    return {
      success: true,
      audioBase64,
      mimeType: 'audio/wav'
    };

  } catch (err) {
    if (err.name === 'AbortError') {
      return {
        success:   false,
        error:     'Sarvam TTS timed out.',
        errorCode: 'TTS_TIMEOUT'
      };
    }
    return {
      success:   false,
      error:     `Sarvam TTS error: ${err.message}`,
      errorCode: 'TTS_ERROR'
    };
  }
}

// ==============================================================================
// 4. FULL PIPELINE — Audio -> STT -> AI -> TTS -> Audio
// ==============================================================================
/**
 * Process a complete farmer voice call request.
 *
 * @param {string} audioFilePath - Path to recorded audio file
 * @returns {Promise<{
 *   success: boolean,
 *   transcript?: string,
 *   language?: string,
 *   reply?: string,
 *   audioBase64?: string,
 *   mimeType?: string,
 *   error?: string,
 *   errorCode?: string,
 *   stage?: string
 * }>}
 */
async function processVoiceCall(audioFilePath) {
  // Stage 1: STT
  const stt = await transcribeAudio(audioFilePath);
  if (!stt.success) {
    return { ...stt, stage: 'stt' };
  }

  // Stage 2: AI Response
  const ai = await generateAIResponse(stt.transcript, stt.language);
  if (!ai.success) {
    return {
      ...ai,
      stage:      'ai',
      transcript: stt.transcript,
      language:   stt.language
    };
  }

  // Stage 3: TTS Synthesis
  const tts = await synthesizeSpeech(ai.reply, stt.language);
  if (!tts.success) {
    return {
      ...tts,
      stage:      'tts',
      transcript: stt.transcript,
      language:   stt.language,
      reply:      ai.reply
    };
  }

  return {
    success:     true,
    transcript:  stt.transcript,
    language:    stt.language,
    reply:       ai.reply,
    audioBase64: tts.audioBase64,
    mimeType:    tts.mimeType
  };
}

module.exports = {
  transcribeAudio,
  generateAIResponse,
  synthesizeSpeech,
  processVoiceCall
};
