const path = require("path");
const { convertImage, detectImageFormat, getSupportedFormats, processImage } = require("../services/ImageServices");

exports.convertImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: "Please upload an image file",
        supportedFormats: getSupportedFormats()
      });
    }

    const { format, quality, compression } = req.body;
    
    if (!format) {
      return res.status(400).json({ 
        error: "Please specify the output format",
        supportedFormats: getSupportedFormats()
      });
    }

    let qualityValue = 90;
    if (quality !== undefined) {
      qualityValue = parseInt(quality);
      if (isNaN(qualityValue) || qualityValue < 1 || qualityValue > 100) {
        return res.status(400).json({ 
          error: "Quality must be a number between 1 and 100"
        });
      }
    }

    const inputPath = req.file.path;
    
    const inputFormat = await detectImageFormat(inputPath);
    
    let resolvedCompression = compression;
    if (format && ["heif", "heic"].includes(String(format).toLowerCase())) {
      const allowed = new Set(["av1", "hevc"]);
      if (resolvedCompression && !allowed.has(String(resolvedCompression).toLowerCase())) {
        return res.status(400).json({ 
          error: "Expected one of: av1, hevc for compression",
          hint: "Use compression=av1 for .heif or compression=hevc for .heic"
        });
      }
      if (!resolvedCompression) {
        resolvedCompression = String(format).toLowerCase() === "heic" ? "hevc" : "av1";
      }
    }

    const result = await convertImage(inputPath, format, qualityValue, resolvedCompression);

    // Get file sizes
    const fs = require('fs');
    const originalSize = fs.statSync(inputPath).size;
    const convertedSize = fs.existsSync(result.outputPath) ? fs.statSync(result.outputPath).size : 0;

    res.json({
      downloadUrl: result.downloadUrl,
      formatFrom: inputFormat,
      formatTo: format,
      originalSize,
      convertedSize
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSupportedFormats = async (req, res) => {
  try {
    const formats = getSupportedFormats();
    res.json({
      supportedFormats: formats,
      message: "Available image formats for conversion"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.processImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload an image file" });
    }

    const options = {
      size: req.body.size,
      width: req.body.width,
      height: req.body.height,
      fit: req.body.fit,
      maintainAspect: req.body.maintainAspect,
      crop: req.body.crop,
      cropLeft: req.body.cropLeft,
      cropTop: req.body.cropTop,
      cropWidth: req.body.cropWidth,
      cropHeight: req.body.cropHeight,
      rotate: req.body.rotate,
      watermarkText: req.body.watermarkText,
      watermarkPosition: req.body.watermarkPosition,
      watermarkColor: req.body.watermarkColor,
      watermarkOpacity: req.body.watermarkOpacity,
      watermarkFontSize: req.body.watermarkFontSize,
      outputFormat: req.body.outputFormat,
      quality: req.body.quality,
      lossless: req.body.lossless
    };

    const result = await processImage(req.file.path, options);

    // Get file sizes
    const fs = require('fs');
    const originalSize = fs.statSync(req.file.path).size;
    const convertedSize = fs.existsSync(result.outputPath) ? fs.statSync(result.outputPath).size : 0;

    res.json({
      downloadUrl: result.downloadUrl,
      formatFrom: await require('../services/ImageServices').detectImageFormat(req.file.path),
      formatTo: result.format,
      originalSize,
      convertedSize
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};