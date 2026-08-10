/* ==========================================================================
   KrishiMitra AI — Farmer Phone Call Controller (Frontend Module)
   Connects to /api/farmer-call backend endpoints.

   ISOLATED MODULE: Does not interfere with existing Voice AI or main app state.
   ========================================================================== */

'use strict';

(function () {
  let currentAudio = null;

  const $ = id => document.getElementById(id);

  function setSimulatorStatus(state, text) {
    const statusEl = $('farmer-call-status');
    const labelEl  = $('farmer-call-status-label');
    const btnSend  = $('btn-submit-phone-test');

    if (!statusEl || !labelEl) return;

    statusEl.className = 'farmer-call-status ' + (state === 'ready' ? '' : 'active');
    labelEl.textContent = text;

    if (btnSend) {
      btnSend.disabled = (state === 'processing');
    }
  }

  function stopAudio() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
  }

  function playBase64Audio(base64Data, mimeType) {
    return new Promise((resolve, reject) => {
      stopAudio();
      try {
        const binary = atob(base64Data);
        const bytes  = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const url   = URL.createObjectURL(new Blob([bytes], { type: mimeType || 'audio/wav' }));
        const audio = new Audio(url);
        currentAudio = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          currentAudio = null;
          resolve();
        };

        audio.onerror = () => {
          URL.revokeObjectURL(url);
          currentAudio = null;
          reject(new Error('Audio playback failed'));
        };

        audio.play().catch(reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Load feature info from backend
  async function loadFeatureInfo() {
    try {
      const res  = await fetch('/api/farmer-call/info');
      const data = await res.json();

      const phoneDisplay = $('farmer-phone-display');
      const exotelBadge  = $('exotel-status-badge');

      if (phoneDisplay && data.exotelPhone) {
        phoneDisplay.textContent = data.exotelPhone;
      }
      if (exotelBadge) {
        exotelBadge.textContent = data.exotelReady ? 'Exotel Connected ✅' : 'Exotel Ready (Test Mode)';
      }
    } catch (e) {
      console.log('[Farmer Call] Could not fetch feature info:', e.message);
    }
  }

  // Submit query test
  async function submitPhoneCallTest(textOverride, langOverride) {
    stopAudio();

    const textInput = $('farmer-call-input-text');
    const langSelect = $('farmer-call-lang-select');
    const outputEl   = $('farmer-call-output-text');
    const metaTag    = $('farmer-call-output-meta');

    const question = textOverride || (textInput ? textInput.value.trim() : '');
    const language = langOverride || (langSelect ? langSelect.value : 'hi');

    if (!question) {
      if (outputEl) outputEl.textContent = 'Please enter a farming question to test.';
      return;
    }

    if (textInput && !textOverride) textInput.value = '';
    if (outputEl) outputEl.textContent = 'Thinking... Processing query via KrishiMitra AI';
    if (metaTag)  metaTag.textContent  = `LANG: ${language.toUpperCase()}`;

    setSimulatorStatus('processing', '⏳ Processing Call AI & Synthesizing Speech...');

    try {
      const res = await fetch('/api/farmer-call/test', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: question, language })
      });

      const data = await res.json();

      if (!data.success) {
        setSimulatorStatus('ready', '🟢 Ready');
        if (outputEl) outputEl.textContent = '❌ Error: ' + (data.error || 'Request failed');
        return;
      }

      // Success
      if (outputEl) outputEl.textContent = data.response;
      if (metaTag)  metaTag.textContent  = `LANG: ${data.language.toUpperCase()} • ${(data.totalMs / 1000).toFixed(2)}s`;

      if (data.audioBase64) {
        setSimulatorStatus('speaking', '🔊 Playing Spoken AI Response (Sarvam Bulbul v3)...');
        await playBase64Audio(data.audioBase64, data.mimeType || 'audio/wav');
        setSimulatorStatus('ready', '🟢 Ready — Test another call query');
      } else {
        setSimulatorStatus('ready', '🟢 Ready');
      }

    } catch (err) {
      setSimulatorStatus('ready', '🟢 Ready');
      if (outputEl) outputEl.textContent = '❌ Network Error: Could not connect to backend.';
    }
  }

  // Preset chip handler
  window.testFarmerCallPreset = function (text, lang) {
    submitPhoneCallTest(text, lang || 'hi');
  };

  function initFarmerCallModule() {
    const btnSubmit = $('btn-submit-phone-test');
    const inputEl   = $('farmer-call-input-text');

    if (btnSubmit) {
      btnSubmit.addEventListener('click', () => submitPhoneCallTest());
    }

    if (inputEl) {
      inputEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitPhoneCallTest();
        }
      });
    }

    loadFeatureInfo();
    console.log('[Farmer Phone Call] Controller loaded cleanly.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFarmerCallModule);
  } else {
    initFarmerCallModule();
  }
})();
