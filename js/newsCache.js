/* ==========================================================================
   newsCache.js — Offline News Cache and Bookmark Manager
   ========================================================================== */

'use strict';

window.KrishiNewsCache = (function () {
  const BOOKMARKS_KEY = 'km_news_bookmarks';
  const LOCAL_CACHE_KEY = 'km_news_cache';
  const API_URL = (window.KrishiMitraConfig && window.KrishiMitraConfig.API_BASE_URL) || 'http://localhost:5000/api';

  /**
   * Load cached news articles from the local backend API.
   * Falls back to localStorage cache if backend is down.
   */
  async function loadCache() {
    try {
      const res = await fetch(`${API_URL}/feed/cache`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.articles)) {
          // Backup to localStorage for safety
          localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(data.articles));
          console.log("Offline Cache Loaded");
          return data.articles;
        }
      }
    } catch (e) {
      console.warn('[NewsCache] Backend cache load failed, using local storage backup:', e);
    }

    // Try localStorage backup next
    const localBackup = localStorage.getItem(LOCAL_CACHE_KEY);
    if (localBackup) {
      try {
        const parsed = JSON.parse(localBackup);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log("Offline Cache Loaded from localStorage");
          return parsed;
        }
      } catch (e) {
        console.error('[NewsCache] LocalStorage parse error:', e);
      }
    }

    // If localStorage is empty, try to fetch database/news/news_cache.json directly from front-end directory
    try {
      console.log("[NewsCache] LocalStorage empty, trying direct fetch of database/news/news_cache.json...");
      const res = await fetch('database/news/news_cache.json');
      if (res.ok) {
        const articles = await res.json();
        if (Array.isArray(articles) && articles.length > 0) {
          localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(articles));
          console.log("Offline Cache Loaded from database/news/news_cache.json");
          return articles;
        }
      }
    } catch (e) {
      console.error('[NewsCache] Failed to fetch database/news/news_cache.json:', e);
    }

    return [];
  }

  /**
   * Save news articles to the backend cache, and backup locally.
   */
  async function saveCache(articles) {
    if (!Array.isArray(articles)) return false;

    // Save to localStorage immediately
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(articles));
    console.log("Articles Cached");

    try {
      const res = await fetch(`${API_URL}/feed/cache`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles })
      });
      if (res.ok) {
        const data = await res.json();
        return data.success;
      }
    } catch (e) {
      console.warn('[NewsCache] Failed to sync cache with backend:', e);
    }
    return false;
  }

  /**
   * Get all bookmarked articles.
   */
  function getBookmarks() {
    const data = localStorage.getItem(BOOKMARKS_KEY);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Check if a specific article is bookmarked.
   */
  function isBookmarked(articleId) {
    const list = getBookmarks();
    return list.some(item => item.id === articleId);
  }

  /**
   * Add or remove an article from bookmarks.
   * Returns true if bookmarked, false if removed.
   */
  function toggleBookmark(article) {
    const list = getBookmarks();
    const index = list.findIndex(item => item.id === article.id);

    let bookmarked = false;
    if (index === -1) {
      list.push(article);
      bookmarked = true;
    } else {
      list.splice(index, 1);
    }

    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
    return bookmarked;
  }

  return {
    loadCache,
    saveCache,
    getBookmarks,
    isBookmarked,
    toggleBookmark
  };
})();
