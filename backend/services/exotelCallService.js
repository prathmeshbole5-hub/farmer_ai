/* ==========================================================================
   KrishiMitra AI — Exotel Call Service (Farmer Phone Call Feature)
   Isolated Exotel Telephony Service

   Responsibilities:
   - Reads EXOTEL_ACCOUNT_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_SUBDOMAIN safely.
   - Handles incoming Exotel Webhooks (Passthru applet & Call Status Callbacks).
   - Provides safe diagnostic checks for Exotel readiness.
   - NEVER prints or exposes API credentials in logs or API responses.
   ========================================================================== */

'use strict';

const fetch = require('node-fetch');

/**
 * Check if Exotel credentials are set in environment variables.
 * @returns {{ configured: boolean, accountSid?: string, subdomain?: string, error?: string }}
 */
function getExotelConfig() {
  const accountSid = process.env.EXOTEL_ACCOUNT_SID;
  const apiKey     = process.env.EXOTEL_API_KEY;
  const apiToken   = process.env.EXOTEL_API_TOKEN;
  const subdomain  = process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com';
  const exoPhone   = process.env.EXOPHONE_NUMBER || null;

  const isConfigured = !!(accountSid && apiKey && apiToken);

  return {
    configured: isConfigured,
    accountSid: accountSid ? `${accountSid.substring(0, 4)}...` : null, // masked for safety
    subdomain,
    exoPhone,
    error: isConfigured ? null : 'Exotel credentials (EXOTEL_ACCOUNT_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN) missing in backend .env'
  };
}

/**
 * Parse incoming Exotel webhook payload (GET query or POST body).
 *
 * Exotel Passthru Applet sends:
 * - CallSid
 * - From (Farmer's phone number e.g. 09876543210)
 * - To (ExoPhone number)
 * - CallFrom
 * - CallStatus
 * - RecordingUrl (if audio recorded during call)
 *
 * @param {Object} reqQueryOrBody - req.query or req.body
 * @returns {Object} Normalized webhook data
 */
function parseExotelWebhook(reqQueryOrBody) {
  const data = reqQueryOrBody || {};
  return {
    callSid:      data.CallSid || data.call_sid || null,
    farmerPhone:  data.From || data.CallFrom || data.from || 'Unknown',
    exoPhone:     data.To || data.CallTo || data.to || null,
    callStatus:   data.CallStatus || data.Status || 'in-progress',
    recordingUrl: data.RecordingUrl || data.recording_url || null,
    digits:       data.Digits || data.digits || null,
    eventType:    data.EventType || 'passthru'
  };
}

/**
 * Format a response for Exotel Passthru Applet.
 * Exotel accepts plain text or HTTP 200 JSON with status and message.
 *
 * @param {string} textResponse - Spoken text answer for the farmer
 * @param {string} [audioUrl]   - Optional public audio URL to play over call
 * @returns {Object} Exotel-compatible JSON payload
 */
function formatPassthruResponse(textResponse, audioUrl = null) {
  return {
    select: 'passthru',
    status: 200,
    message: textResponse,
    audioUrl: audioUrl || null,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getExotelConfig,
  parseExotelWebhook,
  formatPassthruResponse
};
