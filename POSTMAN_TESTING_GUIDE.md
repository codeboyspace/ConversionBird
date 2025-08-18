# Postman Testing Guide for ConversionBird API

## Base URL
```
http://localhost:3000
```

## 1. Get API Documentation
GET `/`

Returns API info and endpoints.

---

## 2. Get Supported Formats
GET `/api/images/formats`

Response shape:
```json
{
  "supportedFormats": {
    "inputs": ["3fr", "arw", "avif", "bmp", "cr2", "cr3", "crw", "dcr", "dng", "eps", "erf", "gif", "heic", "heif", "icns", "ico", "jfif", "jpeg", "jpg", "mos", "mrw", "nef", "odd", "odg", "orf", "pef", "png", "ppm", "ps", "psd", "pub", "raf", "raw", "rw2", "tif", "tiff", "webp", "x3f", "xcf", "xps"],
    "outputs": ["avif", "bmp", "eps", "gif", "heic", "heif", "icns", "ico", "jfif", "jpeg", "jpg", "pdf", "png", "ppm", "ps", "psd", "tif", "tiff", "webp", "xps"]
  },
  "message": "Available image formats for conversion"
}
```
Note: Actual outputs include at least: avif, bmp, eps, gif, heic, heif, icns, ico, jfif, jpeg, jpg, png, ppm, ps, psd, tif, tiff, webp, xps (depending on your local ImageMagick build).

---

## 3. Convert Image
POST `/api/images/convert`

Body (form-data):
- image: File (required)
- format: Text (required, one of outputs)
- quality: Text (optional, 1-100; default 90; applies to jpeg/jpg/webp/avif/tiff)
- compression: Text (optional; only for heif/heic. Allowed: `av1`, `hevc`. Defaults: `hevc` for `heic`, `av1` for `heif`)

Examples:
- Convert RAW (CR2) → JPEG: set `format=jpeg`
- Convert HEIC → PNG: set `format=png`
- Convert PSD → WEBP: set `format=webp`
- Convert PNG → AVIF (quality 80): `format=avif`, `quality=80`
 - Convert PNG → HEIF with AV1: `format=heif`, `compression=av1`
 - Convert PNG → HEIC with HEVC: `format=heic`, `compression=hevc`

Success response:
```json
{
  "message": "Conversion successful",
  "inputFormat": "cr2",
  "outputFormat": "jpeg",
  "downloadUrl": "/uploads/output/1703123456789-converted.jpeg",
  "fileName": "1703123456789-converted.jpeg"
}
```

---

## 4. Download Converted Image
GET `/uploads/output/{filename}`

---

## Prerequisites for Extended Formats (Windows)
To enable all conversions via the ImageMagick fallback:
- Install ImageMagick (add to PATH; enable legacy utilities and HDRI if prompted)
- Install Ghostscript (enables PS/EPS/PDF handling)
- Optional: RAW delegates (ImageMagick on Windows typically includes RAW support via libraw)

After installing, restart your terminal/PC so PATH updates take effect.

## Notes
- Some outputs (HEIC/HEIF/AVIF) require Sharp with libvips heif support. If not available, those outputs may fail.
- For formats like EPS/PS/XPS, support depends on Ghostscript and your ImageMagick build.
- Quality parameter affects lossy encoders (jpeg/jpg/webp/avif/tiff).
 - If you see an error mentioning compression for HEIF/HEIC, provide `compression` explicitly or rely on the defaults described above.
