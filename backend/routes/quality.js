'use strict';

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();

const qualityService = require('../services/qualityService');

// ======================================================
// Multer Configuration for Quality Uploads
// ======================================================
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `quality_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`);
  }
});

const fileFilter = (_req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and WEBP images are supported.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter
});

// ======================================================
// POST /api/quality
// ======================================================
router.post('/', upload.single('image'), async (req, res, next) => {
  let uploadedFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image uploaded. Please upload a valid produce photo (JPG, PNG, or WEBP).'
      });
    }

    uploadedFilePath = req.file.path;

    // Execute MobileNetV2 inference via qualityService
    const result = await qualityService.gradeProduceQuality(uploadedFilePath);

    if (!result || !result.success) {
      return res.status(500).json({
        success: false,
        error: result?.error || 'Produce quality grading failed.'
      });
    }

    // Return standardized response without exposing internal server paths
    return res.status(200).json({
      success: true,
      quality: result.quality,
      class_id: result.class_id,
      confidence: result.confidence,
      probabilities: result.probabilities
    });

  } catch (err) {
    return next(err);
  } finally {
    // Clean up temporary uploaded file
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      fs.unlink(uploadedFilePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('[Quality Route] Failed to delete temp upload:', unlinkErr.message);
        }
      });
    }
  }
});

module.exports = router;
