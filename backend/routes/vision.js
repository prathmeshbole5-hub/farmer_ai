/* ==========================================================================
   KrishiMitra AI — Vision Route (Crop Disease Scanner)
   POST /api/vision
   Accepts: multipart/form-data with field "image"
   ========================================================================== */

'use strict';

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const router  = express.Router();

const db      = require('../services/databaseService');
const ollama  = require('../services/ollamaService');

// ── Multer config — save uploaded images to uploads/ ─────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname) || '.jpg';
    const name = `scan_${Date.now()}${ext}`;
    cb(null, name);
  }
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WEBP, and GIF images are accepted.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB max
});

/**
 * POST /api/vision
 *
 * Body: multipart/form-data
 *   - image (file)  — required: crop/leaf image
 *   - cropType (string) — optional: hint e.g. "paddy", "wheat"
 *   - language (string) — optional: 'en' | 'hi' | ...
 *
 * Response:
 *   { success, scanId, diseases, recommendation, source }
 */
router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const cropType = req.body?.cropType || 'unknown';
    const language = req.body?.language || 'en';
    const scanId   = `scan_${Date.now()}`;

    // ── Mock disease detection (until real CV model is plugged in) ───────────
    const query    = `${cropType} disease leaf`.trim();
    const diseases = db.searchDisease(query, 3);

    // Pick the top disease as the primary detection
    const primary = diseases[0] || null;

    return res.json({
      success:  true,
      scanId,
      imagePath: req.file ? `/uploads/${req.file.filename}` : null,
      cropType,
      language,
      detection: primary
        ? {
            diseaseId:         primary.id,
            title:             primary.title,
            description:       primary.description,
            confidence:        primary.metadata?.confidence || '–',
            severity:          primary.metadata?.severity  || '–',
            organicTreatment:  primary.metadata?.organicTreatment  || null,
            chemicalTreatment: primary.metadata?.chemicalTreatment || null,
            preventiveMeasures:primary.metadata?.preventiveMeasures || null
          }
        : null,
      relatedDiseases: diseases.slice(1).map(d => ({
        id:    d.id,
        title: d.title,
        severity: d.metadata?.severity
      })),
      source: 'mock-rag',
      note:   'Real computer-vision model (visionService) is ready to be plugged in.'
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
