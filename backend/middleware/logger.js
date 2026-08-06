/* ==========================================================================
   KrishiMitra AI — Request Logger Middleware
   Logs: timestamp | method | route | status | inference time | errors
   ========================================================================== */

'use strict';

const fs   = require('fs');
const path = require('path');

const LOG_DIR  = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

/**
 * Ensure log directory exists.
 */
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Get current ISO timestamp.
 * @returns {string}
 */
function timestamp() {
  return new Date().toISOString();
}

/**
 * Write a log entry to console and optionally to file.
 * @param {string} level  - 'INFO' | 'WARN' | 'ERROR'
 * @param {string} message
 * @param {Object} [meta] - optional extra data
 */
function writeLog(level, message, meta = {}) {
  const entry = {
    timestamp: timestamp(),
    level,
    message,
    ...meta
  };

  const line = JSON.stringify(entry);

  // Console output (colourised)
  const colours = { INFO: '\x1b[36m', WARN: '\x1b[33m', ERROR: '\x1b[31m', RESET: '\x1b[0m' };
  const colour  = colours[level] || colours.RESET;
  console.log(`${colour}[${entry.timestamp}] [${level}] ${message}${colours.RESET}`, meta);

  // File output
  if (process.env.LOG_TO_FILE !== 'false') {
    try {
      ensureLogDir();
      fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
    } catch (_e) {
      // Silently ignore file-write errors — never crash because of logging
    }
  }
}

// ── Exported logger object ────────────────────────────────────────────────────
const logger = {
  info:  (msg, meta)  => writeLog('INFO',  msg, meta),
  warn:  (msg, meta)  => writeLog('WARN',  msg, meta),
  error: (msg, meta)  => writeLog('ERROR', msg, meta)
};

// ── Express middleware ────────────────────────────────────────────────────────
/**
 * HTTP request logger middleware.
 * Attaches `res.locals.startTime` and logs when the response finishes.
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  res.locals.startTime = start;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level    = res.statusCode >= 500 ? 'ERROR'
                   : res.statusCode >= 400 ? 'WARN'
                   : 'INFO';

    writeLog(level, `${req.method} ${req.originalUrl}`, {
      route:       req.originalUrl,
      method:      req.method,
      status:      res.statusCode,
      durationMs:  duration,
      userAgent:   req.get('user-agent') || 'unknown'
    });
  });

  next();
}

module.exports = { logger, requestLogger };
