const express = require('express');
const router  = express.Router();
const https   = require('https');
const { logger } = require('../middleware/logger');
const ollama  = require('../services/ollamaService');

// POST /api/gemini/generateContent
router.post('/generateContent', async (req, res, next) => {
  try {
    const { model = 'gemini-2.5-flash', contents, tools } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('[GEMINI PROXY] GEMINI_API_KEY is missing. Falling back to Ollama.');
      return await handleOllamaFallback(contents, res);
    }
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const requestData = JSON.stringify({ contents, tools });
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      },
      timeout: 30000 // 30s timeout
    };
    
    const proxyReq = https.request(options, (proxyRes) => {
      let responseBody = '';
      
      proxyRes.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      proxyRes.on('end', async () => {
        const statusCode = proxyRes.statusCode;
        if (statusCode !== 200) {
          logger.error(`[GEMINI PROXY] Gemini API returned error status ${statusCode}. Response: ${responseBody}`);
          logger.info('[GEMINI PROXY] Attempting Ollama fallback...');
          return await handleOllamaFallback(contents, res);
        }
        
        try {
          const parsed = JSON.parse(responseBody);
          res.status(statusCode).json(parsed);
        } catch (e) {
          logger.error('[GEMINI PROXY] Failed to parse Gemini response JSON:', responseBody);
          return await handleOllamaFallback(contents, res);
        }
      });
    });
    
    proxyReq.on('error', async (err) => {
      logger.error('[GEMINI PROXY] Request to Gemini API failed:', err.message);
      logger.info('[GEMINI PROXY] Attempting Ollama fallback due to connection error...');
      return await handleOllamaFallback(contents, res);
    });
    
    proxyReq.on('timeout', async () => {
      proxyReq.destroy();
      logger.error('[GEMINI PROXY] Gemini API request timed out.');
      logger.info('[GEMINI PROXY] Attempting Ollama fallback due to timeout...');
      return await handleOllamaFallback(contents, res);
    });
    
    proxyReq.write(requestData);
    proxyReq.end();
    
  } catch (err) {
    next(err);
  }
});

// Helper function to map contents back to a prompt and call Ollama (Gemma 3)
async function handleOllamaFallback(contents, res) {
  try {
    let promptText = '';
    if (contents && contents[0] && contents[0].parts && contents[0].parts[0]) {
      promptText = contents[0].parts[0].text;
    }
    
    if (!promptText) {
      return res.status(400).json({
        error: { message: "No prompt text found for fallback" }
      });
    }
    
    logger.info(`[GEMINI PROXY FALLBACK] Calling Ollama for prompt: "${promptText.substring(0, 60)}..."`);
    const ollamaResult = await ollama.askGemma(promptText);
    
    if (ollamaResult.success) {
      const geminiFormatResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: ollamaResult.response
                }
              ],
              role: "model"
            },
            finishReason: "STOP",
            index: 0
          }
        ],
        usageMetadata: {
          promptTokenCount: 0,
          candidatesTokenCount: 0,
          totalTokenCount: 0
        },
        modelVersion: ollamaResult.model || "gemma3"
      };
      
      return res.json(geminiFormatResponse);
    } else {
      logger.error('[GEMINI PROXY FALLBACK] Ollama fallback failed:', ollamaResult.error);
      return res.status(503).json({
        error: {
          message: `Both Gemini and Ollama are offline. Ollama error: ${ollamaResult.error}`
        }
      });
    }
  } catch (e) {
    logger.error('[GEMINI PROXY FALLBACK] Unexpected error during fallback:', e.message);
    return res.status(500).json({
      error: { message: "Unexpected error during fallback to Ollama" }
    });
  }
}

module.exports = router;
