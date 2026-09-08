/* ==========================================================================
   KrishiMitra AI — Frontend API Layer
   All backend communication goes through this file.
   Backend: http://localhost:5000
   ========================================================================== */

'use strict';

// ── Configuration ─────────────────────────────────────────────────────────────
const API_BASE_URL = 'http://localhost:5000/api';
const REQUEST_TIMEOUT_MS = 20000; // 20 seconds

// ── Error messages (user-facing) ──────────────────────────────────────────────
const ERROR_MESSAGES = {
  BACKEND_OFFLINE:  'Offline AI backend not running. Please start the server.',
  OLLAMA_OFFLINE:   'Please start Ollama. Run: ollama serve in your terminal.',
  TIMEOUT:          'Request timed out. The AI is taking too long to respond.',
  NETWORK_ERROR:    'Network error. Please check your connection.',
  UNKNOWN:          'Something went wrong. Please try again.'
};

// ── Utility: fetch with timeout ───────────────────────────────────────────────
/**
 * Performs a fetch with a configurable timeout.
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} [timeoutMs]
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Utility: classify error to user-friendly message ─────────────────────────
/**
 * Map a fetch/network error to a clean message for the farmer UI.
 * @param {Error|Object} err
 * @param {Object} [serverData] - parsed server JSON (if available)
 * @returns {string}
 */
function classifyError(err, serverData = null) {
  if (err?.name === 'AbortError')                return ERROR_MESSAGES.TIMEOUT;
  if (err?.code === 'ECONNREFUSED')              return ERROR_MESSAGES.BACKEND_OFFLINE;
  if (err?.message?.includes('Failed to fetch') ||
      err?.message?.includes('NetworkError') ||
      err?.message?.includes('ERR_CONNECTION_REFUSED')) {
    return ERROR_MESSAGES.BACKEND_OFFLINE;
  }
  if (serverData?.errorCode === 'OLLAMA_NOT_RUNNING') return ERROR_MESSAGES.OLLAMA_OFFLINE;
  if (serverData?.errorCode === 'TIMEOUT')             return ERROR_MESSAGES.TIMEOUT;
  if (serverData?.error)                               return serverData.error;
  return ERROR_MESSAGES.UNKNOWN;
}

// ── Health check ──────────────────────────────────────────────────────────────
/**
 * Check if the backend server is reachable.
 * @returns {Promise<{online: boolean, data?: Object, message?: string}>}
 */
async function checkBackendHealth() {
  try {
    const res  = await fetchWithTimeout(`${API_BASE_URL}/health`, {}, 5000);
    const data = await res.json();
    return { online: true, data };
  } catch (err) {
    return { online: false, message: classifyError(err) };
  }
}

// ── Phase 8, Phase 9: sendChat ────────────────────────────────────────────────
/**
 * Send a chat message to KrishiMitra AI.
 *
 * @param {string} message        - farmer's question
 * @param {Object} [options={}]
 * @param {string} [options.language='en']  - response language
 * @param {boolean} [options.useAI=false]   - enable Gemma inference
 * @returns {Promise<{
 *   success: boolean,
 *   reply?: string,
 *   source?: string,
 *   domains?: string[],
 *   error?: string,
 *   userError?: string
 * }>}
 */
async function sendChat(message, options = {}) {
  const { language = 'en', useAI = false } = options;

  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/chat`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message, language, useAI })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return {
        success:   false,
        error:     data.error || `Server error ${res.status}`,
        userError: classifyError(null, data)
      };
    }

    return { success: true, ...data };

  } catch (err) {
    const userError = classifyError(err);
    console.error('[KrishiMitra API] sendChat error:', err);
    return { success: false, error: err.message, userError };
  }
}

// ── scanCrop ──────────────────────────────────────────────────────────────────
/**
 * Upload a crop image for disease scanning.
 *
 * @param {File|Blob} imageFile  - image from input[type=file] or canvas
 * @param {Object} [options={}]
 * @param {string} [options.cropType='']      - hint: 'paddy', 'wheat', etc.
 * @param {string} [options.language='en']
 * @returns {Promise<{
 *   success: boolean,
 *   scanId?: string,
 *   detection?: Object,
 *   error?: string,
 *   userError?: string
 * }>}
 */
async function scanCrop(imageFile, options = {}) {
  const { cropType = '', language = 'en' } = options;

  try {
    const formData = new FormData();
    formData.append('image',    imageFile);
    formData.append('cropType', cropType);
    formData.append('language', language);

    const res  = await fetchWithTimeout(
      `${API_BASE_URL}/vision`,
      { method: 'POST', body: formData }
    );

    const data = await res.json();

    if (!res.ok) {
      return {
        success:   false,
        error:     data.error || `Server error ${res.status}`,
        userError: classifyError(null, data)
      };
    }

    return { success: true, ...data };

  } catch (err) {
    const userError = classifyError(err);
    console.error('[KrishiMitra API] scanCrop error:', err);
    return { success: false, error: err.message, userError };
  }
}

// ── getWeather ────────────────────────────────────────────────────────────────
/**
 * Get weather advisory for a location.
 *
 * @param {string} [location='Kishanpur, UP']
 * @param {Object} [options={}]
 * @param {string} [options.language='en']
 * @param {boolean} [options.useAI=false]
 * @returns {Promise<{success: boolean, weather?: Object, error?: string, userError?: string}>}
 */
async function getWeather(location = 'Kishanpur, UP', options = {}) {
  const { language = 'en', useAI = false } = options;

  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/weather`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ location, language, useAI })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return {
        success:   false,
        error:     data.error || `Server error ${res.status}`,
        userError: classifyError(null, data)
      };
    }

    return { success: true, ...data };

  } catch (err) {
    const userError = classifyError(err);
    console.error('[KrishiMitra API] getWeather error:', err);
    return { success: false, error: err.message, userError };
  }
}

