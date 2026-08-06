/* ==========================================================================
   KrishiMitra AI — Vision Service (Crop Disease Scanner)
   Ready to be connected to:
     - Local Python model (PlantVillage CNN)
     - Gemma 3 multimodal inference
     - Third-party crop disease API
   ========================================================================== */

'use strict';

const path = require('path');
const fs   = require('fs');

/**
 * Analyse a crop image and return disease predictions.
 *
 * Currently returns null (stub). Connect your real model here:
 *   Option A: Call a local Python inference server (e.g. Flask on :5001)
 *   Option B: Use Ollama's multimodal variant with base64 image
 *   Option C: Use a third-party crop disease detection API
 *
 * @param {string} imagePath - absolute path to the uploaded image file
 * @param {string} [cropType] - optional crop type hint (e.g. 'paddy', 'wheat')
 * @returns {Promise<{
 *   success: boolean,
 *   predictions?: Array<{label: string, confidence: number}>,
 *   error?: string
 * }>}
 */
async function analyseImage(imagePath, cropType = '') {
  // ── Validate file exists ──────────────────────────────────────────────────
  if (!imagePath || !fs.existsSync(imagePath)) {
    return { success: false, error: 'Image file not found.' };
  }

  // ── TODO: Replace this stub with real inference ───────────────────────────
  // Example (Python Flask bridge):
  //
  // const FormData = require('form-data');
  // const form = new FormData();
  // form.append('image', fs.createReadStream(imagePath));
  // form.append('crop', cropType);
  // const res = await fetch('http://localhost:5001/predict', { method: 'POST', body: form });
  // const data = await res.json();
  // return { success: true, predictions: data.predictions };

  return {
    success:     false,
    predictions: [],
    error:       'visionService: Real model not yet connected. Using database RAG fallback.'
  };
}

/**
 * Convert an image to base64 string (for multimodal Ollama models).
 * @param {string} imagePath
 * @returns {string}
 */
function imageToBase64(imagePath) {
  const buffer = fs.readFileSync(imagePath);
  return buffer.toString('base64');
}

module.exports = {
  analyseImage,
  imageToBase64
};
