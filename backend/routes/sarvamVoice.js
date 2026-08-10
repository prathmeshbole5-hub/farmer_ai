/* ==========================================================================
   KrishiMitra AI — Sarvam Voice Call Routes (Phase 1)
   Mounted at: /api/sarvam-voice

   ISOLATED MODULE: Does not touch or replace /api/vision or existing routes.

   Endpoints:
     POST /api/sarvam-voice/transcribe -> Speech-to-Text via Sarvam Saaras v3
     POST /api/sarvam-voice/respond    -> Spoken AI Response
     POST /api/sarvam-voice/speak      -> Text-to-Speech via Sarvam Bulbul v3
     POST /api/sarvam-voice            -> Complete Voice Call Pipeline
   ========================================================================== */

'use strict';

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();

const { logger }   = require('../middleware/logger');
const sarvamVoice  = require('../services/sarvamVoiceService');

// ── Multer Configuration: Uploads directory for Voice Call audio ──────────────
const CALL_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'sarvam_voice');
if (!fs.existsSync(CALL_UPLOAD_DIR)) {
  fs.mkdirSync(CALL_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CALL_UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `call_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB max
});

// ── Helper: Clean up temporary file ──────────────────────────────────────────
function cleanupFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) logger.warn(`[SARVAM VOICE] Could not delete temp file: ${filePath}`);
    });
  }
}

// ── Helper: Verify Sarvam API Key configuration ──────────────────────────────
function checkApiKey(res) {
  if (!process.env.SARVAM_API_KEY) {
    res.status(503).json({
      success:   false,
      error:     'Sarvam API key is missing. Please configure SARVAM_API_KEY in backend .env file.',
      errorCode: 'MISSING_API_KEY'
    });
    return false;
  }
  return true;
}

// ==============================================================================
// POST /api/sarvam-voice (Full Pipeline)
// ==============================================================================
router.post('/', upload.single('audio'), async (req, res) => {
  const start = Date.now();
  if (!checkApiKey(res)) return;

  if (!req.file) {
    return res.status(400).json({
      success:   false,
      error:     'No audio file uploaded.',
      errorCode: 'MISSING_AUDIO'
    });
  }

  const filePath = req.file.path;
  logger.info(`[SARVAM VOICE] Processing voice call pipeline: ${req.file.filename}`);

  try {
    const result = await sarvamVoice.processVoiceCall(filePath);
    const totalMs = Date.now() - start;

    if (!result.success) {
      logger.warn(`[SARVAM VOICE] Pipeline failed at stage "${result.stage}": ${result.error}`);
      return res.status(502).json({
        success:    false,
        error:      result.error,
        errorCode:  result.errorCode,
        stage:      result.stage,
        transcript: result.transcript,
        language:   result.language,
        reply:      result.reply,
        totalMs
      });
    }

    logger.info(`[SARVAM VOICE] Pipeline completed successfully in ${totalMs}ms`);
    return res.json({
      success:     true,
      transcript:  result.transcript,
      language:    result.language,
      reply:       result.reply,
      audioBase64: result.audioBase64,
      mimeType:    result.mimeType,
      totalMs
    });

  } catch (err) {
    logger.error(`[SARVAM VOICE] Pipeline exception: ${err.message}`);
    return res.status(500).json({
      success:   false,
      error:     'Internal server error processing voice call.',
      errorCode: 'INTERNAL_ERROR'
    });
  } finally {
    cleanupFile(filePath);
  }
});

// ==============================================================================
// POST /api/sarvam-voice/transcribe (STT Only)
// ==============================================================================
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  if (!checkApiKey(res)) return;

  if (!req.file) {
    return res.status(400).json({
      success:   false,
      error:     'No audio file uploaded.',
      errorCode: 'MISSING_AUDIO'
    });
  }

  const filePath = req.file.path;
  try {
    const result = await sarvamVoice.transcribeAudio(filePath);
    if (!result.success) {
      return res.status(502).json(result);
    }
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanupFile(filePath);
  }
});

// ==============================================================================
// POST /api/sarvam-voice/respond (AI Response Only)
// ==============================================================================
router.post('/respond', async (req, res) => {
  const { transcript, language = 'en' } = req.body || {};

  if (!transcript || !transcript.trim()) {
    return res.status(400).json({
      success:   false,
      error:     'Transcript is required.',
      errorCode: 'MISSING_TRANSCRIPT'
    });
  }

  try {
    const result = await sarvamVoice.generateAIResponse(transcript.trim(), language);
    if (!result.success) {
      return res.status(502).json(result);
    }
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// POST /api/sarvam-voice/speak (TTS Only)
// ==============================================================================
router.post('/speak', async (req, res) => {
  if (!checkApiKey(res)) return;

  const { text, language = 'en' } = req.body || {};

  if (!text || !text.trim()) {
    return res.status(400).json({
      success:   false,
      error:     'Text is required for speech synthesis.',
      errorCode: 'MISSING_TEXT'
    });
  }

  try {
    const result = await sarvamVoice.synthesizeSpeech(text.trim(), language);
    if (!result.success) {
      return res.status(502).json(result);
    }
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
