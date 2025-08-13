const sharp = require("sharp");

exports.pngToJpeg = async (inputPath, outputPath) => {
  await sharp(inputPath)
    .jpeg({ quality: 90 })
    .toFile(outputPath);
};

exports.jpegTopng = async (inputPath, outputPath) => {
    await sharp(inputPath)
    .png({quality: 90})
    .toFile(outputPath);
}