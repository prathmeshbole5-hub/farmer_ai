/* ==========================================================================
   newsAI.js — Local AI Assistant (Ollama & Voice) for Krishi Feed
   ========================================================================== */

'use strict';

window.KrishiNewsAI = (function () {
  const cfg = window.KrishiMitraConfig || {
    API_BASE_URL: 'http://localhost:5000/api',
    OLLAMA_MODEL: 'gemma3',
    OLLAMA_BASE_URL: 'http://localhost:11434',
    CHAT_TIMEOUT_MS: 120000,
    ERROR_OLLAMA_OFFLINE: 'Offline AI is unavailable. Please start Ollama.'
  };

  /**
   * Ask the local AI (Ollama via Backend Chat Route) a question about an article.
   * Leverages RAG on the backend and falls back to direct Ollama if backend fails.
   */
  async function askAboutArticle(article, question, language = 'en', history = []) {
    // Build context block from article
    const articleContext = `
[CONTEXT ARTICLE]
Headline: ${article.headline}
Category: ${article.category}
Summary: ${article.summary}
Key Takeaway: ${article.takeaway}
Source: ${article.source}
Published Date: ${article.date}
Importance: ${article.importance}
`;

    const payload = {
      message: question,
      language: language,
      history: history.slice(-6), // last 3 turns
      context: articleContext
    };

    try {
      // 1. Try backend POST /api/chat which performs RAG + calls Ollama
      const res = await fetch(`${cfg.API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          return {
            success: true,
            reply: data.reply,
            source: 'Ollama (via Backend)'
          };
        }
      }
    } catch (e) {
      console.warn('[NewsAI] Backend chat failed, falling back to direct Ollama call...', e);
    }

    // 2. Direct Local Ollama fallback if backend is down or errors out
    try {
      const directReply = await askOllamaDirect(articleContext, question, language, history);
      return {
        success: true,
        reply: directReply,
        source: 'Ollama (Direct Local)'
      };
    } catch (err) {
      console.error('[NewsAI] Direct Ollama call also failed:', err);
      return {
        success: false,
        error: cfg.ERROR_OLLAMA_OFFLINE || 'Offline AI is unavailable. Please start Ollama.'
      };
    }
  }

  /**
   * Directly call the local Ollama API at localhost:11434/api/generate.
   */
  async function askOllamaDirect(articleContext, question, language, history) {
    const systemPrompt = `You are KrishiMitra AI, an agricultural expert. A farmer is asking a question about a news article.
Use the article context and your agricultural knowledge to answer in very simple, farmer-friendly terms. Keep your answer brief and structured.`;

    const langInstructions = {
      en: 'Reply in simple English.',
      hi: 'Reply in Hindi (हिंदी में उत्तर दें).',
      gu: 'Reply in Gujarati (ગુજરાતીમાં જવાબ આપો).',
      mr: 'Reply in Marathi (मराठीत उत्तर द्या).',
      pa: 'Reply in Punjabi (ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦਿਓ).'
    };
    const langInstruction = langInstructions[language] || langInstructions.en;

    const parts = [
      systemPrompt,
      langInstruction,
      articleContext,
      '\nCONVERSATION HISTORY:'
    ];

    history.forEach(turn => {
      parts.push(turn.role === 'user' ? `Farmer: ${turn.content}` : `KrishiMitra: ${turn.content}`);
    });

    parts.push(`\nFarmer: ${question}\nKrishiMitra:`);
    const prompt = parts.join('\n');

    const ollamaUrl = cfg.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = cfg.OLLAMA_MODEL || 'gemma3';

    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        options: { temperature: 0.7 }
      })
    });

    if (!res.ok) {
      throw new Error(`Ollama Direct returned status ${res.status}`);
    }

    const data = await res.json();
    if (data && data.response && data.response.trim()) {
      return data.response.trim();
    }
    throw new Error('Ollama returned empty response.');
  }

  /**
   * Start Speech Recognition (STT) for capturing the farmer's voice question.
   */
  function startSpeechRecognition(langCode, callbacks = {}) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (callbacks.onUnsupported) {
        callbacks.onUnsupported();
      }
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = getVoiceLangCode(langCode);

    recognition.onstart = () => {
      if (callbacks.onStart) callbacks.onStart();
    };

    recognition.onresult = (e) => {
      if (e.results && e.results[0] && e.results[0][0]) {
        const transcript = e.results[0][0].transcript;
        if (callbacks.onResult) callbacks.onResult(transcript);
      }
    };

    recognition.onerror = (err) => {
      console.warn('[NewsAI] Speech recognition error:', err);
      if (callbacks.onError) callbacks.onError(err);
    };

    recognition.onend = () => {
      if (callbacks.onEnd) callbacks.onEnd();
    };

    recognition.start();
    return recognition;
  }

  /**
   * Map UI language codes to standard voice recognition locales.
   */
  function getVoiceLangCode(lang) {
    const map = {
      en: 'en-IN',
      hi: 'hi-IN',
      gu: 'gu-IN',
      mr: 'mr-IN',
      pa: 'pa-IN'
    };
    return map[lang] || 'en-IN';
  }

  /**
   * Speak a text response aloud using text-to-speech (TTS).
   */
  function speakResponse(text, langCode) {
    if (!('speechSynthesis' in window)) return;

    // Cancel current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slower, comfortable speed
    utterance.lang = getVoiceLangCode(langCode);

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Stop any reading speech.
   */
  function stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  return {
    askAboutArticle,
    startSpeechRecognition,
    speakResponse,
    stopSpeaking
  };
})();
