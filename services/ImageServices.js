const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const archiver = require("archiver");

const SUPPORTED_INPUT_FORMATS = new Set([
  "3fr","arw","avif","bmp","cr2","cr3","crw","dcr","dng","eps","erf","gif","heic","heif","icns","ico","jfif","jpeg","jpg","mos","mrw","nef","odd","odg","orf","pef","png","ppm","ps","psd","pub","raf","raw","rw2","tif","tiff","webp","x3f","xcf","xps","pdf"
]);

const SUPPORTED_OUTPUT_FORMATS = {
  jpeg: { ext: "jpeg", mime: "image/jpeg", encoder: "sharp", sharpMethod: "jpeg" },
  jpg: { ext: "jpg", mime: "image/jpeg", encoder: "sharp", sharpMethod: "jpeg" },
  jfif: { ext: "jfif", mime: "image/jpeg", encoder: "sharp", sharpMethod: "jpeg" },
  png: { ext: "png", mime: "image/png", encoder: "sharp", sharpMethod: "png" },
  webp: { ext: "webp", mime: "image/webp", encoder: "sharp", sharpMethod: "webp" },
  avif: { ext: "avif", mime: "image/avif", encoder: "sharp", sharpMethod: "avif" },
  heif: { ext: "heif", mime: "image/heif", encoder: "sharp", sharpMethod: "heif" },
  heic: { ext: "heic", mime: "image/heic", encoder: "magick" },
  tiff: { ext: "tiff", mime: "image/tiff", encoder: "sharp", sharpMethod: "tiff" },
  tif: { ext: "tif", mime: "image/tiff", encoder: "sharp", sharpMethod: "tiff" },
  bmp: { ext: "bmp", mime: "image/bmp", encoder: "magick" },
  gif: { ext: "gif", mime: "image/gif", encoder: "magick" },
  ico: { ext: "ico", mime: "image/x-icon", encoder: "magick" },
  icns: { ext: "icns", mime: "image/icns", encoder: "magick" },
  ppm: { ext: "ppm", mime: "image/x-portable-pixmap", encoder: "magick" },
  psd: { ext: "psd", mime: "image/vnd.adobe.photoshop", encoder: "magick" },
  ps: { ext: "ps", mime: "application/postscript", encoder: "magick" },
  eps: { ext: "eps", mime: "application/postscript", encoder: "magick" },
  xps: { ext: "xps", mime: "application/vnd.ms-xpsdocument", encoder: "magick" },
  pdf: { ext: "pdf", mime: "application/pdf", encoder: "magick" }
};

const SHARP_OUTPUT_KEYS = Object.entries(SUPPORTED_OUTPUT_FORMATS)
  .filter(([,v]) => v.encoder === "sharp")
  .map(([k]) => k);
const SHARP_OUTPUTS = new Set(SHARP_OUTPUT_KEYS.map(k => SUPPORTED_OUTPUT_FORMATS[k].ext));

const resolveOutput = (fmt) => SUPPORTED_OUTPUT_FORMATS[(fmt || "").toLowerCase()];

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

const MAGICK_QUALITY_FORMATS = new Set(["jpeg","jpg","webp","avif","tiff","tif","heif","heic"]);

let cachedMagickPath = null;
const findMagickPath = () => {
  const envPaths = [process.env.MAGICK_PATH, process.env.MAGICK_CLI].filter(Boolean);
  for (const p of envPaths) {
    if (p && fs.existsSync(p)) return p;
  }
  if (process.platform === "win32") {
    const bases = [process.env["ProgramFiles"], process.env["ProgramFiles(x86)"]].filter(Boolean);
    for (const base of bases) {
      try {
        const dirs = fs.readdirSync(base, { withFileTypes: true });
        for (const d of dirs) {
          if (d.isDirectory() && d.name.toLowerCase().startsWith("imagemagick")) {
            const full = path.join(base, d.name, "magick.exe");
            if (fs.existsSync(full)) return full;
          }
        }
      } catch {}
    }
  }
  return "magick";
};
const resolveMagickPath = () => {
  if (cachedMagickPath && (cachedMagickPath === "magick" || fs.existsSync(cachedMagickPath))) return cachedMagickPath;
  cachedMagickPath = findMagickPath();
  return cachedMagickPath;
};

