/* ==========================================================================
   KrishiMitra AI — Farmer Call Routes (Farmer Phone Call Feature)
   Mounted at: /api/farmer-call

   ISOLATED MODULE: Does not touch or modify /api/voice or any existing routes.

   Endpoints:
     GET  /api/farmer-call/info            -> Safe diagnostic status & info
     POST /api/farmer-call/test            -> Dev test simulator (Text/Audio -> AI -> TTS)
     ALL  /api/farmer-call/exotel/passthru -> Exotel incoming call webhook
     POST /api/farmer-call/exotel/status   -> Exotel call status callback
   ========================================================================== */

'use strict';

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();

const { logger }         = require('../middleware/logger');
const exotelCallService      = require('../services/exotelCallService');
const farmerCallService      = require('../services/farmerCallService');
const exotelVoicebotWsService = require('../services/exotelVoicebotWsService');

// Multer storage for uploaded audio during test mode
const CALL_UPLOADS = path.join(__dirname, '..', 'uploads', 'farmer_calls');
if (!fs.existsSync(CALL_UPLOADS)) {
  fs.mkdirSync(CALL_UPLOADS, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CALL_UPLOADS),
  filename:    (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `farmer_call_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB max
});

function cleanupFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlink(filePath, err => {
      if (err) logger.warn(`[FARMER CALL] Could not delete temp file: ${filePath}`);
    });
  }
}

// ==============================================================================
// 1. GET /api/farmer-call/info — Diagnostic Information
// ==============================================================================
router.get('/info', (_req, res) => {
  const exotelInfo = exotelCallService.getExotelConfig();
  const wsStatus   = exotelVoicebotWsService.getWsStatus();
  res.json({
    feature:      'KrishiMitra Farmer Phone Call',
    status:       'active',
    version:      '1.0.0',
    exotelReady:  exotelInfo.configured,
    exotelPhone:  exotelInfo.exoPhone || 'Not configured in EXOPHONE_NUMBER',
    wsEndpoint:   wsStatus.path,
    wsStatus:     wsStatus.attached ? 'Active ✅' : 'Inactive ❌',
    sarvamReady:  !!process.env.SARVAM_API_KEY,
    languages:    ['hi', 'gu', 'mr', 'pa', 'ta', 'en'],
    testEndpoint: 'POST /api/farmer-call/test'
  });
});

// GET /api/farmer-call/exotel/ws-status — WebSocket Health & Debug Endpoint
router.get('/exotel/ws-status', (_req, res) => {
  const wsStatus = exotelVoicebotWsService.getWsStatus();
  const sessions = exotelVoicebotWsService.getActiveSessions();
  res.json({
    success: true,
    wsStatus,
    activeSessions: sessions,
    timestamp: new Date().toISOString()
  });
});

// ==============================================================================
// 2. POST /api/farmer-call/test — Development Test Simulator Endpoint
// Supports either JSON body { text, language } OR multipart form with audio file
// ==============================================================================
router.post('/test', upload.single('audio'), async (req, res) => {
  const start = Date.now();
  const text  = req.body ? req.body.text : null;
  const lang  = req.body ? (req.body.language || 'hi') : 'hi';
  const file  = req.file ? req.file.path : null;

  logger.info(`[FARMER CALL TEST] Dev test request received — text: "${text ? text.substring(0, 40) : 'N/A'}", file: ${file ? req.file.filename : 'N/A'}, lang: ${lang}`);

  try {
    const result = await farmerCallService.processFarmerCall({
      text,
      audioFilePath: file,
      language: lang
    });

    const totalMs = Date.now() - start;

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error:   result.error,
        stage:   result.stage || 'unknown',
        totalMs
      });
    }

    return res.json({
      success:     true,
      language:    result.language,
      userText:    result.userText,
      response:    result.response,
      audioBase64: result.audioBase64,
      mimeType:    result.mimeType,
      totalMs
    });

  } catch (err) {
    logger.error(`[FARMER CALL TEST] Exception: ${err.message}`);
    return res.status(500).json({
      success: false,
      error:   'Internal server error processing test call request.'
    });
  } finally {
    if (file) cleanupFile(file);
  }
});

// ==============================================================================
// 3. ALL /api/farmer-call/exotel/passthru — Exotel Passthru Webhook
// Exotel Passthru Applet sends incoming call GET/POST params
// ==============================================================================
router.all('/exotel/passthru', async (req, res) => {
  const payload = exotelCallService.parseExotelWebhook(req.method === 'POST' ? req.body : req.query);
  logger.info(`[EXOTEL WEBHOOK] Incoming call from ${payload.farmerPhone} (CallSid: ${payload.callSid})`);

  // Default welcome response if no recording or digits
  let defaultText = 'नमस्ते! कृषि मित्र में आपका स्वागत है। आप अपनी फसल के बारे में सवाल पूछ सकते हैं।';
  let defaultLang = 'hi';

  try {
    // If Exotel passes a recorded audio URL from an IVR recording applet
    if (payload.recordingUrl) {
      logger.info(`[EXOTEL WEBHOOK] Processing recording URL: ${payload.recordingUrl}`);
      // In production, backend downloads recordingUrl and passes to speechService.transcribeAudio
    }

    const aiResult = await farmerCallService.generateAIResponse(defaultText, defaultLang);
    const responseText = aiResult.success ? aiResult.reply : defaultText;

    const passthruXmlOrJson = exotelCallService.formatPassthruResponse(responseText);
    return res.json(passthruXmlOrJson);

  } catch (err) {
    logger.error(`[EXOTEL WEBHOOK] Error processing webhook: ${err.message}`);
    return res.status(200).json(exotelCallService.formatPassthruResponse('कृषि मित्र सेवा अभी उपलब्ध नहीं है। कृपया बाद में प्रयास करें।'));
  }
});

// ==============================================================================
// 4. POST /api/farmer-call/exotel/status — Exotel Call Status Callback
// ==============================================================================
router.post('/exotel/status', (req, res) => {
  const payload = exotelCallService.parseExotelWebhook(req.body);
  logger.info(`[EXOTEL STATUS] CallSid: ${payload.callSid}, Status: ${payload.callStatus}`);
  res.status(200).send('OK');
});

module.exports = router;
