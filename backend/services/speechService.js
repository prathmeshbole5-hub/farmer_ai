/* ==========================================================================
   KrishiMitra AI — Speech Service Abstraction (Farmer Phone Call Feature)
   Isolated Speech Provider Abstraction (Sarvam AI / Extendable)

   Responsibilities:
   - Speech-To-Text (STT) via Sarvam Saaras v3
   - Text-To-Speech (TTS) via Sarvam Bulbul v3
   - Clean provider abstraction so speech engines can be swapped or extended.

   NEVER exposes SARVAM_API_KEY to frontend or logs.
   ========================================================================== */

'use strict';

const fs       = require('fs');
const FormData = require('form-data');
const fetch    = require('node-fetch');

// ── Constants ─────────────────────────────────────────────────────────────────
const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text';
const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech';

const STT_TIMEOUT_MS = 30_000;
const TTS_TIMEOUT_MS = 30_000;

// Sarvam Bulbul v3 language code mapping
const TTS_LANG_MAP = {
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

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Transcribe farmer audio file using Sarvam Saaras v3 STT.
 *
 * @param {string} audioFilePath - Absolute path to audio file
 * @returns {Promise<{ success: boolean, transcript?: string, language?: string, error?: string }>}
 */
async function transcribeAudio(audioFilePath) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error:   'SARVAM_API_KEY is not configured in backend .env.'
    };
  }

  if (!audioFilePath || !fs.existsSync(audioFilePath)) {
    return {
      success: false,
      error:   'Audio file not found.'
    };
  }

  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(audioFilePath));
    form.append('model', 'saaras:v3');
    form.append('mode', 'transcribe');

    const res = await fetchWithTimeout(
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

    if (!res.ok) {
      let errBody = '';
      try { errBody = await res.text(); } catch (_) {}
      return {
        success: false,
        error:   `Sarvam STT returned HTTP ${res.status}: ${errBody}`
      };
    }

    const data       = await res.json();
    const transcript = (data.transcript || '').trim();

    if (!transcript) {
      return {
        success: false,
        error:   'Empty transcript returned by speech engine.'
      };
    }

    const rawLang   = data.language_code || 'en';
    const shortLang = rawLang.split('-')[0].toLowerCase();

    return {
      success: true,
      transcript,
      language: shortLang,
      languageCode: rawLang
    };

  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'Sarvam STT timed out.' };
    }
    return { success: false, error: 'Speech-to-text error: ' + err.message };
  }
}

/**
 * Synthesize speech audio from text via Sarvam Bulbul v3 TTS.
 *
 * @param {string} text - Response text to speak
 * @param {string} language - Target language code (hi, gu, mr, pa, ta, en)
 * @returns {Promise<{ success: boolean, audioBase64?: string, mimeType?: string, error?: string }>}
 */
async function synthesizeSpeech(text, language = 'hi') {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error:   'SARVAM_API_KEY is not configured in backend .env.'
    };
  }

  if (!text || !text.trim()) {
    return {
      success: false,
      error:   'No text provided for speech synthesis.'
    };
  }

  const cleanText   = text.trim().substring(0, 1000);
  const targetLang  = TTS_LANG_MAP[language] || 'hi-IN';

  try {
    const res = await fetchWithTimeout(
      SARVAM_TTS_URL,
      {
        method:  'POST',
        headers: {
          'Content-Type':         'application/json',
          'api-subscription-key': apiKey
        },
        body: JSON.stringify({
          inputs:               [cleanText],
          target_language_code: targetLang,
          model:                'bulbul:v3',
          enable_preprocessing: true
        })
      },
      TTS_TIMEOUT_MS
    );

    if (!res.ok) {
      let errBody = '';
      try { errBody = await res.text(); } catch (_) {}
      return {
        success: false,
        error:   `Sarvam TTS returned HTTP ${res.status}: ${errBody}`
      };
    }

    const data        = await res.json();
    const audioBase64 = Array.isArray(data.audios) && data.audios[0] ? data.audios[0] : null;

    if (!audioBase64) {
      return {
        success: false,
        error:   'No audio data returned by Sarvam TTS.'
      };
    }

    return {
      success:  true,
      audioBase64,
      mimeType: 'audio/wav'
    };

  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'Sarvam TTS timed out.' };
    }
    return { success: false, error: 'Text-to-speech error: ' + err.message };
  }
}

module.exports = {
  transcribeAudio,
  synthesizeSpeech
};
