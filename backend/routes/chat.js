/* ==========================================================================
   KrishiMitra AI — Chat Route
   POST /api/chat
   Workflow: User Message → RAG → Gemma 3 → JSON response
   ========================================================================== */

'use strict';

const express = require('express');
const router  = express.Router();

const { logger }                          = require('../middleware/logger');
const rag                                 = require('../services/ragService');
const { askGemma, buildFullPrompt }       = require('../services/ollamaService');

/**
 * POST /api/chat
 *
 * Body:
 * {
 *   message   : string              // farmer's question (required)
 *   language  : string              // 'en' | 'hi' | 'gu' | 'mr' | 'pa' (default: 'en')
 *   history   : Array               // conversation history [{role,content},...] (optional)
 *   context   : string              // extra RAG context string (optional)
 * }
 *
 * Success response:
 * {
 *   success    : true,
 *   reply      : string,            // Gemma's response
 *   source     : 'gemma3',
 *   model      : string,
 *   inferenceMs: number,
 *   domains    : string[],
 *   docCount   : number
 * }
 *
 * Error response:
 * {
 *   success    : false,
 *   error      : string,            // technical error
 *   userError  : string,            // user-friendly message
 *   errorCode  : string
 * }
 */
router.post('/', async (req, res, next) => {
  const requestStart = Date.now();

  try {
    const {
      message,
      language = 'en',
      history  = [],
      context  = ''
    } = req.body;

    // ── Validation ─────────────────────────────────────────────────────────
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success:   false,
        error:     'message is required and must be a non-empty string.',
        userError: 'Please type a question before sending.',
        errorCode: 'MISSING_MESSAGE'
      });
    }

    const trimmedMessage = message.trim();

    // ── Step 1: RAG retrieval ───────────────────────────────────────────────
    logger.info(`[CHAT] Incoming: "${trimmedMessage.substring(0, 80)}"`, {
      language,
      historyLength: history.length
    });

    const ragResult = await rag.retrieveContext(trimmedMessage, { language });

    // Merge any extra context passed from the frontend
    const fullRagContext = [ragResult.context, context].filter(Boolean).join('\n\n');

    // ── Step 2: Sanitise history (keep last 5 turns) ────────────────────────
    const sanitisedHistory = Array.isArray(history)
      ? history
          .filter(h => h && typeof h.role === 'string' && typeof h.content === 'string')
          .slice(-5)            // keep last 5 exchanges (10 messages max)
      : [];

    // ── Step 3: Build full prompt ───────────────────────────────────────────
    const fullPrompt = buildFullPrompt(
      trimmedMessage,
      sanitisedHistory,
      fullRagContext,
      language
    );

    // ── Step 4: Call Gemma ──────────────────────────────────────────────────
    const gemmaResult = await askGemma(fullPrompt);

    const totalMs = Date.now() - requestStart;

    // ── Step 5: Handle Gemma errors ─────────────────────────────────────────
    if (!gemmaResult.success) {
      logger.warn(`[CHAT] Gemma failed: ${gemmaResult.errorCode}`, {
        error:       gemmaResult.error,
        inferenceMs: gemmaResult.inferenceMs,
        totalMs
      });

      // Map error codes to user-friendly messages
      const userErrors = {
        OLLAMA_NOT_RUNNING: 'Offline AI is unavailable. Please start Ollama.',
        MODEL_NOT_FOUND:    'Offline AI is unavailable. Please start Ollama.',
        TIMEOUT:            'KrishiMitra AI is taking too long. Please try again.',
        EMPTY_RESPONSE:     'KrishiMitra AI did not respond. Please try again.',
        EMPTY_PROMPT:       'Please type a question before sending.'
      };

      return res.status(503).json({
        success:   false,
        error:     gemmaResult.error,
        userError: userErrors[gemmaResult.errorCode] || 'Backend server is not running.',
        errorCode: gemmaResult.errorCode
      });
    }

    // ── Step 6: Success ─────────────────────────────────────────────────────
    logger.info(`[CHAT] Gemma responded in ${gemmaResult.inferenceMs}ms`, {
      model:      gemmaResult.model,
      domains:    ragResult.domains,
      docCount:   ragResult.docCount,
      totalMs
    });

    return res.json({
      success:     true,
      reply:       gemmaResult.response,
      source:      'gemma3',
      model:       gemmaResult.model,
      inferenceMs: gemmaResult.inferenceMs,
      totalMs,
      domains:     ragResult.domains,
      docCount:    ragResult.docCount,
      keywords:    ragResult.keywords
    });

  } catch (err) {
    logger.error(`[CHAT] Unhandled error`, { message: err.message, totalMs: Date.now() - requestStart });
    next(err);
  }
});

module.exports = router;
