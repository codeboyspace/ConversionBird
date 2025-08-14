const express = require("express");
const multer = require("multer");
const { convertImage, getSupportedFormats } = require("../controllers/ImageController");

const router = express.Router();

const upload = multer({ dest: "uploads/input/" });

router.post("/convert", upload.single("image"), convertImage);

router.get("/formats", getSupportedFormats);

module.exports = router;
