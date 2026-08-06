/* ==========================================================================
   KrishiMitra AI — Central Configuration
   All environment-specific settings in one place.
   Import this file before any other KrishiMitra JS module.
   ========================================================================== */

'use strict';

window.KrishiMitraConfig = {
  // ── Backend ───────────────────────────────────────────────────────────────
  API_BASE_URL: 'http://localhost:5000/api',

  // ── Ollama ────────────────────────────────────────────────────────────────
  OLLAMA_MODEL:    'gemma3',
  OLLAMA_BASE_URL: 'http://localhost:11434',

  // ── Chat ──────────────────────────────────────────────────────────────────
  // Maximum messages kept in conversation history sent to Gemma
  CONVERSATION_HISTORY_LIMIT: 5,

  // How long (ms) before we give up waiting for Gemma
  CHAT_TIMEOUT_MS: 120000,

  // ── UI ────────────────────────────────────────────────────────────────────
  THINKING_MESSAGE:     'KrishiMitra AI is thinking...',
  ERROR_BACKEND_OFFLINE:'Backend server is not running. Start it with: npm start',
  ERROR_OLLAMA_OFFLINE: 'Offline AI is unavailable. Please start Ollama.',
  ERROR_GENERIC:        'Something went wrong. Please try again.',

  // ── Feature flags ─────────────────────────────────────────────────────────
  // Set to false to fall back to the original hardcoded responses
  GEMMA_ENABLED: true,

  // Whether to speak the AI reply aloud via TTS
  SPEAK_REPLIES: true
};
