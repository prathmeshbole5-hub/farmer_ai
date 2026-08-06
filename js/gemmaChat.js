/* ==========================================================================
   KrishiMitra AI — Gemma Chat Integration Layer
   
   This file PATCHES the existing handleFarmerVoiceQuestion() from script.js.
   It intercepts every user question and routes it through Ollama + Gemma 3.
   
   LOADING ORDER (index.html):
     1. js/config.js
     2. script.js          ← defines handleFarmerVoiceQuestion, addChatMessage, speakAloud
     3. js/gemmaChat.js    ← this file, patches handleFarmerVoiceQuestion
   
   ZERO changes to script.js. All existing features remain intact.
   ========================================================================== */

(function () {
  'use strict';

  // ── Wait for DOM + script.js to finish loading ────────────────────────────
  window.addEventListener('load', function () {
    const cfg = window.KrishiMitraConfig;

    if (!cfg) {
      console.error('[GemmaChat] KrishiMitraConfig not found. Did you load js/config.js?');
      return;
    }

    if (!cfg.GEMMA_ENABLED) {
      console.log('[GemmaChat] GEMMA_ENABLED=false. Using original hardcoded responses.');
      return;
    }

    // ── Conversation history store ─────────────────────────────────────────
    // Stores last N {role, content} pairs. Sent to backend with each request.
    const conversationHistory = [];

    // ── Logging helper ─────────────────────────────────────────────────────
    function logEntry(level, message, data) {
      const entry = {
        timestamp:   new Date().toISOString(),
        level,
        message,
        ...data
      };
      const colour = level === 'ERROR' ? '\x1b[31m' : level === 'WARN' ? '\x1b[33m' : '\x1b[36m';
      // Browser console
      if (level === 'ERROR') {
        console.error(`[KrishiMitra ${level}]`, message, data || '');
      } else if (level === 'WARN') {
        console.warn(`[KrishiMitra ${level}]`, message, data || '');
      } else {
        console.log(`[KrishiMitra ${level}]`, message, data || '');
      }
    }

    // ── UI helpers ─────────────────────────────────────────────────────────
    /**
     * Show/hide the "thinking" bubble in the chat.
     * @param {boolean} show
     * @returns {HTMLElement|null} the bubble element (when showing)
     */
    function setThinkingBubble(show) {
      const THINKING_ID = 'km-thinking-bubble';
      let existing = document.getElementById(THINKING_ID);

      if (!show) {
        if (existing) existing.remove();
        return null;
      }

      if (existing) return existing;  // already showing

      const box = document.getElementById('chat-messages-box');
      if (!box) return null;

      const bubble = document.createElement('div');
      bubble.id        = THINKING_ID;
      bubble.className = 'chat-bubble bot-message km-thinking';
      bubble.innerHTML = `
        <p style="display:flex;align-items:center;gap:8px;">
          <span class="km-dots">
            <span></span><span></span><span></span>
          </span>
          <span>${cfg.THINKING_MESSAGE}</span>
        </p>
      `;
      box.appendChild(bubble);
      box.scrollTop = box.scrollHeight;
      return bubble;
    }

    /**
     * Show a user-friendly error bubble in the chat.
     * @param {string} message
     */
    function showErrorBubble(message) {
      const box = document.getElementById('chat-messages-box');
      if (!box) return;
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble bot-message km-error-bubble';
      const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      bubble.innerHTML = `
        <p style="color:#c0392b;">
          ⚠️ ${message}
        </p>
        <span class="chat-time">${time}</span>
      `;
      box.appendChild(bubble);
      box.scrollTop = box.scrollHeight;
    }

    /**
     * Disable / re-enable the microphone button during inference.
     * @param {boolean} disabled
     */
    function setMicDisabled(disabled) {
      const micBtn = document.getElementById('btn-microphone');
      if (micBtn) {
        micBtn.disabled = disabled;
        micBtn.style.opacity = disabled ? '0.5' : '1';
        micBtn.style.cursor  = disabled ? 'not-allowed' : 'pointer';
      }
    }

    // ── Add animated CSS for the thinking dots if not already present ──────
    if (!document.getElementById('km-thinking-styles')) {
      const style = document.createElement('style');
      style.id = 'km-thinking-styles';
      style.textContent = `
        .km-dots { display:inline-flex; gap:4px; align-items:center; }
        .km-dots span {
          display:inline-block; width:7px; height:7px;
          border-radius:50%; background:currentColor; opacity:0.4;
          animation: km-bounce 1.2s infinite;
        }
        .km-dots span:nth-child(2) { animation-delay:.2s; }
        .km-dots span:nth-child(3) { animation-delay:.4s; }
        @keyframes km-bounce {
          0%,80%,100% { transform:scale(0.6); opacity:0.4; }
          40%          { transform:scale(1);   opacity:1;   }
        }
      `;
      document.head.appendChild(style);
    }

    // ── Fetch with timeout ─────────────────────────────────────────────────
    async function fetchWithTimeout(url, options, timeoutMs) {
      const controller = new AbortController();
      const timer      = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(url, { ...options, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    }

    // ── Map error codes to UI messages ─────────────────────────────────────
    function errorCodeToMessage(code) {
      switch (code) {
        case 'OLLAMA_NOT_RUNNING':
        case 'MODEL_NOT_FOUND':
          return cfg.ERROR_OLLAMA_OFFLINE;
        case 'TIMEOUT':
          return 'KrishiMitra AI is taking too long. Please try again.';
        default:
          return cfg.ERROR_GENERIC;
      }
    }

    // ── Core: send question to Gemma backend ───────────────────────────────
    /**
     * Send a farmer's question to POST /api/chat, get Gemma's reply.
     *
     * @param {string} questionText
     * @param {string} [language='en']
     * @returns {Promise<string>} reply text
     */
    async function askGemmaViaBackend(questionText, language) {
      language = language || (
        (window.appState && window.appState.currentLanguage) || 'en'
      );

      const payload = {
        message:  questionText,
        language,
        history:  conversationHistory.slice(-cfg.CONVERSATION_HISTORY_LIMIT * 2)
      };

      const startTime = Date.now();

      logEntry('INFO', `Sending to Gemma: "${questionText.substring(0, 60)}"`, {
        language,
        historyLength: payload.history.length
      });

      let res;
      try {
        res = await fetchWithTimeout(
          `${cfg.API_BASE_URL}/chat`,
          {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload)
          },
          cfg.CHAT_TIMEOUT_MS
        );
      } catch (fetchErr) {
        const isTimeout  = fetchErr.name === 'AbortError';
        const isOffline  = fetchErr.message && (
          fetchErr.message.includes('Failed to fetch') ||
          fetchErr.message.includes('NetworkError') ||
          fetchErr.message.includes('ERR_CONNECTION_REFUSED')
        );

        logEntry('ERROR', 'Fetch failed', { error: fetchErr.message });

        if (isTimeout) throw new Error(cfg.ERROR_GENERIC);
        if (isOffline) throw new Error(cfg.ERROR_BACKEND_OFFLINE);
        throw new Error(cfg.ERROR_GENERIC);
      }

      const inferenceMs = Date.now() - startTime;

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(cfg.ERROR_GENERIC);
      }

      if (!res.ok || !data.success) {
        const userMsg = data.userError || errorCodeToMessage(data.errorCode);
        logEntry('WARN', `Backend error: ${data.errorCode}`, {
          error:     data.error,
          inferenceMs
        });
        throw new Error(userMsg);
      }

      logEntry('INFO', `Gemma replied in ${data.inferenceMs || inferenceMs}ms`, {
        model:    data.model,
        domains:  data.domains,
        docCount: data.docCount
      });

      return data.reply;
    }

    // ── Patch handleFarmerVoiceQuestion ────────────────────────────────────
    /**
     * Override the original function from script.js.
     * The original is saved as __originalHandleFarmerVoiceQuestion for fallback.
     */
    if (typeof window.handleFarmerVoiceQuestion === 'function') {
      window.__originalHandleFarmerVoiceQuestion = window.handleFarmerVoiceQuestion;
    }

    window.handleFarmerVoiceQuestion = async function (questionText) {
      if (!questionText || !questionText.trim()) return;

      const cleanQuestion = questionText.trim();

      // 1. Show user's message bubble (same as original)
      if (typeof window.addChatMessage === 'function') {
        window.addChatMessage(cleanQuestion, 'user-message');
      }

      if (typeof window.playSound === 'function') {
        window.playSound('snd-chime');
      }

      // 2. Disable mic + show thinking indicator
      setMicDisabled(true);
      setThinkingBubble(true);

      try {
        // 3. Call Gemma backend
        const reply = await askGemmaViaBackend(cleanQuestion);

        // 4. Remove thinking bubble
        setThinkingBubble(false);

        // 5. Add history BEFORE displaying (so next call has this turn)
        conversationHistory.push({ role: 'user',      content: cleanQuestion });
        conversationHistory.push({ role: 'assistant', content: reply });
        // Keep history bounded
        while (conversationHistory.length > cfg.CONVERSATION_HISTORY_LIMIT * 2) {
          conversationHistory.shift();
        }

        // 6. Show reply bubble
        if (typeof window.addChatMessage === 'function') {
          window.addChatMessage(reply, 'bot-message');
        }

        if (typeof window.playSound === 'function') {
          window.playSound('snd-success');
        }

        // 7. Speak aloud (respects existing speakAloud function)
        if (cfg.SPEAK_REPLIES && typeof window.speakAloud === 'function') {
          window.speakAloud(reply);
        }

      } catch (err) {
        // 8. Remove thinking bubble + show error
        setThinkingBubble(false);

        const userMessage = err.message || cfg.ERROR_GENERIC;
        logEntry('ERROR', 'Chat error', { error: userMessage });

        showErrorBubble(userMessage);
      } finally {
        // 9. Always re-enable mic
        setMicDisabled(false);
      }
    };

    // ── Also expose askGemmaViaBackend for other modules ──────────────────
    window.KrishiMitraGemma = {
      ask:     askGemmaViaBackend,
      history: conversationHistory,
      log:     logEntry
    };

    logEntry('INFO', 'Gemma Chat integration active', {
      apiBase: cfg.API_BASE_URL,
      model:   cfg.OLLAMA_MODEL,
      historyLimit: cfg.CONVERSATION_HISTORY_LIMIT
    });
  });

})();

