#ConversionBird API

## Base URL
```
http://localhost:3000
```

## 1. Get API Documentation
**GET** `/`

**Description:** Get API information and available endpoints

**Response:**
```json
{
  "message": "ConversionBird API - Image Format Converter",
  "version": "2.0.0",
  "endpoints": {
    "GET /api/images/formats": "Get supported image formats",
    "POST /api/images/convert": "Convert image to desired format",
    "GET /uploads/output/:filename": "Download converted image"
  }
}
```

---

## 2. Get Supported Formats
**GET** `/api/images/formats`

**Description:** Get list of supported image formats

**Response:**
```json
{
  "supportedFormats": ["jpeg", "jpg", "png", "webp", "bmp", "gif", "avif"],
  "message": "Available image formats for conversion"
}
```

---

## 3. Convert Image
**POST** `/api/images/convert`

**Description:** Convert any image to desired format

### Request Setup in Postman:

1. **Method:** POST
2. **URL:** `http://localhost:3000/api/images/convert`
3. **Body:** Select `form-data`
4. **Headers:** Postman will automatically set `Content-Type: multipart/form-data`

### Form Data Fields:

| Key | Type | Value | Required | Description |
|-----|------|-------|----------|-------------|
| `image` | File | Select image file | ✅ Yes | Any image file (PNG, JPEG, WebP, BMP, GIF, AVIF) |
| `format` | Text | jpeg/jpg/png/webp/bmp/gif/avif | ✅ Yes | Target output format |
| `quality` | Text | 1-100 | ❌ No | Quality (default: 90) |

### Example Requests:

#### Convert PNG to JPEG
```
Key: image (File) - Select a PNG file
Key: format (Text) - jpeg
Key: quality (Text) - 90
```

#### Convert JPEG to WebP
```
Key: image (File) - Select a JPEG file
Key: format (Text) - webp
Key: quality (Text) - 85
```

#### Convert WebP to PNG
```
Key: image (File) - Select a WebP file
Key: format (Text) - png
```

#### Convert PNG to AVIF
```
Key: image (File) - Select a PNG file
Key: format (Text) - avif
Key: quality (Text) - 80
```

#### Convert JPEG to GIF
```
Key: image (File) - Select a JPEG file
Key: format (Text) - gif
```

#### Convert PNG to BMP
```
Key: image (File) - Select a PNG file
Key: format (Text) - bmp
```

### Success Response:
```json
{
  "message": "Conversion successful",
  "inputFormat": "png",
  "outputFormat": "jpeg",
  "downloadUrl": "/uploads/output/1703123456789-converted.jpeg",
  "fileName": "1703123456789-converted.jpeg"
}
```

### Error Responses:

#### No file uploaded:
```json
{
  "error": "Please upload an image file",
  "supportedFormats": ["jpeg", "jpg", "png", "webp", "bmp", "gif", "avif"]
}
```

#### No format specified:
```json
{
  "error": "Please specify the output format",
  "supportedFormats": ["jpeg", "jpg", "png", "webp", "bmp", "gif", "avif"]
}
```

#### Invalid quality:
```json
{
  "error": "Quality must be a number between 1 and 100"
}
```

#### Unsupported format:
```json
{
  "error": "Conversion failed: Unsupported output format: tiff. Supported formats: jpeg, jpg, png, webp, bmp, gif, avif"
}
```

---

## 4. Download Converted Image
**GET** `/uploads/output/{filename}`

**Description:** Download the converted image file

**Example:**
```
GET http://localhost:3000/uploads/output/1703123456789-converted.jpeg
```

---

## Step-by-Step Testing in Postman:

### Step 1: Test API Documentation
1. Create a new GET request
2. URL: `http://localhost:3000/`
3. Send request
4. Verify you get the API documentation

### Step 2: Test Supported Formats
1. Create a new GET request
2. URL: `http://localhost:3000/api/images/formats`
3. Send request
4. Verify you get the list of supported formats

### Step 3: Test Image Conversion
1. Create a new POST request
2. URL: `http://localhost:3000/api/images/convert`
3. Go to Body tab
4. Select `form-data`
5. Add the required fields:
   - Key: `image` (Type: File) - Select an image file
   - Key: `format` (Type: Text) - Enter desired format (e.g., "jpeg")
   - Key: `quality` (Type: Text) - Enter quality (e.g., "90")
6. Send request
7. Verify successful conversion response

### Step 4: Test Error Cases
1. **No file:** Send request without image file
2. **No format:** Send request without format parameter
3. **Invalid quality:** Send request with quality > 100
4. **Invalid format:** Send request with unsupported format

### Step 5: Download Converted Image
1. Copy the `downloadUrl` from the conversion response
2. Create a new GET request
3. URL: `http://localhost:3000{downloadUrl}`
4. Send request
5. Verify the image downloads correctly

---

## Test Images
You can use any image files for testing:
- PNG files (.png)
- JPEG files (.jpg, .jpeg)
- WebP files (.webp)
- BMP files (.bmp)
- GIF files (.gif)
- AVIF files (.avif)

## Tips for Testing:
1. **File Size:** Test with different file sizes
2. **Formats:** Test all supported input/output combinations
3. **Quality:** Test different quality values (1-100)
4. **Error Handling:** Test all error scenarios
5. **Download:** Always verify the converted image downloads correctly

## Expected Behavior:
- ✅ Any image format → Any supported output format
- ✅ Automatic format detection
- ✅ Quality control for JPEG, WebP, and AVIF
- ✅ Proper error messages
- ✅ Downloadable converted files
- ✅ Default quality of 90 when not specified
