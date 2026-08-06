/* ==========================================================================
   KrishiMitra AI — Schemes Route
   POST /api/schemes
   ========================================================================== */

'use strict';

const express = require('express');
const router  = express.Router();

const db     = require('../services/databaseService');
const rag    = require('../services/ragService');
const ollama = require('../services/ollamaService');

/**
 * POST /api/schemes
 *
 * Body:
 *   { query?: string, language?: string, state?: string, useAI?: boolean }
 *
 * Response:
 *   { success, schemes, summary, total, source }
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      query    = 'government scheme farmer subsidy',
      language = 'en',
      state    = '',
      useAI    = false
    } = req.body;

    const searchQuery = [query, state].filter(Boolean).join(' ');
    const schemes     = db.searchScheme(searchQuery, 6);

    // ── Optional AI summary ───────────────────────────────────────────────────
    let summary     = null;
    let aiSource    = 'rag';
    let ollamaError = null;

    if (useAI && schemes.length > 0) {
      const { context } = await rag.retrieveContext(
        `Explain government schemes for farmers: ${query}`,
        { language }
      );
      const prompt = rag.buildPrompt(
        `Summarise the most important government schemes for a farmer. Query: ${query}`,
        context
      );
      const result = await ollama.askGemma(prompt);

      if (result.success) {
        summary  = result.response;
        aiSource = 'gemma3';
      } else {
        ollamaError = result.error;
        aiSource    = 'rag';
      }
    }

    return res.json({
      success: true,
      schemes: schemes.map(s => ({
        id:          s.id,
        title:       s.title,
        description: s.description,
        eligibility: s.metadata?.eligibility || null,
        benefit:     s.metadata?.benefit     || null,
        deadline:    s.metadata?.deadline    || null,
        applyAt:     s.metadata?.applyAt     || null,
        category:    s.metadata?.category    || null
      })),
      total:   schemes.length,
      summary: summary || null,
      source:  aiSource,
      ...(ollamaError && { ollamaError })
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
