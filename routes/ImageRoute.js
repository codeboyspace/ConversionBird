const express = require("express");
const multer = require("multer");
const { convertImage, getSupportedFormats, processImage } = require("../controllers/ImageController");

const router = express.Router();

const upload = multer({ dest: "uploads/input/" });

router.post("/convert", upload.single("image"), convertImage);
router.post("/process-image", upload.single("image"), processImage);

router.get("/formats", getSupportedFormats);

module.exports = router;
