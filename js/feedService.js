/* ==========================================================================
   feedService.js — Online News Fetcher via Gemini (via Backend Proxy)
   ========================================================================== */

'use strict';

window.KrishiFeedService = (function () {
  // ── All Gemini calls go through the backend proxy so the real API key
  //    never touches the browser.
  const API_BASE = (window.KrishiMitraConfig && window.KrishiMitraConfig.API_BASE_URL)
    || 'http://localhost:5000/api';

  const GEMINI_PROXY_URL = `${API_BASE}/gemini/generateContent`;
  const GEMINI_MODEL     = 'gemini-2.5-flash';

  // ── Helper: fetch with a hard timeout (ms). Rejects with Error on timeout.
  function fetchWithTimeout(url, options, timeoutMs = 15000) {
    console.log(`[FeedService] fetch → ${url} (timeout: ${timeoutMs}ms)`);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fetch(url, options)
        .then(res  => { clearTimeout(timer); resolve(res);  })
        .catch(err => { clearTimeout(timer); reject(err);   });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // checkOnline — ping the backend health endpoint
  // ─────────────────────────────────────────────────────────────
  async function checkOnline() {
    if (!navigator.onLine) {
      console.log('[FeedService] checkOnline: navigator.onLine = false');
      return false;
    }
    try {
      const res = await fetchWithTimeout(`${API_BASE}/health`, { method: 'GET' }, 5000);
      console.log(`[FeedService] checkOnline: backend status = ${res.status}`);
      return res.ok;
    } catch (e) {
      console.warn('[FeedService] checkOnline: backend unreachable —', e.message);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // fetchNewsOnline — call Gemini via backend proxy
  // Always resolves (never hangs). Returns an array (may be empty).
  // ─────────────────────────────────────────────────────────────
  async function fetchNewsOnline(profile, language = 'en', searchQuery = '') {
    const langNames = {
      en: 'English', hi: 'Hindi', gu: 'Gujarati', mr: 'Marathi', pa: 'Punjabi'
    };
    const targetLang = langNames[language] || 'English';

    const queryPrompt = searchQuery
      ? `Focus specifically on news related to: "${searchQuery}".`
      : `Prioritize news about "${profile.crop}" in "${profile.state}".`;

    const prompt = `Search the web for the latest Indian agriculture news, farming trends, mandi prices, and government policies.
Farmer profile: State=${profile.state||'UP'}, Crop=${profile.crop||'Wheat'}, Language=${targetLang}.
${queryPrompt}

Return a raw JSON array of 10-15 objects. NO markdown, NO code blocks. Each object must have:
id, title, headline, summary, category, importance, source, readMoreURL, sourceUrl, publishedDate, date, image, crop, state, keywords, isVideo.
Category must be one of: Weather, Government Schemes, Machinery, Disease, Organic, Research, Market, Videos.
Importance: "🔴 Urgent" | "🟠 Important" | "🟢 Useful".`;

    console.log('[FeedService] fetchNewsOnline → sending to proxy...');
    console.log('  Proxy URL :', GEMINI_PROXY_URL);
    console.log('  Model     :', GEMINI_MODEL);
    console.log('  Query     :', searchQuery || '(personalised)');

    let response;
    try {
      response = await fetchWithTimeout(
        GEMINI_PROXY_URL,
        {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify({
            model   : GEMINI_MODEL,
            contents: [{ parts: [{ text: prompt }] }],
            tools   : [{ googleSearch: {} }]
          })
        },
        15000   // 15-second timeout
      );
    } catch (networkErr) {
      console.error('[FeedService] Network / timeout error:', networkErr.message);
      throw networkErr;   // propagate so searchNews() falls back to cache
    }

    console.log(`[FeedService] Proxy responded: HTTP ${response.status}`);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[FeedService] Proxy error ${response.status}:`, body);
      throw new Error(`Gemini proxy HTTP ${response.status}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonErr) {
      console.error('[FeedService] Failed to parse proxy JSON response:', jsonErr);
      throw new Error('Invalid JSON from proxy');
    }

    // Proxy wraps the Gemini reply — support both shapes:
    //   { candidates: [...] }               ← raw Gemini forwarded
    //   { success: true, reply: "..." }     ← Ollama fallback text
    let rawText = '';

    if (data && data.candidates && data.candidates[0]
        && data.candidates[0].content && data.candidates[0].content.parts) {
      rawText = data.candidates[0].content.parts.map(p => p.text || '').join('');
      console.log('[FeedService] Got Gemini candidate text.');
    } else if (data && data.reply) {
      rawText = data.reply;
      console.log('[FeedService] Got Ollama fallback reply.');
    } else {
      console.error('[FeedService] Unexpected proxy response shape:', JSON.stringify(data).slice(0, 200));
      throw new Error('Unexpected proxy response shape');
    }

    console.log('[FeedService] Raw text (first 300 chars):', rawText.slice(0, 300));
    const articles = parseGeminiNewsResponse(rawText);
    console.log(`[FeedService] Parsed ${articles.length} articles.`);
    return articles;
  }

  // ─────────────────────────────────────────────────────────────
  // parseGeminiNewsResponse — extract a JSON array from any text
  // ─────────────────────────────────────────────────────────────
  function parseGeminiNewsResponse(rawText) {
    console.log('[FeedService] Parsing response...');
    if (!rawText || rawText.trim().length === 0) {
      console.warn('[FeedService] Empty response text — returning []');
      return [];
    }

    let txt = rawText.trim();

    // Strip markdown fences
    txt = txt.replace(/```json/gi, '').replace(/```/g, '').trim();

    // 1. Try direct parse
    try {
      const direct = JSON.parse(txt);
      if (Array.isArray(direct))           { console.log('[FeedService] Direct parse → array'); return direct; }
      if (direct && typeof direct === 'object') { console.log('[FeedService] Direct parse → object'); return [direct]; }
    } catch (_) {}

    // 2. Extract first [...] block
    const arrMatch = txt.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (arrMatch) {
      try {
        const parsed = JSON.parse(arrMatch[0]);
        if (Array.isArray(parsed)) { console.log('[FeedService] Extracted JSON array'); return parsed; }
      } catch (e) { console.warn('[FeedService] Array extract parse failed:', e.message); }
    }

    // 3. Extract first {...} block and wrap
    const objMatch = txt.match(/\{[\s\S]*?\}/);
    if (objMatch) {
      try {
        const parsed = JSON.parse(objMatch[0]);
        if (parsed && typeof parsed === 'object') { console.log('[FeedService] Extracted JSON object'); return [parsed]; }
      } catch (e) { console.warn('[FeedService] Object extract parse failed:', e.message); }
    }

    // 4. Plain-text paragraph fallback
    console.warn('[FeedService] Could not parse JSON — converting plain text to cards');
    const paras = txt.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 10);
    if (paras.length === 0) return [];

    return paras.map((p, i) => {
      const lines = p.split('\n').map(l => l.trim()).filter(Boolean);
      const title   = lines[0] || `Agricultural Update #${i + 1}`;
      const summary = lines.slice(1).join(' ') || p;
      return {
        id          : `news-fallback-${Date.now()}-${i}`,
        title, headline: title, summary,
        category    : 'Organic',
        importance  : '🟢 Useful',
        source      : 'KrishiMitra AI',
        readMoreURL : 'http://localhost:5000/',
        sourceUrl   : 'http://localhost:5000/',
        publishedDate: new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }),
        date        : new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }),
        image       : 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80',
        crop:'General', state:'National', keywords:'farming, news', isVideo: false
      };
    });
  }

  // ─────────────────────────────────────────────────────────────
  // generateDailyTip — single-sentence advisory via proxy
  // ─────────────────────────────────────────────────────────────
  async function generateDailyTip(profile, weatherData, language = 'en') {
    const langNames = {
      en: 'English', hi: 'Hindi', gu: 'Gujarati', mr: 'Marathi', pa: 'Punjabi'
    };
    const targetLang = langNames[language] || 'English';
    const temp      = weatherData ? weatherData.temp     : 'N/A';
    const rainProb  = weatherData ? weatherData.rainProb : 'N/A';
    const humidity  = weatherData ? weatherData.humidity : 'N/A';

    const prompt = `You are KrishiMitra AI. Give a single-sentence daily farming tip in ${targetLang} for:
Crop: ${profile.crop||'Paddy'}, State: ${profile.state||'UP'}.
Weather: Temp=${temp}°C, Rain=${rainProb}%, Humidity=${humidity}%.
If rain>50% warn against pesticide spray. If hot&dry advise irrigation. Max 25 words. Plain text only.`;

    try {
      const res = await fetchWithTimeout(
        GEMINI_PROXY_URL,
        {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify({ model: GEMINI_MODEL, contents: [{ parts: [{ text: prompt }] }] })
        },
        10000
      );
      if (!res.ok) throw new Error(`Proxy ${res.status}`);
      const data = await res.json();
      if (data && data.candidates && data.candidates[0]
          && data.candidates[0].content && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text.trim();
      }
      if (data && data.reply) return data.reply.trim();
      return null;
    } catch (e) {
      console.warn('[FeedService] generateDailyTip failed:', e.message);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // getFallbackDailyTip — local offline tip
  // ─────────────────────────────────────────────────────────────
  function getFallbackDailyTip(crop, weatherData, language) {
    const isHighRain = weatherData && weatherData.rainProb > 50;
    const tips = {
      en: isHighRain
        ? `Monsoon alert: Postpone pesticide spray on your ${crop} crops — rain will wash it away.`
        : `Today is good for weed management and applying organic compost to your ${crop} crop.`,
      hi: isHighRain
        ? `मानसून चेतावनी: आज ${crop} फसल पर कीटनाशक न छिड़कें, बारिश धो देगी।`
        : `आज ${crop} फसल में निराई और जैविक खाद के लिए अच्छा दिन है।`,
      gu: isHighRain
        ? `ચેતવણી: આજે ${crop} પર ​​જંતુનાશક ન છાંટો.`
        : `આજે ${crop} પાકમાં નીંદણ અને ખાતર માટે સારો દિવસ.`,
      mr: isHighRain
        ? `सावधान: आज ${crop} वर कीटकनाशक फवारू नका.`
        : `आज ${crop} पिकात खुरपणी व खत टाकण्यासाठी चांगला दिवस.`,
      pa: isHighRain
        ? `ਚੇਤਾਵਨੀ: ਅੱਜ ${crop} ਤੇ ਕੀਟਨਾਸ਼ਕ ਨਾ ਛਿੜਕੋ।`
        : `ਅੱਜ ${crop} ਵਿੱਚ ਗੋਡੀ ਅਤੇ ਖਾਦ ਪਾਉਣ ਲਈ ਚੰਗਾ ਦਿਨ।`
    };
    return tips[language] || tips.en;
  }

  return { checkOnline, fetchNewsOnline, generateDailyTip, getFallbackDailyTip };
})();