// ── getSchemes ────────────────────────────────────────────────────────────────
/**
 * Get government scheme listings.
 *
 * @param {Object} [filters={}]
 * @param {string} [filters.query='']         - search query
 * @param {string} [filters.state='']         - state filter
 * @param {string} [filters.language='en']
 * @param {boolean} [filters.useAI=false]     - enable AI summary
 * @returns {Promise<{success: boolean, schemes?: Array, summary?: string, error?: string, userError?: string}>}
 */
async function getSchemes(filters = {}) {
  const {
    query    = '',
    state    = '',
    language = 'en',
    useAI    = false
  } = filters;

  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/schemes`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query, state, language, useAI })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return {
        success:   false,
        error:     data.error || `Server error ${res.status}`,
        userError: classifyError(null, data)
      };
    }

    return { success: true, ...data };

  } catch (err) {
    const userError = classifyError(err);
    console.error('[KrishiMitra API] getSchemes error:', err);
    return { success: false, error: err.message, userError };
  }
}

// ── gradeQuality ─────────────────────────────────────────────────────────────
/**
 * Upload a produce photo for AI Quality Grading (Fresh vs. Rotten).
 *
 * @param {File|Blob} imageFile - Image file from file input or camera capture
 * @param {Object} [options={}] - Optional metadata or language options
 * @returns {Promise<{
 *   success: boolean,
 *   quality?: 'Fresh' | 'Rotten',
 *   class_id?: number,
 *   confidence?: number,
 *   probabilities?: { Fresh: number, Rotten: number },
 *   error?: string,
 *   userError?: string
 * }>}
 */
async function gradeQuality(imageFile, options = {}) {
  try {
    if (!imageFile) {
      return {
        success: false,
        error: 'No image file provided for quality grading.',
        userError: 'Please select or capture a produce photo.'
      };
    }

    const formData = new FormData();
    formData.append('image', imageFile);

    const res = await fetchWithTimeout(
      `${API_BASE_URL}/quality`,
      {
        method: 'POST',
        // Do not set Content-Type header; browser automatically sets multipart/form-data with boundary
        body: formData
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return {
        success:   false,
        error:     data.error || `Server error ${res.status}`,
        userError: classifyError(null, data)
      };
    }

    return { success: true, ...data };

  } catch (err) {
    const userError = classifyError(err);
    console.error('[KrishiMitra API] gradeQuality error:', err);
    return { success: false, error: err.message, userError };
  }
}

// ── Display helper ────────────────────────────────────────────────────────────
/**
 * Show an error to the user in a non-crashing way.
 * Looks for common KrishiMitra UI containers.
 *
 * @param {string} message
 * @param {string} [containerId] - optional DOM element ID to inject into
 */
function showApiError(message, containerId = null) {
  console.error('[KrishiMitra AI]', message);

  const el = containerId
    ? document.getElementById(containerId)
    : document.getElementById('chat-error-banner')
      || document.getElementById('error-banner')
      || document.getElementById('status-message');

  if (el) {
    el.textContent = message;
    el.style.display = 'block';
  } else {
    // Absolute last resort — non-blocking console only, never alert()
    console.warn('[KrishiMitra AI] No error container found. Message:', message);
  }
}

// ── Exports (ES Module style for future bundler compat + plain <script> compat)
if (typeof module !== 'undefined' && module.exports) {
  // Node / CommonJS (for testing)
  module.exports = {
    checkBackendHealth,
    sendChat,
    scanCrop,
    gradeQuality,
    getWeather,
    getSchemes,
    showApiError,
    API_BASE_URL,
    ERROR_MESSAGES
  };
} else {
  // Browser global
  window.KrishiMitraAPI = {
    checkBackendHealth,
    sendChat,
    scanCrop,
    gradeQuality,
    getWeather,
    getSchemes,
    showApiError,
    API_BASE_URL,
    ERROR_MESSAGES
  };
}

