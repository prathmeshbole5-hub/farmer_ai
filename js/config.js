/* ==========================================================================
   KrishiMitra AI — Central Configuration
   All environment-specific settings in one place.
   Exposes CONFIG to both Node.js and the Browser.
   ========================================================================== */

'use strict';

const CONFIG = {
  GEMINI_API_KEY: typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : "PROXY_KEY",
  OLLAMA_BASE_URL: (typeof process !== 'undefined' ? process.env.OLLAMA_BASE_URL : null) || 'http://localhost:11434',
  WEATHER_API_KEY: typeof process !== 'undefined' ? process.env.WEATHER_API_KEY : '',
  NEWS_API_KEY: typeof process !== 'undefined' ? process.env.NEWS_API_KEY : ''
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
  
  // Extend/Define window.KrishiMitraConfig for backward compatibility
  window.KrishiMitraConfig = window.KrishiMitraConfig || {
    API_BASE_URL: 'http://localhost:5000/api',
    OLLAMA_MODEL: 'gemma3',
    CONVERSATION_HISTORY_LIMIT: 5,
    CHAT_TIMEOUT_MS: 120000,
    THINKING_MESSAGE: 'KrishiMitra AI is thinking...',
    ERROR_BACKEND_OFFLINE: 'Backend server is not running. Start it with: npm start',
    ERROR_OLLAMA_OFFLINE: 'Offline AI is unavailable. Please start Ollama.',
    ERROR_GENERIC: 'Something went wrong. Please try again.',
    GEMMA_ENABLED: true,
    SPEAK_REPLIES: true
  };
  
  window.KrishiMitraConfig.OLLAMA_BASE_URL = CONFIG.OLLAMA_BASE_URL;
  window.KrishiMitraConfig.GEMINI_API_KEY = CONFIG.GEMINI_API_KEY;

  // Browser-only fetch interceptor to proxy Gemini calls securely
  const originalFetch = window.fetch;
  window.fetch = async function (url, options) {
    const urlStr = typeof url === 'string' ? url : (url instanceof URL ? url.toString() : '');
    
    if (urlStr.includes('generativelanguage.googleapis.com')) {
      let model = 'gemini-2.5-flash';
      try {
        const urlObj = new URL(urlStr);
        const pathParts = urlObj.pathname.split('/');
        const modelIndex = pathParts.indexOf('models');
        if (modelIndex !== -1 && pathParts[modelIndex + 1]) {
          model = pathParts[modelIndex + 1].split(':')[0]; // Get model name
        }
      } catch (e) {
        console.warn('[Proxy Interceptor] Failed to parse model from URL:', e);
      }

      const apiBaseUrl = window.KrishiMitraConfig.API_BASE_URL || 'http://localhost:5000/api';
      const proxyUrl = `${apiBaseUrl}/gemini/generateContent`;
      
      let originalBody = {};
      if (options && options.body) {
        try {
          originalBody = JSON.parse(options.body);
        } catch (e) {
          console.error('[Proxy Interceptor] Failed to parse request body:', e);
        }
      }
      
      const proxyOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          contents: originalBody.contents || [],
          tools: originalBody.tools || undefined
        })
      };
      
      console.log(`[Proxy Interceptor] Intercepted Gemini API call. Proxying via backend: ${proxyUrl}`);
      return originalFetch(proxyUrl, proxyOptions);
    }
    
    return originalFetch(url, options);
  };
}
