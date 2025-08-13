const express = require("express");
const multer = require("multer");
const { convertPngToJpeg , convertJpegToPng } = require("../controllers/ImageController");


const router = express.Router();

// Multer upload config
const upload = multer({ dest: "uploads/input/" });

router.post("/png-to-jpeg", upload.single("image"), convertPngToJpeg);
router.post("/jpeg-to-png",upload.single("image"), convertJpegToPng);



module.exports = router;
