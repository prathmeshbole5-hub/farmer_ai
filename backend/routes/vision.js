'use strict';

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const router  = express.Router();

const visionService = require('../services/visionService');

// ======================================================
// Multer Configuration (Uploads directory)
// ======================================================
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `scan_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ======================================================
// POST /api/vision
// ======================================================
router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image uploaded.'
      });
    }

    const imagePath = req.file.path;

    // Call TensorFlow Model via visionService
    const result = await visionService.analyseImage(imagePath);

    if (!result || !result.success) {
      return res.status(500).json({
        success: false,
        error: result?.error || 'Crop disease prediction failed.'
      });
    }

    // Return exact required JSON format
    return res.json({
      success: true,
      disease: result.disease,
      soil: result.soil,
      confidence: result.confidence,
      probabilities: result.probabilities,
      imagePath: `/uploads/${req.file.filename}`
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;