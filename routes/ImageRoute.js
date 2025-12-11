const express = require("express");
const multer = require("multer");
const { convertImage, getSupportedFormats, processImage } = require("../controllers/ImageController");
const { authenticateApiKey } = require("../middleware/apiKeyAuth");
const { enforcePlanLimits } = require("../middleware/enforcePlan");
const { log, incrementUserConversions } = require("../services/UsageService");
const fs = require("fs");

const router = express.Router();

const upload = multer({ dest: "uploads/input/" });

// Middleware stack for protected routes
const conversionMiddleware = [authenticateApiKey, enforcePlanLimits];

// Wrapper to add usage logging
const withUsageLogging = (controller) => async (req, res) => {
  const originalJson = res.json;
  res.json = function(data) {
    // Log usage after successful conversion
    if (data.downloadUrl && req.user && req.apiKey) {
      try {
        const inputPath = req.file.path;
        const outputPath = data.downloadUrl.replace('/uploads/output/', 'uploads/output/');
        const bytesIn = fs.statSync(inputPath).size;
        const bytesOut = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;

        log({
          userId: req.user._id,
          apiKeyId: req.apiKey._id,
          formatFrom: data.formatFrom || data.inputFormat,
          formatTo: data.formatTo || data.outputFormat,
          bytesIn,
          bytesOut,
          status: 'success'
        });

        incrementUserConversions(req.user._id);
      } catch (error) {
        console.error('Usage logging error:', error);
      }
    }

    originalJson.call(this, data);
  };

  await controller(req, res);
};

router.post("/convert", conversionMiddleware, upload.single("image"), withUsageLogging(convertImage));
router.post("/process-image", conversionMiddleware, upload.single("image"), withUsageLogging(processImage));

router.get("/formats", getSupportedFormats);

module.exports = router;