const magickConvert = (input, output, quality) => new Promise((resolve, reject) => {
  const cmd = resolveMagickPath();
  const args = [input];
  if (typeof quality === "number" && MAGICK_QUALITY_FORMATS.has(path.extname(output).replace(".", "").toLowerCase())) {
    args.push("-quality", String(quality));
  }
  args.push(output);
  execFile(cmd, args, (err, _stdout, stderr) => {
    if (err && err.code === "ENOENT") {
      return reject(new Error("ImageMagick not found. Install and add to PATH or set MAGICK_PATH to magick.exe"));
    }
    if (err) {
      const inputExt = path.extname(input).replace(".", "").toLowerCase();
      const isPostscriptFamily = new Set(["pdf", "ps", "eps"]).has(inputExt);
      const mentionsGhostscript = typeof stderr === "string" && /gswin(32|64)c\.exe|ghostscript/i.test(stderr);
      if (isPostscriptFamily && mentionsGhostscript) {
        return reject(new Error("Ghostscript not found. Install Ghostscript (gswin64c.exe) and ensure it's in PATH for PDF/PS/EPS support."));
      }
      return reject(err);
    }
    return resolve();
  });
});

// Run ImageMagick with custom arguments
const magickProcess = (args) => new Promise((resolve, reject) => {
  const cmd = resolveMagickPath();
  execFile(cmd, args, (err) => {
    if (err && err.code === "ENOENT") {
      return reject(new Error("ImageMagick not found. Install and add to PATH or set MAGICK_PATH to magick.exe"));
    }
    return err ? reject(err) : resolve();
  });
});

// Ghostscript resolution and path helpers for rasterizing PDF/PS/EPS
let cachedGsPath = null;
const findGhostscriptPath = () => {
  const envGs = process.env.GS_PATH || process.env.GHOSTSCRIPT_PATH;
  if (envGs && fs.existsSync(envGs)) return envGs;
  if (process.platform === "win32") {
    const bases = [process.env["ProgramFiles"], process.env["ProgramFiles(x86)"]].filter(Boolean);
    for (const base of bases) {
      try {
        const gsRoot = path.join(base, "gs");
        if (!fs.existsSync(gsRoot)) continue;
        const versions = fs.readdirSync(gsRoot, { withFileTypes: true }).filter(d => d.isDirectory());
        // pick latest by name sort desc
        versions.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: "base" }));
        for (const v of versions) {
          const candidate = path.join(gsRoot, v.name, "bin", "gswin64c.exe");
          if (fs.existsSync(candidate)) return candidate;
        }
      } catch {}
    }
    return "gswin64c.exe";
  }
  return "gs";
};

const resolveGhostscriptPath = () => {
  if (cachedGsPath && (cachedGsPath === "gs" || cachedGsPath.endsWith("gswin64c.exe") || fs.existsSync(cachedGsPath))) return cachedGsPath;
  cachedGsPath = findGhostscriptPath();
  return cachedGsPath;
};

const verifyGhostscriptSupportsPdf = () => new Promise((resolve, reject) => {
  const gs = resolveGhostscriptPath();
  execFile(gs, ["-v"], (err, stdout = "", stderr = "") => {
    if (err && err.code === "ENOENT") {
      return reject(new Error("Ghostscript not found. Install and add to PATH or set GS_PATH to gswin64c.exe"));
    }
    const out = `${stdout}\n${stderr}`;
    // Expect to see PDF or PostScript in the languages line
    const hasPdf = /Languages:\s*.*PDF|Ghostscript/i.test(out) || /GPL Ghostscript/i.test(out);
    const hasPs = /Languages:\s*.*PostScript/i.test(out);
    if (!hasPdf && !hasPs) {
      return reject(new Error("Installed Ghostscript variant does not support PDF/PostScript. Install 'GPL Ghostscript' (not GhostPCL/PDL)."));
    }
    resolve();
  });
});

