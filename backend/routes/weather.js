/* ==========================================================================
   KrishiMitra AI — Weather Route
   POST /api/weather
   ========================================================================== */

'use strict';

const express = require('express');
const router  = express.Router();

const db = require('../services/databaseService');
const rag    = require('../services/ragService');
const ollama = require('../services/ollamaService');

/**
 * POST /api/weather
 *
 * Body:
 *   { location?: string, language?: string, useAI?: boolean }
 *
 * Response:
 *   { success, location, weatherData, advisory, source }
 */
router.post('/', async (req, res, next) => {
  try {
    const { location = 'Kishanpur, UP', language = 'en', useAI = false } = req.body;

    const query       = `${location} weather rain monsoon`.trim();
    const weatherDocs = db.searchWeather(query, 3);

    // ── Build AI advisory if requested ───────────────────────────────────────
    let advisory    = null;
    let aiSource    = 'mock';
    let ollamaError = null;

    if (useAI) {
      const { context } = await rag.retrieveContext(
        `Weather advisory for ${location}`,
        { language }
      );
      const prompt = rag.buildPrompt(
        `What is the weather advisory for farmers in ${location}?`,
        context
      );
      const result = await ollama.askGemma(prompt);

      if (result.success) {
        advisory = result.response;
        aiSource = 'gemma3';
      } else {
        ollamaError = result.error;
        aiSource    = 'mock';
      }
    }

    // ── Mock weather data (realistic structure for frontend consumption) ─────
    const mockWeather = {
      location,
      today: {
        condition:   'Light Rain',
        tempC:       28,
        humidity:    '82%',
        windKmh:     14,
        rainChance:  '80%',
        uvIndex:     3,
        emoji:       '🌧'
      },
      forecast: [
        { day: 'Tomorrow',  condition: 'Heavy Rain',  tempC: 26, rainChance: '90%', emoji: '⛈' },
        { day: 'Day After', condition: 'Partly Cloudy', tempC: 29, rainChance: '40%', emoji: '⛅' },
        { day: '+3 Days',   condition: 'Sunny',       tempC: 32, rainChance: '10%', emoji: '☀️' }
      ],
      advisory: advisory || 'Heavy rain expected tomorrow. Do not spray pesticides today. Drain waterlogged fields.',
      source:   aiSource,
      dbRecords: weatherDocs.length,
      ...(ollamaError && { ollamaError })
    };

    return res.json({
      success:  true,
      weather:  mockWeather,
      source:   aiSource,
      note:     'Connect to a real weather API (OpenWeatherMap) to replace mock data.'
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
