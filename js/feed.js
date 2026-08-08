/* ==========================================================================
   feed.js — UI Controller for Krishi Feed (Inshorts for Farmers)
   ========================================================================== */

'use strict';

window.KrishiFeed = (function () {
  // Inject Feed Translations dynamically
  const feedTranslations = {
    en: {
      nav_feed: "Krishi Feed",
      feed_online: "Online Mode — Using Gemini AI for Live News",
      feed_offline: "Offline Mode — Showing Cached News",
      daily_ai_tip: "Daily AI Advice",
      takeaway_title: "Key Takeaway",
      bookmark_btn: "Bookmark",
      share_btn: "Share",
      read_more_btn: "Read More",
      ask_ai_btn: "Ask AI",
      filter_all: "🌾 All Feed",
      filter_today: "📅 Today",
      filter_this_week: "📅 This Week",
      filter_weather: "🌦 Weather",
      filter_government: "🏛 Govt Schemes",
      filter_machines: "⚙️ Machinery",
      filter_diseases: "🦠 Diseases",
      filter_organic: "🌱 Organic",
      filter_research: "🔬 Research",
      filter_market: "💰 Mandi/Market",
      filter_videos: "📺 Videos",
      filter_bookmarks: "★ Bookmarks",
      no_news_found: "No articles found matching filters or search queries.",
      feed_loading_news: "Loading Krishi Feed articles...",
      copy_to_clipboard: "Copy to Clipboard",
      ask_ai_welcome: "Hello! Ask me any questions about this news. For example: \"How does this affect my crop?\" or \"Explain in Hindi.\""
    },
    hi: {
      nav_feed: "कृषि फीड",
      feed_online: "ऑनलाइन मोड — ताजा खबरों के लिए जेमिनी एआई का उपयोग",
      feed_offline: "ऑफलाइन मोड — केवल सहेजे गए पुराने समाचार",
      daily_ai_tip: "दैनिक एआई परामर्श",
      takeaway_title: "मुख्य सीख",
      bookmark_btn: "सहेजें",
      share_btn: "साझा करें",
      read_more_btn: "और पढ़ें",
      ask_ai_btn: "एआई से पूछें",
      filter_all: "🌾 सभी समाचार",
      filter_today: "📅 आज",
      filter_this_week: "📅 इस सप्ताह",
      filter_weather: "🌦 मौसम",
      filter_government: "🏛 सरकारी योजनाएं",
      filter_machines: "⚙️ कृषि उपकरण",
      filter_diseases: "🦠 रोग एवं कीट",
      filter_organic: "🌱 जैविक खेती",
      filter_research: "🔬 अनुसंधान",
      filter_market: "💰 मंडी भाव",
      filter_videos: "📺 वीडियो",
      filter_bookmarks: "★ बुकमार्क",
      no_news_found: "कोई समाचार नहीं मिला।",
      feed_loading_news: "समाचार लोड हो रहे हैं...",
      copy_to_clipboard: "कॉपी करें",
      ask_ai_welcome: "नमस्ते! मुझसे इस खबर के बारे में कुछ भी पूछें। जैसे: \"इससे मेरी फसल पर क्या असर पड़ेगा?\""
    },
    gu: {
      nav_feed: "કૃષિ ફીડ",
      feed_online: "ઓનલાઇન મોડ — લાઈવ ન્યૂઝ માટે જેમિની એઆઈ",
      feed_offline: "ઓફલાઇન મોડ — જૂની સેવ કરેલી ન્યૂઝ",
      daily_ai_tip: "દૈનિક એઆઈ સલાહ",
      takeaway_title: "મુખ્ય વાત",
      bookmark_btn: "બુકમાર્ક",
      share_btn: "શેર કરો",
      read_more_btn: "વધુ વાંચો",
      ask_ai_btn: "AI ને પૂછો",
      filter_all: "🌾 બધી ફીડ",
      filter_today: "📅 આજે",
      filter_this_week: "📅 આ સપ્તાહ",
      filter_weather: "🌦 હવામાન",
      filter_government: "🏛 સરકારી યોજનાઓ",
      filter_machines: "⚙️ મશીનરી",
      filter_diseases: "🦠 રોગો",
      filter_organic: "🌱 ઓર્ગેનિક",
      filter_research: "🔬 સંશોધન",
      filter_market: "💰 બજાર ભાવો",
      filter_videos: "📺 વીડિયો",
      filter_bookmarks: "★ બુકમાર્ક",
      no_news_found: "કોઈ સમાચાર મળ્યા નથી.",
      feed_loading_news: "સમાચાર લોડ થઈ રહ્યા છે...",
      copy_to_clipboard: "કોપી કરો",
      ask_ai_welcome: "નમસ્તે! મને આ સમાચાર વિશે પ્રશ્નો પૂછો."
    },
    mr: {
      nav_feed: "कृषी फीड",
      feed_online: "ऑनलाइन मोड — ताज्या बातम्यांसाठी जेमिनी एआय",
      feed_offline: "ऑफलाईन मोड — साठवलेल्या जुन्या बातम्या",
      daily_ai_tip: "दैनिक एआय सल्ला",
      takeaway_title: "महत्त्वाचा मुद्दा",
      bookmark_btn: "बुकमार्क",
      share_btn: "शेअर करा",
      read_more_btn: "अधिक वाचा",
      ask_ai_btn: "AI ला विचारा",
      filter_all: "🌾 सर्व फीड",
      filter_today: "📅 आज",
      filter_this_week: "📅 या आठवड्यात",
      filter_weather: "🌦 हवामान",
      filter_government: "🏛 सरकारी योजना",
      filter_machines: "⚙️ यंत्रसामग्री",
      filter_diseases: "🦠 रोग",
      filter_organic: "🌱 सेंद्रिय",
      filter_research: "🔬 संशोधन",
      filter_market: "💰 बाजार भाव",
      filter_videos: "📺 व्हिडिओ",
      filter_bookmarks: "★ बुकमार्क",
      no_news_found: "बातम्या सापडल्या नाहीत.",
      feed_loading_news: "बातम्या लोड होत आहेत...",
      copy_to_clipboard: "कॉपी करा",
      ask_ai_welcome: "नमस्कार! या बातमीबद्दल मला प्रश्न विचारा."
    },
    pa: {
      nav_feed: "ਕ੍ਰਿਸ਼ੀ ਫੀਡ",
      feed_online: "ਔਨਲਾਈਨ ਮੋਡ — ਤਾਜ਼ਾ ਖ਼ਬਰਾਂ ਲਈ ਜੈਮਿਨੀ ਏਆਈ",
      feed_offline: "ਔਫਲਾਈਨ ਮੋਡ — ਸੇਵ ਕੀਤੀਆਂ ਖ਼ਬਰਾਂ",
      daily_ai_tip: "ਰੋਜ਼ਾਨਾ ਏਆਈ ਸਲਾਹ",
      takeaway_title: "ਮੁੱਢਲੀ ਗੱਲ",
      bookmark_btn: "ਬੁੱਕਮਾਰਕ",
      share_btn: "ਸਾਂਝਾ ਕਰੋ",
      read_more_btn: "ਹੋਰ ਪੜ੍ਹੋ",
      ask_ai_btn: "AI ਨੂੰ ਪੁੱਛੋ",
      filter_all: "🌾 ਸਾਰੀ ਫੀਡ",
      filter_today: "📅 ਅੱਜ",
      filter_this_week: "📅 ਇਸ ਹਫ਼ਤੇ",
      filter_weather: "🌦 ਮੌਸਮ",
      filter_government: "🏛 ਸਰਕਾਰੀ ਸਕੀਮਾਂ",
      filter_machines: "⚙️ ਮਸ਼ੀਨਰੀ",
      filter_diseases: "🦠 ਬਿਮਾਰੀਆਂ",
      filter_organic: "🌱 ਜੈਵਿਕ",
      filter_research: "🔬 ਖੋਜ",
      filter_market: "💰 ਮੰਡੀ ਭਾਅ",
      filter_videos: "📺 ਵੀਡੀਓ",
      filter_bookmarks: "★ ਬੁੱਕਮਾਰਕ",
      no_news_found: "ਕਾਂਈ ਖ਼ਬਰ ਨਹੀਂ ਮਿਲੀ।",
      feed_loading_news: "ਖ਼ਬਰਾਂ ਲੋਡ ਕੀਤੀਆਂ ਜਾ ਰਹੀਆਂ ਹਨ...",
      copy_to_clipboard: "ਕਾਪੀ ਕਰੋ",
      ask_ai_welcome: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਇਸ ਖ਼ਬਰ ਬਾਰੇ ਕੋਈ ਵੀ ਸਵਾਲ ਪੁੱਛੋ।"
    }
  };

  // Merge into global translations
  if (window.i18n || (window.parent && window.parent.i18n)) {
    const globalI18n = window.i18n || window.parent.i18n;
    Object.keys(feedTranslations).forEach(lang => {
      if (globalI18n[lang]) {
        Object.assign(globalI18n[lang], feedTranslations[lang]);
      }
    });
  }

  let allArticles = [];
  let filteredArticles = [];
  let displayedArticles = [];
  
  let currentPage = 1;
  const pageSize = 20;
  let isOnline = true;
  let isGeminiUnavailable = false;
  let geminiFailedAt = 0;          // timestamp of last Gemini failure
  const GEMINI_RETRY_COOLDOWN = 60000; // retry Gemini after 60 s
  let lastRefreshTime = 0;
  let currentFilter = 'all';
  let activeSpeechRecognition = null;
  let currentChatHistory = [];

  // DOM Elements setup on tab load/init
  let container, listContainer, searchInput, clearSearchBtn, pillsContainer, dailyTipBox, statusIndicator;
  let searchTimeout;

  /**
   * Initialize Feed View
   */
  async function init() {
    console.log('[Feed] Initializing Feed View...');
    setupDOMElements();
    setupEventListeners();
    setupLazyLoading();
    await updateOnlineStatus();
    await searchNews();
    await loadDailyTip();
  }

  function setupDOMElements() {
    container = document.getElementById('view-feed');
    listContainer = document.getElementById('feed-news-list');
    searchInput = document.getElementById('feed-search-input');
    clearSearchBtn = document.getElementById('btn-feed-search-clear');
    pillsContainer = document.getElementById('feed-pills-row');
    dailyTipBox = document.getElementById('feed-daily-tip-box');
    statusIndicator = document.getElementById('feed-status-bar');
  }

  function setupLazyLoading() {
    const lazyTrigger = document.getElementById('feed-lazy-trigger');
    if (lazyTrigger && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          if (displayedArticles.length < filteredArticles.length) {
            currentPage++;
            renderFeedList();
          }
        }
      }, { rootMargin: '100px' });
      observer.observe(lazyTrigger);
    }
  }

  function setupEventListeners() {
    if (searchInput) {
      // Debounced search on input change
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (clearSearchBtn) {
          clearSearchBtn.classList.toggle('hidden', val === '');
        }
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          searchNews();
        }, 500);
      });

      // Immediate search on Enter key press
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          clearTimeout(searchTimeout);
          searchNews();
        }
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        searchNews();
      });
    }

    // Bind optional search icon button click if it exists
    const searchIconBtn = document.querySelector('.feed-search-bar button:not(#btn-feed-search-clear)');
    if (searchIconBtn) {
      searchIconBtn.addEventListener('click', () => {
        clearTimeout(searchTimeout);
        searchNews();
      });
    }

    // Set up scroll event on main container or window for lazy loading
    window.addEventListener('scroll', handleScroll);
  }

  /**
   * Check connection status and update the UI banner
   */
  async function updateOnlineStatus() {
    if (!isGeminiUnavailable) {
      isOnline = await window.KrishiFeedService.checkOnline();
    }
    
    if (statusIndicator) {
      if (isGeminiUnavailable || !isOnline) {
        statusIndicator.className = 'feed-status-bar offline';
        statusIndicator.style.backgroundColor = '#fce8e6';
        statusIndicator.style.color = '#c5221f';
        statusIndicator.style.border = '1px solid rgba(197, 34, 31, 0.2)';
        
        statusIndicator.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="status-dot" style="background-color: #c5221f;"></span>
            <span style="font-weight:700;">⚠️ Offline Mode. Showing cached agricultural news.</span>
          </div>
          <button id="btn-refresh-news" onclick="window.KrishiFeed.handleRefreshNews()" style="padding: 6px 12px; border-radius: 20px; border: 1px solid #c5221f; background: #c5221f; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; outline: none;">Refresh News</button>
        `;
      } else {
        statusIndicator.className = 'feed-status-bar online';
        statusIndicator.style.backgroundColor = '';
        statusIndicator.style.color = '';
        statusIndicator.style.border = '';
        
        statusIndicator.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="status-dot"></span>
            <span>🟢 Live News</span>
          </div>
        `;
      }
      if (window.translateUI) window.translateUI();
    }
  }

  /**
   * Handle the retry button "Refresh News" that retries Gemini after 60 seconds.
   */
  async function handleRefreshNews() {
    if (window.playSound) window.playSound('snd-click');
    
    const now = Date.now();
    const timeSinceLast = now - lastRefreshTime;
    const cooldown = 60000; // 60 seconds
    
    const refreshBtn = document.getElementById('btn-refresh-news');
    
    if (timeSinceLast < cooldown) {
      const secondsLeft = Math.ceil((cooldown - timeSinceLast) / 1000);
      if (refreshBtn) {
        const originalText = refreshBtn.innerText;
        refreshBtn.innerText = `Wait ${secondsLeft}s`;
        refreshBtn.disabled = true;
        refreshBtn.style.opacity = '0.7';
        setTimeout(() => {
          refreshBtn.innerText = originalText;
          refreshBtn.disabled = false;
          refreshBtn.style.opacity = '1';
        }, 1500);
      }
      return;
    }
    
    lastRefreshTime = now;
    isOnline = true;
    isGeminiUnavailable = false;
    
    console.log('[Feed] Retrying news fetch via Gemini...');
    await searchNews();
  }

  /**
   * Load and render feed news articles (wraps searchNews)
   */
  async function loadFeedData() {
    await searchNews();
  }

  /**
   * Load and render the Daily AI Tip at the top of the feed
   */
  async function loadDailyTip() {
    if (!dailyTipBox) return;

    const profile = getFarmerProfile();
    const lang = (window.appState && window.appState.currentLanguage) || 'en';
    const weatherCache = loadWeatherCache();

    let tipText = '';
    if (isOnline && weatherCache) {
      tipText = await window.KrishiFeedService.generateDailyTip(profile, weatherCache.data, lang);
    }

    if (!tipText) {
      // Fallback tip if offline or API error
      tipText = window.KrishiFeedService.getFallbackDailyTip(profile.crop, weatherCache ? weatherCache.data : null, lang);
    }

    dailyTipBox.innerHTML = `
      <div class="daily-tip-card">
        <div class="daily-tip-header">
          <span>✨</span>
          <span data-i18n="daily_ai_tip">Daily AI Advice</span>
        </div>
        <p class="daily-tip-text">${tipText}</p>
      </div>
    `;

    if (window.translateUI) window.translateUI();
  }

  /**
   * Core search function — guaranteed to ALWAYS hide the loading spinner,
   * regardless of success, failure, timeout, or empty results.
   *
   * SEARCH PIPELINE:
   *   1. Read keyword from searchInput
   *   2. Build combinedQuery (keyword + category filter)
   *   3. If online → call Gemini proxy with combinedQuery
   *   4. If Gemini fails → load offline cache
   *   5. Apply local filter + keyword search on allArticles
   *   6. Render all matching cards
   */
  async function searchNews() {
    const query = (searchInput && searchInput.value) ? searchInput.value.trim() : '';
    console.log(`%c[Feed] ── SEARCH STARTED ──`, 'color:#2e7d32;font-weight:bold');
    console.log(`  Keyword     : "${query}"`);
    console.log(`  Category    : "${currentFilter}"`);

    showLoading(true);

    const profile = getFarmerProfile();
    const lang    = (window.appState && window.appState.currentLanguage) || 'en';

    // Re-evaluate isOnline each search: if Gemini failed, retry after cooldown
    if (isGeminiUnavailable && (Date.now() - geminiFailedAt) > GEMINI_RETRY_COOLDOWN) {
      console.log('[Feed] Gemini cooldown expired — retrying online mode.');
      isOnline = true;
      isGeminiUnavailable = false;
    }

    try {

      // ── Bookmarks shortcut (no network needed) ───────────────────────────
      if (currentFilter === 'bookmarks') {
        console.log('[Feed] Loading bookmarks...');
        allArticles = window.KrishiNewsCache.getBookmarks() || [];
        console.log(`[Feed] Bookmarks loaded: ${allArticles.length}`);

      } else {
        // ── Build combined query ──────────────────────────────────────────
        // IMPORTANT: always use the real keyword in both Gemini prompt and offline filter
        let combinedQuery = query;
        if (currentFilter !== 'all') {
          combinedQuery = [query, currentFilter].filter(Boolean).join(' ');
        }
        console.log(`  CombinedQuery: "${combinedQuery}"`);

        if (isOnline) {
          // ── ONLINE: try Gemini via backend proxy ────────────────────────
          console.log('[Feed] ONLINE mode — sending query to Gemini proxy:', combinedQuery || '(general)');
          try {
            const liveNews = await window.KrishiFeedService.fetchNewsOnline(profile, lang, combinedQuery);
            console.log(`[Feed] Gemini Response — ${liveNews ? liveNews.length : 0} articles returned`);

            if (liveNews && liveNews.length > 0) {
              allArticles = liveNews;
              // Save to cache async (non-blocking)
              window.KrishiNewsCache.saveCache(allArticles).catch(e =>
                console.warn('[Feed] Cache save failed (non-fatal):', e.message)
              );
              isGeminiUnavailable = false;
              console.log('[Feed] Using live Gemini articles.');
            } else {
              console.warn('[Feed] Gemini returned 0 articles — falling back to offline cache.');
              throw new Error('Gemini returned empty array');
            }
          } catch (geminiErr) {
            // ── Gemini failed → switch to offline cache for THIS search ───
            console.error('[Feed] Gemini failed:', geminiErr.message);
            isGeminiUnavailable = true;
            geminiFailedAt = Date.now();
            // Don't permanently set isOnline=false — next search will retry
            updateOnlineStatus(); // fire-and-forget UI update

            console.log('[Feed] Falling back to offline cache...');
            try {
              allArticles = await window.KrishiNewsCache.loadCache();
              console.log(`[Feed] Offline cache loaded: ${allArticles.length} articles`);
            } catch (cacheErr) {
              console.error('[Feed] Cache load failed:', cacheErr.message);
              allArticles = [];
            }
          }
        } else {
          // ── OFFLINE: load full cache, then filter by keyword locally ────
          console.log('[Feed] OFFLINE mode — loading cache and filtering locally...');
          try {
            allArticles = await window.KrishiNewsCache.loadCache();
            console.log(`[Feed] Offline cache loaded: ${allArticles.length} articles`);
          } catch (cacheErr) {
            console.error('[Feed] Cache load failed:', cacheErr.message);
            allArticles = [];
          }
        }
      }

    } catch (unexpectedErr) {
      console.error('[Feed] Unexpected error in searchNews():', unexpectedErr);
      allArticles = [];

    } finally {
      console.log('[Feed] Hiding loading spinner...');
      showLoading(false);
    }

    // ── Apply local filters & keyword search, then render ─────────────────
    console.log(`[Feed] Total articles in pool: ${allArticles.length}`);
    applyLocalFiltersAndSearch(query);
    console.log(`%c[Feed] ── SEARCH COMPLETE — ${filteredArticles.length} cards rendered ──`, 'color:#2e7d32;font-weight:bold');
  }

  /**
   * Sets Category Filter and executes search (called by pills)
   */
  function applyFiltersAndSearch(filterType = null) {
    if (filterType) {
      currentFilter = filterType;
      console.log(`[Feed] Category pill clicked: "${filterType}"`);
      
      // Update UI active pill
      if (pillsContainer) {
        const pills = pillsContainer.querySelectorAll('.filter-pill');
        pills.forEach(pill => {
          const onclickAttr = pill.getAttribute('onclick') || '';
          if (onclickAttr.includes(`'${filterType}'`)) {
            pill.classList.add('active');
          } else {
            pill.classList.remove('active');
          }
        });
      }
    }

    // Trigger searchNews()
    searchNews();
  }

  /**
   * Apply local filtering and keyword search on allArticles.
   * Accepts an optional forcedQuery parameter (used when called from searchNews
   * to guarantee the same keyword is used — avoids DOM timing races).
   */
  function applyLocalFiltersAndSearch(forcedQuery) {
    // Prefer forcedQuery (passed from searchNews) so we always use the same value
    const query = (forcedQuery !== undefined)
      ? String(forcedQuery).toLowerCase().trim()
      : (searchInput && searchInput.value ? searchInput.value.toLowerCase().trim() : '');

    console.log(`[Feed] applyLocalFiltersAndSearch() — keyword: "${query}" | filter: "${currentFilter}" | pool: ${allArticles.length}`);

    // ── Step 1: Category / date filter ───────────────────────────────────
    if (currentFilter === 'all') {
      filteredArticles = [...allArticles];
    } else if (currentFilter === 'bookmarks') {
      filteredArticles = window.KrishiNewsCache.getBookmarks() || [];
    } else if (currentFilter === 'today' || currentFilter === 'this week') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filteredArticles = allArticles.filter(art => {
        const dateStr = art.publishedDate || art.date;
        if (!dateStr) return false;
        const artDate = new Date(dateStr);
        if (isNaN(artDate.getTime())) return false;
        artDate.setHours(0, 0, 0, 0);
        const diffDays = (today.getTime() - artDate.getTime()) / 86400000;
        if (currentFilter === 'today') {
          return artDate.getFullYear() === today.getFullYear() &&
                 artDate.getMonth()    === today.getMonth()    &&
                 artDate.getDate()     === today.getDate();
        }
        return diffDays >= 0 && diffDays <= 7;
      });
    } else {
      const filterMappings = {
        weather:    ['weather', 'climate'],
        government: ['government schemes', 'government', 'schemes'],
        machines:   ['machinery', 'machines', 'tractor', 'equipment'],
        diseases:   ['disease', 'pest', 'outbreaks', 'alert'],
        organic:    ['organic'],
        research:   ['research'],
        market:     ['market', 'mandi', 'price', 'export']
      };
      const mappedCats = filterMappings[currentFilter] || [currentFilter];
      filteredArticles = allArticles.filter(art => {
        const cat       = (art.category || '').toLowerCase();
        const title     = (art.title    || '').toLowerCase();
        const keywords  = (art.keywords || '').toLowerCase();
        const readMore  = (art.readMoreURL || '').toLowerCase();
        if (currentFilter === 'videos') {
          return art.isVideo === true ||
            cat.includes('video') ||
            readMore.includes('youtube') ||
            readMore.includes('video');
        }
        return mappedCats.some(mc => cat.includes(mc) || title.includes(mc) || keywords.includes(mc));
      });
    }

    console.log(`[Feed] After category filter: ${filteredArticles.length} articles`);

    // ── Step 2: Keyword search across all text fields ─────────────────────
    if (query !== '') {
      const terms = query.split(/\s+/).filter(Boolean); // support multi-word
      filteredArticles = filteredArticles.filter(art => {
        const haystack = [
          art.title       || art.headline || '',
          art.summary     || '',
          art.crop        || '',
          art.state       || '',
          art.category    || '',
          art.source      || '',
          Array.isArray(art.keywords) ? art.keywords.join(' ') : (art.keywords || '')
        ].join(' ').toLowerCase();

        // Article matches if ALL search terms are found somewhere
        return terms.every(term => haystack.includes(term));
      });
      console.log(`[Feed] After keyword filter ("${query}"): ${filteredArticles.length} articles`);
    }

    console.log(`[Feed] Filtered Results: ${filteredArticles.length} | Articles Rendered: ${Math.min(filteredArticles.length, pageSize)}`);

    // ── Step 3: Reset pagination and render ──────────────────────────────
    currentPage = 1;
    displayedArticles = [];
    renderFeedList(query);
  }

  /**
   * Render the news articles with pagination/lazy loading
   */
  function renderFeedList() {
    if (!listContainer) return;

    if (currentPage === 1) {
      listContainer.innerHTML = '';
    }

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageArticles = filteredArticles.slice(start, end);
    displayedArticles = displayedArticles.concat(pageArticles);

    if (displayedArticles.length === 0) {
      const searchQuery = searchInput ? searchInput.value.trim() : '';
      let emptyMessage;
      if (allArticles.length === 0) {
        emptyMessage = '📡 No cached news available. Check your internet connection.';
      } else if (searchQuery) {
        emptyMessage = `🔍 No agricultural news found for <strong>"${searchQuery}"</strong>. Try a different keyword.`;
      } else {
        emptyMessage = '📰 No articles found for the selected filter.';
      }
      listContainer.innerHTML = `
        <div class="feed-empty-state" style="text-align:center;padding:40px 20px;">
          <p style="font-size:16px;color:#555;">${emptyMessage}</p>
        </div>
      `;
      return;
    }

    pageArticles.forEach(article => {
      const artId = article.id || `news-${Date.now()}-${Math.random()}`;
      const isBookmarked = window.KrishiNewsCache.isBookmarked(artId);
      const isOfflineMode = !isOnline;

      let impClass = 'useful';
      const importanceText = article.importance || '🟢 Useful';
      if (importanceText.includes('Urgent')) impClass = 'urgent';
      else if (importanceText.includes('Important')) impClass = 'important';

      const card = document.createElement('div');
      card.className = 'news-card';
      
      const imageSrc = article.image || 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80';
      const displayTitle = article.title || article.headline || 'Krishi Update';
      const displayDate = article.publishedDate || article.date || '';

      card.innerHTML = `
        <img src="${imageSrc}" class="news-card-image" style="width: 100%; height: 180px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" alt="${displayTitle}" onerror="this.src='https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80'">
        <div class="news-card-header">
          <span class="category-tag">${article.category}</span>
          <span class="importance-badge ${impClass}">${importanceText}</span>
        </div>
        <h3 class="news-card-title">${displayTitle}</h3>
        <p class="news-card-summary" style="display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; line-height: 1.5; max-height: 6em;">
          ${article.summary}
        </p>
        
        ${article.takeaway ? `
        <div class="news-card-takeaway">
          <div class="takeaway-title" data-i18n="takeaway_title">Key Takeaway</div>
          <p class="takeaway-text">${article.takeaway}</p>
        </div>` : ''}

        <div class="news-card-meta">
          <div class="meta-item">📰 <strong>${article.source}</strong></div>
          <div class="meta-item">📅 ${displayDate}</div>
          ${article.readingTime ? `<div class="meta-item">⏱ ${article.readingTime}</div>` : ''}
        </div>

        <div class="news-card-actions">
          <button class="btn-card-action ${isBookmarked ? 'bookmarked' : ''}" onclick="window.KrishiFeed.handleBookmark('${artId}', this)">
            <span class="action-icon">${isBookmarked ? '★' : '☆'}</span>
            <span data-i18n="bookmark_btn">${isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
          </button>
          
          <button class="btn-card-action" onclick="window.KrishiFeed.handleShare('${artId}')">
            <span class="action-icon">📢</span>
            <span data-i18n="share_btn">Share</span>
          </button>
          
          <button class="btn-card-action" onclick="window.KrishiFeed.handleReadMore('${artId}')">
            <span class="action-icon">📖</span>
            <span data-i18n="read_more_btn">Read More</span>
          </button>
          
          <button class="btn-card-action ask-ai-btn" onclick="window.KrishiFeed.handleAskAI('${artId}')">
            <span class="action-icon">🤖</span>
            <span data-i18n="ask_ai_btn">Ask AI</span>
          </button>
        </div>
      `;

      listContainer.appendChild(card);
    });

    if (window.translateUI) window.translateUI();
  }

  /**
   * Handle Scroll for Lazy Loading
   */
  function handleScroll() {
    if (!window.appState || window.appState.currentTab !== 'feed') return;

    const threshold = 100; // pixels from bottom
    const position = window.innerHeight + window.scrollY;
    const limit = document.documentElement.scrollHeight - threshold;

    if (position >= limit) {
      if (displayedArticles.length < filteredArticles.length) {
        currentPage++;
        renderFeedList();
      }
    }
  }

  /**
   * Bookmark Toggle Handler
   */
  function handleBookmark(articleId, buttonEl) {
    const article = allArticles.find(a => a.id === articleId) || 
                    window.KrishiNewsCache.getBookmarks().find(a => a.id === articleId) ||
                    displayedArticles.find(a => a.id === articleId);
    if (!article) return;

    if (window.playSound) window.playSound('snd-click');
    const bookmarked = window.KrishiNewsCache.toggleBookmark(article);
    
    // Update button visual state
    if (buttonEl) {
      buttonEl.classList.toggle('bookmarked', bookmarked);
      buttonEl.querySelector('.action-icon').innerText = bookmarked ? '★' : '☆';
      buttonEl.querySelector('[data-i18n]').innerText = bookmarked ? 'Bookmarked' : 'Bookmark';
    }

    // Refresh if we are viewing the bookmarks filter
    if (currentFilter === 'bookmarks') {
      applyFiltersAndSearch();
    }
  }

  /**
   * Share Article Details
   */
  function handleShare(articleId) {
    const article = allArticles.find(a => a.id === articleId) || 
                    window.KrishiNewsCache.getBookmarks().find(a => a.id === articleId) ||
                    displayedArticles.find(a => a.id === articleId);
    if (!article) return;

    if (window.playSound) window.playSound('snd-click');

    const displayTitle = article.title || article.headline || 'Krishi Update';
    const displayDate = article.publishedDate || article.date || '';

    const shareText = `*🌾 Krishi Feed Alert*\n\n*${displayTitle}*\n\n${article.summary}\n\n*💡 Takeaway:* ${article.takeaway || ''}\n\nSource: ${article.source} (${displayDate})\nShared via KrishiMitra AI App.`;

    const modalBody = `
      <div class="share-modal-body">
        <h3 style="margin-bottom:var(--spacing-xs)">Share News Update</h3>
        <p style="color:var(--text-secondary);font-size:14px;margin-bottom:var(--spacing-sm)">Copy this farmer-friendly summary to share with other farmers via WhatsApp or SMS:</p>
        <div class="share-preview-box">${shareText}</div>
        <button class="btn-copy-share" onclick="window.KrishiFeed.copyShareText()"><span data-i18n="copy_to_clipboard">Copy to Clipboard</span></button>
      </div>
    `;

    openFeedModal(modalBody);
  }

  function copyShareText() {
    const box = document.querySelector('.share-preview-box');
    if (!box) return;
    
    navigator.clipboard.writeText(box.innerText).then(() => {
      const btn = document.querySelector('.btn-copy-share');
      if (btn) {
        btn.style.backgroundColor = '#1e8e3e';
        btn.innerText = 'Copied successfully! ✓';
        if (window.playSound) window.playSound('snd-success');
      }
    });
  }

  /**
   * Read More Handler
   */
  function handleReadMore(articleId) {
    const article = allArticles.find(a => a.id === articleId) || 
                    window.KrishiNewsCache.getBookmarks().find(a => a.id === articleId) ||
                    displayedArticles.find(a => a.id === articleId);
    if (!article) return;

    if (window.playSound) window.playSound('snd-click');

    const readUrl = article.readMoreURL || article.sourceUrl;
    const displayTitle = article.title || article.headline || 'Krishi Update';
    const displayDate = article.publishedDate || article.date || '';

    if (isOnline && readUrl) {
      window.open(readUrl, '_blank');
    } else {
      // Offline fallback: Show cached details in a clean reader modal
      const modalBody = `
        <div style="display:flex;flex-direction:column;gap:12px;padding:var(--spacing-sm) 0">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span class="category-tag">${article.category}</span>
            <span style="font-weight:700;color:var(--color-warning)">⚠️ Offline Mode</span>
          </div>
          ${article.image ? `<img src="${article.image}" style="width:100%; max-height:220px; object-fit:cover; border-radius:8px;" alt="${displayTitle}" onerror="this.src='https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80'">` : ''}
          <h2 style="font-family:var(--font-heading);font-size:22px;line-height:1.3;color:var(--text-primary)">${displayTitle}</h2>
          <div style="font-size:16px;line-height:1.6;color:var(--text-secondary);margin-top:10px">${article.summary}</div>
          ${article.takeaway ? `
          <div class="news-card-takeaway" style="margin-top:10px">
            <div class="takeaway-title">Key Takeaway</div>
            <p class="takeaway-text" style="font-size:15px">${article.takeaway}</p>
          </div>` : ''}
          <div style="font-size:13px;color:var(--text-secondary);margin-top:12px;border-top:1px solid #eee;padding-top:10px">
            Source: <strong>${article.source}</strong> | Date: ${displayDate}
          </div>
        </div>
      `;
      openFeedModal(modalBody);
    }
  }

  /**
   * Ask AI Chat Drawer Handler
   */
  function handleAskAI(articleId) {
    const article = allArticles.find(a => a.id === articleId) || 
                    window.KrishiNewsCache.getBookmarks().find(a => a.id === articleId) ||
                    displayedArticles.find(a => a.id === articleId);
    if (!article) return;

    if (window.playSound) window.playSound('snd-chime');

    const displayTitle = article.title || article.headline || 'Krishi Update';

    currentChatHistory = []; // Reset chat history for new card
    const lang = (window.appState && window.appState.currentLanguage) || 'en';

    const modalBody = `
      <div class="ask-ai-modal">
        <div class="ask-ai-header">
          <h3>🤖 Ask Krishi AI about this news</h3>
        </div>
        <div class="ask-ai-chat-box" id="ask-ai-chat-box">
          <div class="chat-bubble news-context-bubble">
            <strong>Context Article:</strong> "${displayTitle}"
          </div>
          <div class="chat-bubble bot-message">
            <p data-i18n="ask_ai_welcome">Hello! Ask me any questions about this news. For example: "How does this affect my crop?" or "Explain in Hindi."</p>
            <span class="chat-time">${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        <div class="voice-status-display" id="voice-status-display"></div>
        <div class="ask-ai-input-wrapper">
          <textarea 
            class="ask-ai-textarea" 
            id="ask-ai-textarea"
            rows="1" 
            placeholder="Type your question..."
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window.KrishiFeed.sendAIQuestion('${articleId}');}"
          ></textarea>
          
          <button class="btn-ask-ai-mic" id="btn-ask-ai-mic" onclick="window.KrishiFeed.toggleVoiceAI('${articleId}')" title="Hold to Speak">
            <svg class="icon-mic" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3m0 2a1 1 0 0 1 1 1v7a1 1 0 0 1-2 0V5a1 1 0 0 1 1-1m-7 8v1a7 7 0 0 0 14 0v-1h-2v1a5 5 0 0 1-10 0v-1H5m5 6h4v3h-4v-3z"/>
            </svg>
          </button>

          <button class="btn-ask-ai-send" onclick="window.KrishiFeed.sendAIQuestion('${articleId}')" title="Send text question">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    `;

    openFeedModal(modalBody);
  }

  /**
   * Send Text Question to local AI
   */
  async function sendAIQuestion(articleId) {
    const input = document.getElementById('ask-ai-textarea');
    if (!input) return;

    const question = input.value.trim();
    if (!question) return;

    input.value = ''; // clear input
    addAskAIMessage(question, 'user-message');
    
    // Disable inputs while typing
    input.disabled = true;

    // Show thinking indicator
    const thinkingBubble = addThinkingBubble();

    const article = allArticles.find(a => a.id === articleId) || 
                    window.KrishiNewsCache.getBookmarks().find(a => a.id === articleId) ||
                    displayedArticles.find(a => a.id === articleId);
    const lang = (window.appState && window.appState.currentLanguage) || 'en';

    // Call newsAI service
    const response = await window.KrishiNewsAI.askAboutArticle(article, question, lang, currentChatHistory);
    
    // Remove thinking indicator
    if (thinkingBubble) thinkingBubble.remove();
    input.disabled = false;
    input.focus();

    if (response.success) {
      addAskAIMessage(response.reply, 'bot-message');
      
      // Update history
      currentChatHistory.push({ role: 'user', content: question });
      currentChatHistory.push({ role: 'assistant', content: response.reply });

      // Automatically speak the response if enabled
      if (window.KrishiMitraConfig.SPEAK_REPLIES) {
        window.KrishiNewsAI.speakResponse(response.reply, lang);
      }
    } else {
      addAskAIMessage(response.error, 'bot-message km-error-bubble');
    }
  }

  /**
   * Toggle Voice STT for News AI Question
   */
  function toggleVoiceAI(articleId) {
    if (activeSpeechRecognition) {
      activeSpeechRecognition.stop();
      activeSpeechRecognition = null;
      return;
    }

    if (window.playSound) window.playSound('snd-click');
    window.KrishiNewsAI.stopSpeaking();

    const lang = (window.appState && window.appState.currentLanguage) || 'en';
    const micBtn = document.getElementById('btn-ask-ai-mic');
    const statusDisp = document.getElementById('voice-status-display');
    const textarea = document.getElementById('ask-ai-textarea');

    activeSpeechRecognition = window.KrishiNewsAI.startSpeechRecognition(lang, {
      onStart: () => {
        if (micBtn) micBtn.classList.add('recording');
        if (statusDisp) statusDisp.innerText = 'Listening... Speak your question now';
      },
      onResult: (transcript) => {
        if (textarea) textarea.value = transcript;
        sendAIQuestion(articleId);
      },
      onError: (err) => {
        if (statusDisp) statusDisp.innerText = 'Voice search failed. Tap and try again.';
      },
      onEnd: () => {
        if (micBtn) micBtn.classList.remove('recording');
        if (statusDisp && statusDisp.innerText.includes('Listening')) {
          statusDisp.innerText = '';
        }
        activeSpeechRecognition = null;
      },
      onUnsupported: () => {
        if (statusDisp) statusDisp.innerText = 'Voice recognition not supported in this browser.';
        // Simulate a random question for testing/fallback
        if (micBtn) micBtn.classList.add('recording');
        setTimeout(() => {
          if (micBtn) micBtn.classList.remove('recording');
          const mockQuestions = {
            en: ["How does this affect wheat crops?", "What is the MSP of Paddy?", "Explain this scheme in details"],
            hi: ["गेहूं की फसल पर इसका क्या असर पड़ेगा?", "धान का एमएसपी क्या है?", "इस योजना के बारे में विस्तार से बताएं"],
            gu: ["આ પાક પર શું અસર કરશે?", "ડાંગરના ભાવ શું છે?", "આ યોજના વિશે વિગતવાર સમજાવો"],
            mr: ["याचा गव्हावर काय परिणाम होईल?", "धान्याचा हमीभाव काय आहे?", "या योजनेबद्दल माहिती सांगा"],
            pa: ["ਕਣਕ ਦੀ ਫਸਲ 'ਤੇ ਇਸ ਦਾ ਕੀ ਅਸਰ ਹੋਵੇਗਾ?", "ਝੋਨੇ ਦਾ ਐਮਐਸਪੀ ਕੀ ਹੈ?", "ਇਸ ਸਕੀਮ ਬਾਰੇ ਵਿਸਥਾਰ ਵਿੱਚ ਦੱਸੋ"]
          };
          const list = mockQuestions[lang] || mockQuestions.en;
          const randomQ = list[Math.floor(Math.random() * list.length)];
          if (textarea) textarea.value = randomQ;
          sendAIQuestion(articleId);
        }, 1500);
      }
    });
  }

  /* Chat UI utilities */
  function addAskAIMessage(text, typeClass) {
    const box = document.getElementById('ask-ai-chat-box');
    if (!box) return;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${typeClass}`;
    
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    bubble.innerHTML = `
      <p>${text}</p>
      <span class="chat-time">${time}</span>
    `;

    box.appendChild(bubble);
    box.scrollTop = box.scrollHeight;
  }

  function addThinkingBubble() {
    const box = document.getElementById('ask-ai-chat-box');
    if (!box) return null;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bot-message km-thinking';
    bubble.innerHTML = `
      <p style="display:flex;align-items:center;gap:8px;">
        <span class="km-dots">
          <span></span><span></span><span></span>
        </span>
        <span>Generating explanation...</span>
      </p>
    `;
    box.appendChild(bubble);
    box.scrollTop = box.scrollHeight;
    return bubble;
  }

  /**
   * Helper view switch triggers
   */
  function handleTabChange(tabId) {
    if (tabId === 'feed') {
      updateOnlineStatus();
      loadFeedData();
      loadDailyTip();
    } else {
      window.KrishiNewsAI.stopSpeaking();
    }
  }

  /* Modal functions */
  function openFeedModal(contentHtml) {
    const modal = document.getElementById('feed-modal');
    const body = document.getElementById('feed-modal-body');
    if (modal && body) {
      body.innerHTML = contentHtml;
      modal.classList.remove('hidden');
      if (window.translateUI) window.translateUI();
    }
  }

  function closeFeedModal() {
    const modal = document.getElementById('feed-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
    // Stop speech if speaking
    window.KrishiNewsAI.stopSpeaking();
    if (activeSpeechRecognition) {
      activeSpeechRecognition.stop();
      activeSpeechRecognition = null;
    }
  }

  /* Utility functions to get local profile and weather data */
  function getFarmerProfile() {
    const defaultProfile = {
      name: "Ramesh Prasad",
      phone: "+91 98765 43210",
      village: "Kishanpur",
      district: "Gorakhpur",
      state: "Uttar Pradesh",
      crop: "Wheat",
      acres: 2.5,
      category: "Small Farmer",
      irrigation: "Borewell/Tubewell",
      farmingType: "Conventional",
      ownership: "Owner",
      soil: "Alluvial"
    };
    
    try {
      const p = localStorage.getItem('km_profile');
      return p ? JSON.parse(p) : defaultProfile;
    } catch (e) {
      console.error(e);
      return defaultProfile;
    }
  }

  function loadWeatherCache() {
    try {
      const cached = localStorage.getItem('km_weather_cache');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  function showLoading(show) {
    const loader = document.getElementById('feed-loading');
    if (loader) {
      if (show) {
        loader.classList.remove('hidden');
        const p = loader.querySelector('p');
        if (p) p.innerHTML = 'Loading...<br>Searching agricultural news...<br>Fetching latest updates...';
      } else {
        loader.classList.add('hidden');
      }
    }
    if (listContainer && show) {
      listContainer.innerHTML = '';
    }
    console.log(`[Feed] showLoading(${show}) called`);
  }

  return {
    init,
    handleBookmark,
    handleShare,
    handleReadMore,
    handleAskAI,
    sendAIQuestion,
    toggleVoiceAI,
    copyShareText,
    closeFeedModal,
    handleTabChange,
    applyFiltersAndSearch,
    handleRefreshNews,
    searchNews
  };
})();

// Global route hook to listen to tab switching
window.addEventListener('load', () => {
  // Initialize feed
  if (window.KrishiFeed && typeof window.KrishiFeed.init === 'function') {
    window.KrishiFeed.init();
  }

  // Wait for scripts to bind, then patch tab switching
  const originalSwitchTab = window.switchTab;
  if (typeof originalSwitchTab === 'function') {
    window.switchTab = function (tabId) {
      originalSwitchTab(tabId);
      window.KrishiFeed.handleTabChange(tabId);
    };
  }
});
