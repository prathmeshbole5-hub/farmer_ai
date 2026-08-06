/* ==========================================================================
   KrishiMitra AI — Backend Server (Ollama + Gemma 3)
   Runs on: http://localhost:5000
   ========================================================================== */

'use strict';

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');

const { requestLogger } = require('./middleware/logger');
const { errorHandler }  = require('./middleware/errorHandler');

// ── Routes ──────────────────────────────────────────────────────────────────
const chatRoutes    = require('./routes/chat');
const visionRoutes  = require('./routes/vision');
const weatherRoutes = require('./routes/weather');
const schemesRoutes = require('./routes/schemes');

// ── App Setup ────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 5000;

// ── Ensure runtime directories exist ─────────────────────────────────────────
const runtimeDirs = ['uploads', 'logs', 'cache'].map(d =>
  path.join(__dirname, d)
);
runtimeDirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// ── Static: serve uploads folder ────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Static: serve the entire KrishiMitra AI frontend ─────────────────────────
// The frontend lives one level up from backend/
const FRONTEND_ROOT = path.join(__dirname, '..');
app.use(express.static(FRONTEND_ROOT, {
  // Don't serve hidden files or node_modules
  dotfiles: 'ignore'
}));


// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'running',
    version: '1.0.0',
    model: process.env.OLLAMA_MODEL || 'gemma3',
    ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    timestamp: new Date().toISOString()
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/chat',    chatRoutes);
app.use('/api/vision',  visionRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/schemes', schemesRoutes);

// ── Frontend fallback: serve index.html for root ─────────────────────────────
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ── 404 handler (only for /api/* routes) ─────────────────────────────────────
app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, error: 'API route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║      KrishiMitra AI — Backend Server             ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  🌐 App      : http://localhost:${PORT}                ║`);
  console.log(`║  🔧 API      : http://localhost:${PORT}/api/health     ║`);
  console.log(`║  🤖 Ollama   : ${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}      ║`);
  console.log(`║  🌱 Model    : ${process.env.OLLAMA_MODEL || 'gemma3'}                      ║`);
  console.log(`║  ⚙️  Mode     : ${process.env.NODE_ENV || 'development'}                 ║`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Open your browser → http://localhost:${PORT}`);
  console.log('');
});

module.exports = app;
