/* ==========================================================================
   KrishiMitra AI — Sarvam Voice Call Controller (Frontend Module)
   Connects to /api/sarvam-voice backend endpoints.
   ========================================================================== */

'use strict';

(function () {
  let mediaRecorder = null;
  let audioChunks   = [];
  let isRecording   = false;
  let currentAudio  = null;

  const $ = id => document.getElementById(id);

  function setCallState(state, text) {
    const indicator = $('call-status-indicator');
    const label     = $('call-status-label');
    const btnCall   = $('btn-phone-call');

    if (!indicator || !label || !btnCall) return;

    indicator.className = 'call-status-indicator ' + state;
    label.textContent = text;

    if (state === 'listening') {
      btnCall.className = 'btn-phone-call active-call';
      btnCall.textContent = '🛑';
      btnCall.setAttribute('aria-label', 'Stop Call');
    } else {
      btnCall.className = 'btn-phone-call';
      btnCall.textContent = '📞';
      btnCall.setAttribute('aria-label', 'Start Voice Call');
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.start(200);

      isRecording = true;
      setCallState('listening', '🔴 Call Connected — Speaking in native language...');
    } catch (err) {
      setCallState('error', '❌ Microphone Error: ' + err.message);
    }
  }

  function stopRecording() {
    return new Promise(resolve => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        isRecording = false;
        return resolve(null);
      }
      mediaRecorder.onstop = () => {
        try { mediaRecorder.stream.getTracks().forEach(t => t.stop()); } catch (_) {}
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        audioChunks = [];
        isRecording = false;
        resolve(blob);
      };
      mediaRecorder.stop();
    });
  }

  function stopAudioPlayback() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
  }

  function playBase64Audio(base64Data, mimeType) {
    return new Promise((resolve, reject) => {
      stopAudioPlayback();
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

  async function processAudioCall(blob) {
    if (!blob || blob.size === 0) {
      setCallState('error', '❌ Silent or empty recording');
      return;
    }

    setCallState('processing', '⏳ Processing Voice via Sarvam Saaras v3...');

    const transcriptEl = $('call-transcript-display');
    const responseEl   = $('call-response-display');
    const langTag      = $('call-lang-badge');

    if (transcriptEl) transcriptEl.textContent = 'Transcribing your spoken query...';
    if (responseEl)   responseEl.textContent   = 'Generating KrishiMitra AI answer...';

    const formData = new FormData();
    formData.append('audio', blob, 'call_recording.webm');

    try {
      const response = await fetch('/api/sarvam-voice', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!data.success) {
        const errMsg = data.userError || data.error || 'Voice processing failed.';
        setCallState('error', '❌ ' + errMsg);
        if (data.transcript && transcriptEl) transcriptEl.textContent = data.transcript;
        if (data.reply && responseEl)         responseEl.textContent   = data.reply;
        return;
      }

      // Success
      if (langTag)      langTag.textContent = (data.language || 'Detected').toUpperCase();
      if (transcriptEl) transcriptEl.textContent = data.transcript || 'Transcribed successfully';
      if (responseEl)   responseEl.textContent   = data.reply || 'AI Response generated';

      if (data.audioBase64) {
        setCallState('speaking', '🔊 KrishiMitra Speaking (Sarvam Bulbul v3)...');
        await playBase64Audio(data.audioBase64, data.mimeType || 'audio/wav');
        setCallState('ready', '🟢 Ready — Tap phone icon to call again');
      } else {
        setCallState('ready', '🟢 Ready');
      }

    } catch (err) {
      setCallState('error', '❌ Connection error. Please try again.');
    }
  }

  async function handleCallButton() {
    if (currentAudio) {
      stopAudioPlayback();
      setCallState('ready', '🟢 Ready — Tap phone icon to start call');
      return;
    }

    if (!isRecording) {
      await startRecording();
    } else {
      setCallState('processing', '⏳ Processing call...');
      const blob = await stopRecording();
      await processAudioCall(blob);
    }
  }

  window.askSarvamCallPreset = async function (questionText) {
    if (isRecording) return;
    stopAudioPlayback();

    const transcriptEl = $('call-transcript-display');
    const responseEl   = $('call-response-display');
    const langTag      = $('call-lang-badge');

    if (transcriptEl) transcriptEl.textContent = questionText;
    if (responseEl)   responseEl.textContent   = 'Thinking...';
    if (langTag)      langTag.textContent      = 'HI';

    setCallState('processing', '⏳ Asking KrishiMitra Online Voice AI...');

    try {
      const res = await fetch('/api/sarvam-voice/respond', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ transcript: questionText, language: 'hi' })
      });

      const data = await res.json();
      if (!data.success) {
        setCallState('error', '❌ Error: ' + (data.error || 'Failed'));
        return;
      }

      if (responseEl) responseEl.textContent = data.reply;

      // Speak TTS
      const speakRes = await fetch('/api/sarvam-voice/speak', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: data.reply, language: 'hi' })
      });
      const speakData = await speakRes.json();

      if (speakData.success && speakData.audioBase64) {
        setCallState('speaking', '🔊 KrishiMitra Speaking (Sarvam Bulbul v3)...');
        await playBase64Audio(speakData.audioBase64, speakData.mimeType || 'audio/wav');
        setCallState('ready', '🟢 Ready — Tap phone icon to call again');
      } else {
        setCallState('ready', '🟢 Ready');
      }

    } catch (e) {
      setCallState('error', '❌ Network error');
    }
  };

  function initCallModule() {
    const btnCall = $('btn-phone-call');
    if (btnCall) {
      btnCall.addEventListener('click', handleCallButton);
      console.log('[Sarvam Voice Call] Integrated module loaded.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCallModule);
  } else {
    initCallModule();
  }
})();
