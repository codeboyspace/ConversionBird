const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const imageRoutes = require("./routes/ImageRoute");

const app = express();
const PORT = 3000;

app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api/images", imageRoutes);
app.use("/uploads/output", express.static("uploads/output"));

app.get("/", (req, res) => {
  res.json({
    message: "ConversionBird API - Image Format Converter",
    version: "2.0.0",
    endpoints: {
      "GET /api/images/formats": "Get supported image formats",
      "POST /api/images/convert": "Convert image to desired format",
      "GET /uploads/output/:filename": "Download converted image"
    },
    usage: {
      "convert": {
        method: "POST",
        url: "/api/images/convert",
        body: "multipart/form-data",
        fields: {
          "image": "Image file to convert",
          "format": "Output format (jpeg, jpg, png, webp, bmp, gif, avif)",
          "quality": "Quality (optional, default: 90)"
        }
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