const rasterizeWithGhostscript = (inputPdfPath, outputPngPath, dpi = 144, firstPage = 1, lastPage = 1) => new Promise((resolve, reject) => {
  const gs = resolveGhostscriptPath();
  // Preflight check to avoid rendering with a PCL-only build that corrupts output
  verifyGhostscriptSupportsPdf().then(() => {
  // We only render the requested page range (defaults to first page)
  const args = [
    "-dSAFER",
    "-dBATCH",
    "-dNOPAUSE",
    `-sDEVICE=png16m`,
    `-dBackgroundColor=16#FFFFFF`,
    `-r${dpi}`,
    `-dFirstPage=${firstPage}`,
    `-dLastPage=${lastPage}`,
    `-sOutputFile=${outputPngPath}`,
    inputPdfPath
  ];
  execFile(gs, args, (err) => {
    if (err && err.code === "ENOENT") {
      return reject(new Error("Ghostscript not found. Install and add to PATH or set GS_PATH to gswin64c.exe"));
    }
    return err ? reject(err) : resolve();
  });
  }).catch(reject);
});

// Rasterize all pages to PNG files with incremented suffix ...-p001.png, ...-p002.png, etc.
const rasterizeAllPagesWithGhostscript = (inputPdfPath, outputPrefixPath, dpi = 144) => new Promise((resolve, reject) => {
  const gs = resolveGhostscriptPath();
  verifyGhostscriptSupportsPdf().then(() => {
    const pattern = `${outputPrefixPath}-p%03d.png`;
    const args = [
      "-dSAFER",
      "-dBATCH",
      "-dNOPAUSE",
      `-sDEVICE=png16m`,
      `-dBackgroundColor=16#FFFFFF`,
      `-r${dpi}`,
      `-sOutputFile=${pattern}`,
      inputPdfPath
    ];
    execFile(gs, args, (err) => {
      if (err && err.code === "ENOENT") {
        return reject(new Error("Ghostscript not found. Install and add to PATH or set GS_PATH to gswin64c.exe"));
      }
      if (err) return reject(err);
      // Collect generated files by scanning directory for the prefix
      const dir = path.dirname(outputPrefixPath);
      const base = path.basename(outputPrefixPath);
      const files = fs.readdirSync(dir)
        .filter(name => name.startsWith(path.basename(`${base}-p`)) && name.endsWith(".png"))
        .map(name => path.join(dir, name))
        .sort();
      resolve(files);
    });
  }).catch(reject);
});

