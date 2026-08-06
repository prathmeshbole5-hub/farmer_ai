/* ==========================================================================
   KrishiMitra AI — Database Service
   Loads ALL JSON files from database/ at startup.
   Provides fuzzy search functions for every domain.
   ========================================================================== */

'use strict';

const path = require('path');
const fs   = require('fs');

// ── Database root (one level up from backend/) ───────────────────────────────
const DB_ROOT = path.join(__dirname, '..', '..', 'database');

// ── In-memory data store ──────────────────────────────────────────────────────
const db = {
  crops:       [],
  diseases:    [],
  schemes:     [],
  weather:     [],
  soil:        [],
  fertilizers: [],
  pesticides:  [],
  mandi:       [],
  faq:         []
};

// ── JSON file map: domain → relative path inside database/ ───────────────────
const FILE_MAP = {
  crops:       'crops/crops.json',
  diseases:    'diseases/diseases.json',
  schemes:     'schemes/schemes.json',
  weather:     'weather/weather.json',
  soil:        'soil/soil.json',
  fertilizers: 'fertilizers/fertilizers.json',
  pesticides:  'pesticides/pesticides.json',
  mandi:       'mandi/mandi.json',
  faq:         'faq/faq.json'
};

// ── Load all JSON files at startup ───────────────────────────────────────────
function loadAllData() {
  let loaded = 0;
  let failed = 0;

  for (const [domain, relPath] of Object.entries(FILE_MAP)) {
    const fullPath = path.join(DB_ROOT, relPath);
    try {
      const raw = fs.readFileSync(fullPath, 'utf8')
        .replace(/^\uFEFF/, ''); // strip UTF-8 BOM if present
      db[domain] = JSON.parse(raw);
      loaded++;
      console.log(`  ✓ [DB] Loaded ${db[domain].length} records → ${domain}`);
    } catch (err) {
      failed++;
      console.warn(`  ✗ [DB] Could not load ${relPath}: ${err.message}`);
      db[domain] = []; // graceful fallback
    }
  }

  console.log(`\n  [DB] Database ready — ${loaded} domains loaded, ${failed} failed.\n`);
}

// ── Core fuzzy search ─────────────────────────────────────────────────────────
/**
 * Search a domain's records for a query string.
 * Matches against title, description, category, and all metadata string values.
 *
 * @param {string}   domain  - key of db object (e.g. 'crops')
 * @param {string}   query   - search query
 * @param {number}  [limit]  - max results (default 5)
 * @returns {Array}          - matched records
 */
function searchDomain(domain, query, limit = 5) {
  if (!query || !db[domain]) return db[domain].slice(0, limit);

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  const scored = db[domain].map(record => {
    const blob = buildSearchBlob(record).toLowerCase();
    const score = terms.reduce((acc, term) => {
      if (blob.includes(term)) acc += 1;
      return acc;
    }, 0);
    return { record, score };
  });

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.record);
}

/**
 * Build a flat text blob from a record for full-text search.
 * @param {Object} record
 * @returns {string}
 */
function buildSearchBlob(record) {
  const parts = [
    record.id       || '',
    record.category || '',
    record.title    || '',
    record.description || ''
  ];

  if (record.metadata && typeof record.metadata === 'object') {
    flattenValues(record.metadata, parts);
  }

  return parts.join(' ');
}

/**
 * Recursively extract string/number values from an object.
 * @param {Object} obj
 * @param {string[]} parts
 */
function flattenValues(obj, parts) {
  for (const val of Object.values(obj)) {
    if (typeof val === 'string' || typeof val === 'number') {
      parts.push(String(val));
    } else if (Array.isArray(val)) {
      val.forEach(v => {
        if (typeof v === 'string' || typeof v === 'number') {
          parts.push(String(v));
        } else if (typeof v === 'object' && v !== null) {
          flattenValues(v, parts);
        }
      });
    } else if (typeof val === 'object' && val !== null) {
      flattenValues(val, parts);
    }
  }
}

// ── Public search API ─────────────────────────────────────────────────────────

/**
 * Search disease records.
 * @param {string} query - e.g. "rice blast leaf"
 * @param {number} [limit=5]
 * @returns {Array}
 */
function searchDisease(query, limit = 5) {
  return searchDomain('diseases', query, limit);
}

/**
 * Search crop records.
 * @param {string} query - e.g. "wheat lokwan price"
 * @param {number} [limit=5]
 * @returns {Array}
 */
function searchCrop(query, limit = 5) {
  return searchDomain('crops', query, limit);
}

/**
 * Search government scheme records.
 * @param {string} query - e.g. "PM Kusum solar pump subsidy"
 * @param {number} [limit=5]
 * @returns {Array}
 */
function searchScheme(query, limit = 5) {
  return searchDomain('schemes', query, limit);
}

/**
 * Search weather records.
 * @param {string} query - e.g. "rain UP monsoon"
 * @param {number} [limit=5]
 * @returns {Array}
 */
function searchWeather(query, limit = 5) {
  return searchDomain('weather', query, limit);
}

/**
 * Search soil type records.
 * @param {string} query - e.g. "alluvial black soil wheat"
 * @param {number} [limit=5]
 * @returns {Array}
 */
function searchSoil(query, limit = 5) {
  return searchDomain('soil', query, limit);
}

/**
 * Search fertilizer records.
 * @param {string} query - e.g. "urea nitrogen paddy"
 * @param {number} [limit=5]
 * @returns {Array}
 */
function searchFertilizer(query, limit = 5) {
  return searchDomain('fertilizers', query, limit);
}

/**
 * Search pesticide records.
 * @param {string} query - e.g. "fungicide rice blast"
 * @param {number} [limit=5]
 * @returns {Array}
 */
function searchPesticide(query, limit = 5) {
  return searchDomain('pesticides', query, limit);
}

/**
 * Search mandi price records.
 * @param {string} query - e.g. "paddy laxmipur price"
 * @param {number} [limit=5]
 * @returns {Array}
 */
function searchMandi(query, limit = 5) {
  return searchDomain('mandi', query, limit);
}

/**
 * Search FAQ records.
 * @param {string} query
 * @param {number} [limit=5]
 * @returns {Array}
 */
function searchFAQ(query, limit = 5) {
  return searchDomain('faq', query, limit);
}

/**
 * Return all records from a domain (for bulk use).
 * @param {string} domain
 * @returns {Array}
 */
function getAll(domain) {
  return db[domain] || [];
}

/**
 * Return total record count across all domains.
 * @returns {Object}
 */
function getStats() {
  return Object.fromEntries(
    Object.entries(db).map(([k, v]) => [k, v.length])
  );
}

// ── Init: load data immediately when this module is first required ────────────
loadAllData();

module.exports = {
  // Search functions
  searchDisease,
  searchCrop,
  searchScheme,
  searchWeather,
  searchSoil,
  searchFertilizer,
  searchPesticide,
  searchMandi,
  searchFAQ,
  // Utility
  searchDomain,
  getAll,
  getStats
};
