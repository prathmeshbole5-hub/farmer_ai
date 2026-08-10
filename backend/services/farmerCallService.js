/* ==========================================================================
   KrishiMitra AI — Farmer Call Business Logic Service (Farmer Phone Call)
   Isolated Service for Farmer Phone Call AI Processing

   Responsibilities:
   - Formats farmer queries into concise spoken AI agricultural advice.
   - Leverages Ollama (Gemma 3) / Gemini fallback.
   - Connects to speechService for Sarvam STT and Bulbul v3 TTS.
   - Provides safe dev test execution.
   ========================================================================== */

'use strict';

const speechService = require('./speechService');
const fetch         = require('node-fetch');

const OLLAMA_TIMEOUT_MS = 60_000;

// System Prompt tailored for Farmer Phone Call Assistant
const FARMER_PHONE_SYSTEM_PROMPT = `You are KrishiMitra, a helpful AI agricultural assistant for Indian farmers answering phone calls on mobile phones.

PHONE CALL RULES:
1. Answer clearly, simply, and concisely (maximum 2 to 4 short spoken sentences).
2. Avoid markdown formatting, asterisks (*), lists, or bullet points.
3. LANGUAGE RULE:
   - Answer in the EXACT language used by the farmer (Hindi, Gujarati, Marathi, Punjabi, Tamil, English).
   - If farmer question is in Hindi, reply in simple spoken Hindi.
   - If farmer question is in Gujarati, reply in simple spoken Gujarati.
   - If farmer question is in Marathi, reply in simple spoken Marathi.
4. AGRICULTURAL ACCURACY & SAFETY:
   - Do NOT prescribe dangerous chemical pesticides or dosages blindly.
   - If farmer lacks detail (e.g. crop age, symptom duration), ask ONE short follow-up question.
   - If uncertain or severe disease, say: "सही समाधान के लिए नजदीकी कृषि केंद्र या विशेषज्ञ से संपर्क करें।"
   - Never invent agricultural facts.`;

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
 * Generate phone-friendly AI response for a farmer query.
 *
 * @param {string} questionText - Farmer question text
 * @param {string} [language='hi'] - Language code (hi, gu, mr, pa, ta, en)
 * @returns {Promise<{ success: boolean, reply?: string, language?: string, error?: string }>}
 */
async function generateAIResponse(questionText, language = 'hi') {
  if (!questionText || !questionText.trim()) {
    return { success: false, error: 'Question text cannot be empty.' };
  }

  const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const OLLAMA_MODEL    = process.env.OLLAMA_MODEL    || 'gemma3';

  const prompt = `${FARMER_PHONE_SYSTEM_PROMPT}

Farmer Question (${language}): "${questionText.trim()}"

KrishiMitra Spoken Reply:`;

  try {
    const res = await fetchWithTimeout(
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
      OLLAMA_TIMEOUT_MS
    );

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try { errMsg = (await res.json()).error || errMsg; } catch (_) {}
      return { success: false, error: `AI provider error: ${errMsg}` };
    }

    const data  = await res.json();
    const reply = (data.response || '').trim();

    if (!reply) {
      return { success: false, error: 'AI returned an empty response.' };
    }

    return {
      success: true,
      reply,
      language
    };

  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'AI request timed out.' };
    }
    if (
      err.code === 'ECONNREFUSED' ||
      err.cause?.code === 'ECONNREFUSED' ||
      err.message?.includes('ECONNREFUSED')
    ) {
      return { success: false, error: 'Ollama AI is offline. Please ensure Ollama is running.' };
    }
    return { success: false, error: 'AI error: ' + err.message };
  }
}

/**
 * Full Pipeline for Dev Test / Phone Call Execution:
 * Receives text OR audio, transcribes if audio, generates AI response, and synthesizes TTS.
 *
 * @param {Object} params
 * @param {string} [params.text] - Question text (if text test mode)
 * @param {string} [params.audioFilePath] - Audio file path (if audio test mode)
 * @param {string} [params.language='hi'] - Target language
 * @returns {Promise<Object>} Processed result with userText, response, audioBase64
 */
async function processFarmerCall({ text, audioFilePath, language = 'hi' }) {
  const start = Date.now();
  let userText  = text ? text.trim() : null;
  let userLang  = language;

  // 1. If audio file provided, transcribe via STT
  if (audioFilePath) {
    const sttResult = await speechService.transcribeAudio(audioFilePath);
    if (!sttResult.success) {
      return {
        success: false,
        stage: 'stt',
        error: sttResult.error
      };
    }
    userText = sttResult.transcript;
    userLang = sttResult.language || language;
  }

  if (!userText) {
    return {
      success: false,
      error: 'Neither text nor audio input was provided.'
    };
  }

  // 2. Generate AI Response
  const aiResult = await generateAIResponse(userText, userLang);
  if (!aiResult.success) {
    return {
      success: false,
      stage: 'ai',
      userText,
      language: userLang,
      error: aiResult.error
    };
  }

  const responseText = aiResult.reply;

  // 3. Synthesize Speech via Sarvam Bulbul v3
  const ttsResult = await speechService.synthesizeSpeech(responseText, userLang);

  const totalMs = Date.now() - start;

  return {
    success:     true,
    userText,
    language:    userLang,
    response:    responseText,
    audioBase64: ttsResult.audioBase64 || null,
    mimeType:    ttsResult.mimeType || 'audio/wav',
    ttsError:    ttsResult.error || null,
    totalMs
  };
}

module.exports = {
  generateAIResponse,
  processFarmerCall
};