const zipFiles = (filePaths, zipOutputPath) => new Promise((resolve, reject) => {
  const output = fs.createWriteStream(zipOutputPath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  output.on("close", () => resolve());
  archive.on("error", (err) => reject(err));
  archive.pipe(output);
  for (const filePath of filePaths) {
    archive.file(filePath, { name: path.basename(filePath) });
  }
  archive.finalize();
});

// (background removal helpers removed)

const sharpEncode = async (inputSource, outputPath, method, quality, compression, outputExt) => {
  let instance = typeof inputSource === "string" ? sharp(inputSource) : sharp(inputSource);
  switch (method) {
    case "jpeg":
      instance = instance.jpeg({ quality });
      break;
    case "png":
      instance = instance.png();
      break;
    case "webp":
      instance = instance.webp({ quality });
      break;
    case "avif":
      instance = instance.avif({ quality });
      break;
    case "heif":
      if (typeof instance.heif === "function") {
        // Default compression if not provided: HEIC uses HEVC, HEIF defaults to AV1
        const resolvedCompression = (compression || (outputExt === "heic" ? "hevc" : "av1"));
        instance = instance.heif({ quality, compression: resolvedCompression });
      } else {
        throw new Error("heif encoder not available in sharp build");
      }
      break;
    case "tiff":
      instance = instance.tiff({ quality });
      break;
    default:
      throw new Error(`No sharp encoder for method: ${method}`);
  }
  await instance.toFile(outputPath);
};

exports.convertImage = async (inputPath, outputFormat, quality = 90, compression) => {
  const target = resolveOutput(outputFormat);
  if (!target) {
    throw new Error(`Unsupported output format: ${outputFormat}. Supported outputs: ${Object.keys(SUPPORTED_OUTPUT_FORMATS).join(", ")}`);
  }

  const ext = target.ext;
  const outDir = path.join(path.dirname(inputPath).replace("input", "output"));
  ensureDir(outDir);
  const outputFileName = `${Date.now()}-converted.${ext}`;
  const outputPath = path.join(outDir, outputFileName);

  // declare outside try/finally to ensure visibility in finally
  let tempRasterPng = null;
  let tempRasterPages = null;
  try {
    // If input is PDF/PS/EPS, rasterize first page to a temporary PNG using Ghostscript (avoids IM-GS arg issues)
    const detected = (await module.exports.detectImageFormat(inputPath)) || path.extname(inputPath).replace(".", "").toLowerCase();
    const inputExt = String(detected || "").toLowerCase();
    const isPostscriptFamily = new Set(["pdf", "ps", "eps"]).has(inputExt);
    let sourcePath = inputPath;
    if (isPostscriptFamily) {
      const dpi = 144; // Reasonable default; adjust if needed
      // Render all pages
      const prefix = path.join(outDir, `${Date.now()}-pages`);
      tempRasterPages = await rasterizeAllPagesWithGhostscript(inputPath, prefix, dpi);

      if (tempRasterPages && tempRasterPages.length > 1) {
        // Multi-page: convert each to requested format, then zip
        const pageOutputs = [];
        for (let i = 0; i < tempRasterPages.length; i++) {
          const pagePng = tempRasterPages[i];
          const index = String(i + 1).padStart(3, "0");
          const pageOut = path.join(outDir, `${Date.now()}-p${index}.${ext}`);
          if (target.encoder === "sharp") {
            await sharpEncode(pagePng, pageOut, target.sharpMethod, quality, compression, target.ext);
          } else if (target.ext === "ico") {
            try {
              const meta = await sharp(pagePng).metadata();
              const maxSize = 256;
              const needsResize = (meta && ((meta.width || 0) > maxSize || (meta.height || 0) > maxSize));
              if (needsResize) {
                const icoSrc = path.join(outDir, `${Date.now()}-ico-src-p${index}.png`);
                await sharp(pagePng)
                  .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
                  .png()
                  .toFile(icoSrc);
                await magickConvert(icoSrc, pageOut, quality);
                fs.unlink(icoSrc, () => {});
              } else {
                await magickConvert(pagePng, pageOut, quality);
              }
            } catch {
              await magickConvert(pagePng, pageOut, quality);
            }
          } else {
            await magickConvert(pagePng, pageOut, quality);
          }
          pageOutputs.push(pageOut);
        }

        // Zip the outputs
        const zipName = `${Date.now()}-converted.zip`;
        const zipPath = path.join(outDir, zipName);
        await zipFiles(pageOutputs, zipPath);

        // Cleanup individual page outputs
        for (const f of pageOutputs) fs.unlink(f, () => {});

        return {
          outputPath: zipPath,
          outputFileName: zipName,
          format: "zip",
          downloadUrl: `/uploads/output/${zipName}`
        };
      }

      // Single-page: proceed with the single raster PNG as source
      tempRasterPng = (tempRasterPages && tempRasterPages[0]) || path.join(outDir, `${Date.now()}-temp.pdf.png`);
      if (!tempRasterPages || tempRasterPages.length === 0) {
        await rasterizeWithGhostscript(inputPath, tempRasterPng, dpi, 1, 1);
      }
      sourcePath = tempRasterPng;
    }

    if (target.encoder === "sharp") {
      try {
        await sharpEncode(sourcePath, outputPath, target.sharpMethod, quality, compression, target.ext);
      } catch (_) {
        // If source is a PDF/PS/EPS, rasterize with Ghostscript instead of using ImageMagick
        if (isPostscriptFamily && sourcePath === inputPath) {
          const tempRaster = path.join(outDir, `${Date.now()}-temp.pdf.png`);
          const dpi = 144;
          await rasterizeWithGhostscript(inputPath, tempRaster, dpi, 1, 1);
          try {
            await sharpEncode(tempRaster, outputPath, target.sharpMethod, quality, compression, target.ext);
          } finally {
            fs.unlink(tempRaster, () => {});
          }
        } else {
          const tempPng = path.join(outDir, `${Date.now()}-temp.png`);
          await magickConvert(sourcePath, tempPng, 100);
          await sharpEncode(tempPng, outputPath, target.sharpMethod, quality, compression, target.ext);
          fs.unlink(tempPng, () => {});
        }
      }
    } else {
      if (target.ext === "ico") {
        try {
          const meta = await sharp(sourcePath).metadata();
          const maxSize = 256;
          const needsResize = (meta && ((meta.width || 0) > maxSize || (meta.height || 0) > maxSize));
          if (needsResize) {
            const icoSrc = path.join(outDir, `${Date.now()}-ico-src.png`);
            await sharp(sourcePath)
              .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
              .png()
              .toFile(icoSrc);
            await magickConvert(icoSrc, outputPath, quality);
            fs.unlink(icoSrc, () => {});
          } else {
            await magickConvert(sourcePath, outputPath, quality);
          }
        } catch {
          // Fallback: attempt convert directly
          await magickConvert(sourcePath, outputPath, quality);
        }
      } else {
        await magickConvert(sourcePath, outputPath, quality);
      }
    }

    return {
      outputPath,
      outputFileName,
      format: ext,
      downloadUrl: `/uploads/output/${outputFileName}`
    };
  } catch (error) {
    throw new Error(`Conversion failed: ${error.message}`);
  } finally {
    // Cleanup temp rasterized image if created
    try {
      if (typeof tempRasterPng === "string" && tempRasterPng) {
        fs.unlink(tempRasterPng, () => {});
      }
    } catch {}
  }
};

exports.detectImageFormat = async (filePath) => {
  try {
    const metadata = await sharp(filePath).metadata();
    if (metadata && metadata.format) return metadata.format;
  } catch (_) {}
  // Signature sniffing for common container/document formats when extension is missing
  try {
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);
    const sig = buf.toString("utf8");
    if (sig.startsWith("%PDF-")) return "pdf";
    if (sig.startsWith("%!PS")) {
      return sig.includes("EPSF") ? "eps" : "ps";
    }
  } catch {}
  const ext = path.extname(filePath).replace(".", "").toLowerCase();
  return ext || null;
};

