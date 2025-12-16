require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require('mongoose');
const imageRoutes = require("./routes/ImageRoute");
const authRoutes = require("./routes/AuthRoute");
const apiKeyRoutes = require("./routes/ApiKeyRoute");
const billingRoutes = require("./routes/BillingRoute");
// const { removeBackground } = require('@imgly/background-removal-node'); // Optional background removal

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  console.error('Make sure MongoDB is running on localhost:27017');
});

// Handle MongoDB connection events
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/keys", apiKeyRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/images", imageRoutes);
app.use("/uploads/output", express.static("uploads/output"));
app.use("/files", express.static("uploads/output")); // For download URLs

app.get("/", (req, res) => {
  res.json({
    message: "ConversionBird API - Image Format Converter",
    version: "2.0.0",
    endpoints: {
      "GET /api/images/formats": "Get supported image formats (inputs and outputs)",
      "POST /api/images/convert": "Convert image to desired format",
      "GET /uploads/output/:filename": "Download converted image"
    },
    usage: {
      convert: {
        method: "POST",
        url: "/api/images/convert",
        body: "multipart/form-data",
        fields: {
          image: "Image file to convert",
          format: "Output format key (see GET /api/images/formats -> outputs)",
          quality: "Quality 1-100 (optional, default: 90; applies to jpeg/jpg/webp/avif/tiff)"
        }
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
