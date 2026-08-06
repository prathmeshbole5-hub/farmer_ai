/* ==========================================================================
   KrishiMitra AI — Ollama Service  (Enhanced)
   POST http://localhost:11434/api/generate
   Model: gemma3  |  stream: false
   ========================================================================== */

'use strict';

require('dotenv').config();

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL    || 'gemma3';
const OLLAMA_TIMEOUT  = parseInt(process.env.OLLAMA_TIMEOUT_MS || '60000', 10);

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are KrishiMitra AI.
You are an agricultural assistant.
Only answer agriculture-related questions.
If the question is outside agriculture, politely inform the user that you specialize in farming.
Keep responses simple.
Avoid difficult technical language.
Use numbered steps whenever possible.
Do not invent facts.
If you are unsure, say you don't know.`;

// ── Fetch with timeout ────────────────────────────────────────────────────────
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Build full prompt from history + current question ─────────────────────────
/**
 * Assemble a prompt that includes:
 *   1. System instructions
 *   2. Up to N previous exchanges (conversation history)
 *   3. Optional RAG context
 *   4. The current user question
 *
 * @param {string}   question
 * @param {Array}    history  - array of {role:'user'|'assistant', content:string}
 * @param {string}   [ragContext='']
 * @param {string}   [language='en']
 * @returns {string}
 */
function buildFullPrompt(question, history = [], ragContext = '', language = 'en') {
  const parts = [];

  // 1. System instructions
  parts.push(SYSTEM_PROMPT);

  // 2. Language instruction
  const langInstructions = {
    en: 'Reply in simple English.',
    hi: 'Kripaya Hindi mein jawab dein. (Reply in Hindi)',
    gu: 'Gujarati bhashama jawab apo. (Reply in Gujarati)',
    mr: 'Marathi madhye uttara dya. (Reply in Marathi)',
    pa: 'Punjabi vich jawab deo. (Reply in Punjabi)'
  };
  parts.push(langInstructions[language] || langInstructions.en);

  // 3. RAG context (if provided)
  if (ragContext && ragContext.trim()) {
    parts.push(`\nRELEVANT KNOWLEDGE:\n${ragContext.trim()}`);
  }

  // 4. Conversation history (last N turns)
  if (history && history.length > 0) {
    parts.push('\nCONVERSATION HISTORY:');
    history.forEach(turn => {
      if (turn.role === 'user') {
        parts.push(`Farmer: ${turn.content}`);
      } else {
        parts.push(`KrishiMitra: ${turn.content}`);
      }
    });
  }

  // 5. Current question
  parts.push(`\nFarmer: ${question}\nKrishiMitra:`);

  return parts.join('\n');
}

// ── Health check ──────────────────────────────────────────────────────────────
async function checkOllamaHealth() {
  try {
    const res = await fetchWithTimeout(
      `${OLLAMA_BASE_URL}/api/tags`,
      { method: 'GET' },
      5000
    );
    if (!res.ok) return { available: false, error: `Ollama returned HTTP ${res.status}` };

    const data   = await res.json();
    const models = (data.models || []).map(m => m.name);
    const found  = models.some(m => m === OLLAMA_MODEL || m.startsWith(OLLAMA_MODEL + ':'));

    if (!found) {
      return {
        available: false,
        error: `Model "${OLLAMA_MODEL}" not found. Run: ollama pull ${OLLAMA_MODEL}`,
        installedModels: models
      };
    }
    return { available: true, models };

  } catch (err) {
    if (err.name === 'AbortError')  return { available: false, error: 'Health check timed out.' };
    if (err.code === 'ECONNREFUSED' || err.cause?.code === 'ECONNREFUSED') {
      return { available: false, error: 'Ollama is not running. Start it with: ollama serve' };
    }
    return { available: false, error: err.message };
  }
}

// ── Core inference ────────────────────────────────────────────────────────────
/**
 * Send a prompt to Gemma 3 and return the AI response.
 *
 * @param {string}   prompt              - full assembled prompt
 * @param {Object}   [options={}]
 * @param {string}   [options.model]
 * @param {number}   [options.timeout]
 * @param {Object}   [options.params]    - extra Ollama options
 * @returns {Promise<{
 *   success: boolean,
 *   response?: string,
 *   model?: string,
 *   inferenceMs?: number,
 *   error?: string,
 *   errorCode?: string
 * }>}
 */
async function askGemma(prompt, options = {}) {
  const model     = options.model   || OLLAMA_MODEL;
  const timeoutMs = options.timeout || OLLAMA_TIMEOUT;

  if (!prompt || !prompt.trim()) {
    return { success: false, error: 'Prompt cannot be empty.', errorCode: 'EMPTY_PROMPT' };
  }

  const body = {
    model,
    prompt: prompt.trim(),
    stream: false,
    options: {
      temperature: 0.7,
      top_p:       0.9,
      top_k:       40,
      ...options.params
    }
  };

  const startTime = Date.now();

  try {
    const res = await fetchWithTimeout(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body)
      },
      timeoutMs
    );

    const inferenceMs = Date.now() - startTime;

    if (!res.ok) {
      let errMsg;
      try { errMsg = (await res.json()).error || `HTTP ${res.status}`; }
      catch { errMsg = `HTTP ${res.status}`; }

      if (res.status === 404) {
        return {
          success:   false,
          error:     `Model "${model}" not found in Ollama. Run: ollama pull ${model}`,
          errorCode: 'MODEL_NOT_FOUND'
        };
      }
      return { success: false, error: errMsg, errorCode: `HTTP_${res.status}` };
    }

    const data = await res.json();

    if (!data.response) {
      return { success: false, error: 'Ollama returned an empty response.', errorCode: 'EMPTY_RESPONSE' };
    }

    return {
      success:     true,
      response:    data.response.trim(),
      model:       data.model || model,
      inferenceMs: data.eval_duration
        ? Math.round(data.eval_duration / 1e6)
        : inferenceMs
    };

  } catch (err) {
    const inferenceMs = Date.now() - startTime;

    if (err.name === 'AbortError') {
      return {
        success:     false,
        error:       `Ollama request timed out after ${timeoutMs}ms.`,
        errorCode:   'TIMEOUT',
        inferenceMs
      };
    }
    if (
      err.code === 'ECONNREFUSED' ||
      err.cause?.code === 'ECONNREFUSED' ||
      err.message?.includes('ECONNREFUSED')
    ) {
      return {
        success:   false,
        error:     'Ollama is not running. Please start it with: ollama serve',
        errorCode: 'OLLAMA_NOT_RUNNING',
        inferenceMs
      };
    }
    if (err.code === 'ENOTFOUND' || err.cause?.code === 'ENOTFOUND') {
      return {
        success:   false,
        error:     `Cannot reach Ollama at ${OLLAMA_BASE_URL}. Check OLLAMA_BASE_URL in .env`,
        errorCode: 'UNREACHABLE',
        inferenceMs
      };
    }

    return {
      success:   false,
      error:     `Unexpected error: ${err.message}`,
      errorCode: 'UNKNOWN',
      inferenceMs
    };
  }
}

// ── List installed models ─────────────────────────────────────────────────────
async function listModels() {
  try {
    const res = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/tags`, { method: 'GET' }, 5000);
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { success: true, models: (data.models || []).map(m => m.name) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  askGemma,
  buildFullPrompt,
  checkOllamaHealth,
  listModels,
  SYSTEM_PROMPT,
  OLLAMA_BASE_URL,
  OLLAMA_MODEL
};