exports.getSupportedFormats = () => {
  return {
    inputs: Array.from(SUPPORTED_INPUT_FORMATS).sort(),
    outputs: Object.keys(SUPPORTED_OUTPUT_FORMATS).sort()
  };
};

const parseBoolean = (v, def = false) => {
  if (v === undefined || v === null) return def;
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase();
  return ["1","true","yes","on"].includes(s) ? true : ["0","false","no","off"].includes(s) ? false : def;
};

const parseCsvNumbers = (value) => {
  if (value === undefined || value === null) return [];
  return String(value)
    .split(",")
    .map(s => parseInt(String(s).trim()))
    .filter(n => !isNaN(n));
};

// Build SVG watermark overlay buffer sized to the base image, placing text at a corner
const buildWatermarkSvg = (imageWidth, imageHeight, text, position = "bottom-right", color = "#FFFFFF", opacity = 0.5, fontSize = 24) => {
  const pad = 16;
  let x = pad;
  let y = pad + fontSize;
  if (position.includes("right")) x = imageWidth - pad;
  if (position.includes("bottom")) y = imageHeight - pad;
  const anchor = position.includes("right") ? "end" : "start";
  const dy = position.includes("bottom") ? 0 : 0;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}">
  <text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" fill="${color}" fill-opacity="${opacity}" dominant-baseline="alphabetic">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>
