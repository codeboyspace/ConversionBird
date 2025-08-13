const path = require("path");
const { pngToJpeg, jpegTopng } = require("../services/ImageServices");

//png to jpeg
exports.convertPngToJpeg = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a PNG file" });
    }

    const inputPath = req.file.path;
    const outputFileName = `${Date.now()}-converted.jpeg`;
    const outputPath = path.join("uploads/output", outputFileName);

    await pngToJpeg(inputPath, outputPath);

    res.json({
      message: "Conversion successful",
      downloadUrl: `/uploads/output/${outputFileName}`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//jpeg to png
exports.convertJpegToPng = async (req, res) => {
  try {
    if (!req.fil) {
      return res.status(400).json({ error: "Please upload a Jpeg file" });
    }

    const inputPath = req.file.path;
    const outputFileName = `${Date.now()}-converted.png`;
    const outputPath = path.join("uploads/output", outputFileName);

    await jpegTopng(inputPath, outputPath);

    res.json({
      message: "Conversion successful",
      downloadUrl: `/uploads/output/${outputFileName}`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
