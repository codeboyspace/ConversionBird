const sharp = require("sharp");
const path = require("path");

const SUPPORTED_FORMATS = {
  jpeg: { ext: 'jpeg', mime: 'image/jpeg' },
  jpg: { ext: 'jpg', mime: 'image/jpeg' },
  png: { ext: 'png', mime: 'image/png' },
  webp: { ext: 'webp', mime: 'image/webp' },
  bmp: { ext: 'bmp', mime: 'image/bmp' },
  gif: { ext: 'gif', mime: 'image/gif' },
  avif: { ext: 'avif', mime: 'image/avif' },
  heif: { ext: 'heif', mime: 'image/heif' }
};


// The heif conversion will not work as expected.because 
//HEIF is a container, which supports HEVC and AV1 codecs used to create HEIC and AVIF images respectively. The documented default compression for the HEIF container is AV1, which was chosen as it is not patent encumbered and the prebuilt binaries support it.
exports.convertImage = async (inputPath, outputFormat, quality = 90) => {
  try {
    if (!SUPPORTED_FORMATS[outputFormat.toLowerCase()]) {
      throw new Error(`Unsupported output format: ${outputFormat}. Supported formats: ${Object.keys(SUPPORTED_FORMATS).join(', ')}`);
    }

    const format = outputFormat.toLowerCase();
    const outputExt = SUPPORTED_FORMATS[format].ext;

    const inputDir = path.dirname(inputPath);
    const timestamp = Date.now();
    const outputFileName = `${timestamp}-converted.${outputExt}`;
    const outputPath = path.join(inputDir.replace('input', 'output'), outputFileName);

    let sharpInstance = sharp(inputPath);

    switch (format) {
      case 'jpeg':
      case 'jpg':
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
      case 'png':
        sharpInstance = sharpInstance.png();
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality });
        break;
      case 'bmp':
        sharpInstance = sharpInstance.bmp();
        break;
      case 'gif':
        sharpInstance = sharpInstance.gif();
        break;
      case 'avif':
        sharpInstance = sharpInstance.avif({ quality });
        break;
      case 'heif':
        sharpInstance = sharpInstance.heif({ quality });
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    await sharpInstance.toFile(outputPath);

    return {
      outputPath,
      outputFileName,
      format: outputExt,
      downloadUrl: `/uploads/output/${outputFileName}`
    };
  } catch (error) {
    throw new Error(`Conversion failed: ${error.message}`);
  }
};

exports.detectImageFormat = async (filePath) => {
  try {
    const metadata = await sharp(filePath).metadata();
    return metadata.format;
  } catch (error) {
    throw new Error(`Failed to detect image format: ${error.message}`);
  }
};

exports.getSupportedFormats = () => {
  return Object.keys(SUPPORTED_FORMATS);
};