</svg>`;
  return Buffer.from(svg);
};

exports.processImage = async (inputPath, options = {}) => {
  const {
    // Resize
    size, // comma separated: width,height or single value for square
    width,
    height,
    fit = "inside",
    maintainAspect = true,
    // Crop (single field, CSS-like shorthand: 1,2,3,4 values)
    crop,
    cropLeft,
    cropTop,
    cropWidth,
    cropHeight,
    // Rotate
    rotate,
    // Watermark
    watermarkText,
    watermarkPosition = "bottom-right",
    watermarkColor = "#FFFFFF",
    watermarkOpacity = 0.5,
    watermarkFontSize = 24,
    // Output
    outputFormat,
    quality = 90,
    lossless
  } = options;

  const detectedFormat = (await module.exports.detectImageFormat(inputPath)) || path.extname(inputPath).replace(".", "").toLowerCase();
  const desiredFormatKey = outputFormat ? String(outputFormat).toLowerCase() : detectedFormat;
  const target = resolveOutput(desiredFormatKey);
  if (!target) {
    throw new Error(`Unsupported output format: ${outputFormat || desiredFormatKey}. Supported outputs: ${Object.keys(SUPPORTED_OUTPUT_FORMATS).join(", ")}`);
  }

  const ext = target.ext;
  const outDir = path.join(path.dirname(inputPath).replace("input", "output"));
  ensureDir(outDir);
  const outputFileName = `${Date.now()}-processed.${ext}`;
  const outputPath = path.join(outDir, outputFileName);

  let workingPath = inputPath;
  let cleanupFiles = [];

  try {
    // Background removal removed
    // Build sharp pipeline
    let pipeline = sharp(workingPath);

    // Resize
    const sizeVals = parseCsvNumbers(size);
    let resizeWidth = width !== undefined ? parseInt(width) : undefined;
    let resizeHeight = height !== undefined ? parseInt(height) : undefined;
    if (sizeVals.length === 1) {
      resizeWidth = sizeVals[0];
      resizeHeight = sizeVals[0];
    } else if (sizeVals.length >= 2) {
      resizeWidth = sizeVals[0];
      resizeHeight = sizeVals[1];
    }
    if (resizeWidth || resizeHeight) {
      pipeline = pipeline.resize({
        width: resizeWidth || undefined,
        height: resizeHeight || undefined,
        fit: String(fit || "inside"),
        withoutEnlargement: false
      });
    }

    // Crop
    const cropVals = parseCsvNumbers(crop);
    if (cropVals.length > 0) {
      const meta = await pipeline.metadata();
      if (!meta || !meta.width || !meta.height) throw new Error("Unable to read image metadata for cropping");
      let top, right, bottom, left;
      if (cropVals.length === 1) {
        top = right = bottom = left = cropVals[0];
      } else if (cropVals.length === 2) {
        // vertical, horizontal
        top = bottom = cropVals[0];
        left = right = cropVals[1];
      } else if (cropVals.length === 3) {
        // top, horizontal, bottom
        top = cropVals[0];
        left = right = cropVals[1];
        bottom = cropVals[2];
      } else {
        // top, right, bottom, left
        [top, right, bottom, left] = cropVals;
      }
      top = Math.max(0, top || 0);
      right = Math.max(0, right || 0);
      bottom = Math.max(0, bottom || 0);
      left = Math.max(0, left || 0);
      const newWidth = Math.max(1, (meta.width || 0) - left - right);
      const newHeight = Math.max(1, (meta.height || 0) - top - bottom);
      pipeline = pipeline.extract({ left, top, width: newWidth, height: newHeight });
    } else {
      const cw = cropWidth !== undefined ? parseInt(cropWidth) : undefined;
      const ch = cropHeight !== undefined ? parseInt(cropHeight) : undefined;
      const cl = cropLeft !== undefined ? parseInt(cropLeft) : undefined;
      const ct = cropTop !== undefined ? parseInt(cropTop) : undefined;
      if ([cw, ch, cl, ct].every(v => typeof v === "number" && !isNaN(v))) {
        pipeline = pipeline.extract({ left: cl, top: ct, width: cw, height: ch });
      }
    }

    // Rotate
    if (rotate !== undefined) {
      const angle = parseInt(rotate);
      if (![0,90,180,270].includes(angle) && (isNaN(angle) || angle < 0 || angle >= 360)) {
        // If invalid, ignore
      } else {
        pipeline = pipeline.rotate(angle);
      }
    }

    // Prepare intermediate buffer after transforms; apply watermark on the final pixel size to avoid dimension mismatch
    let intermediateBuffer;
    if (watermarkText) {
      const rendered = await pipeline.png().toBuffer({ resolveWithObject: true });
      const baseWidth = rendered.info.width;
      const baseHeight = rendered.info.height;
      const svg = buildWatermarkSvg(baseWidth, baseHeight, String(watermarkText), String(watermarkPosition), String(watermarkColor), Number(watermarkOpacity), parseInt(watermarkFontSize));
      // Ensure overlay is exactly the same size as base to avoid composite dimension errors
      const overlay = await sharp(svg).resize(baseWidth, baseHeight, { fit: "fill" }).png().toBuffer();
      intermediateBuffer = await sharp(rendered.data)
        .composite([{ input: overlay, top: 0, left: 0 }])
        .png()
        .toBuffer();
    } else {
      intermediateBuffer = await pipeline.png().toBuffer();
    }

    // Encoding
    const isLossless = parseBoolean(lossless, false);
    if (target.encoder === "sharp") {
      let enc = sharp(intermediateBuffer);
      switch (target.sharpMethod) {
        case "jpeg":
          enc = enc.jpeg({ quality: parseInt(quality) || 90, mozjpeg: true });
          break;
        case "png":
          enc = enc.png({ compressionLevel: 9, palette: isLossless });
          break;
        case "webp":
          enc = isLossless ? enc.webp({ lossless: true }) : enc.webp({ quality: parseInt(quality) || 90 });
          break;
        case "avif":
          enc = enc.avif({ quality: parseInt(quality) || 90 });
          break;
        case "heif":
          enc = enc.heif({ quality: parseInt(quality) || 90 });
          break;
        case "tiff":
          enc = enc.tiff({ quality: parseInt(quality) || 90, compression: isLossless ? "lzw" : "jpeg" });
          break;
        default:
          throw new Error(`No sharp encoder for method: ${target.sharpMethod}`);
      }
      await enc.toFile(outputPath);
    } else {
      // For magick-encoded outputs, write intermediate PNG to disk first
      const tempPng = path.join(outDir, `${Date.now()}-proc-temp.png`);
      await fs.promises.writeFile(tempPng, intermediateBuffer);
      cleanupFiles.push(tempPng);

      if (target.ext === "ico") {
        try {
          const meta = await sharp(tempPng).metadata();
          const maxSize = 256;
          const needsResize = (meta && ((meta.width || 0) > maxSize || (meta.height || 0) > maxSize));
          if (needsResize) {
            const icoSrc = path.join(outDir, `${Date.now()}-ico-src.png`);
            await sharp(tempPng)
              .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
              .png()
              .toFile(icoSrc);
            cleanupFiles.push(icoSrc);
            await magickConvert(icoSrc, outputPath, parseInt(quality) || 90);
          } else {
            await magickConvert(tempPng, outputPath, parseInt(quality) || 90);
          }
        } catch {
          await magickConvert(tempPng, outputPath, parseInt(quality) || 90);
        }
      } else {
        await magickConvert(tempPng, outputPath, parseInt(quality) || 90);
      }
    }

    return {
      outputPath,
      outputFileName,
      format: ext,
      downloadUrl: `/uploads/output/${outputFileName}`
    };
  } catch (error) {
    throw new Error(`Processing failed: ${error.message}`);
  } finally {
    for (const f of cleanupFiles) fs.unlink(f, () => {});
  }
};