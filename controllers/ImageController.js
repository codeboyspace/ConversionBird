const path = require("path");
const { convertImage, detectImageFormat, getSupportedFormats } = require("../services/ImageServices");

exports.convertImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: "Please upload an image file",
        supportedFormats: getSupportedFormats()
      });
    }

    const { format, quality } = req.body;
    
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
    
    const result = await convertImage(inputPath, format, qualityValue);

    res.json({
      message: "Conversion successful",
      inputFormat: inputFormat,
      outputFormat: format,
      downloadUrl: result.downloadUrl,
      fileName: result.outputFileName
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