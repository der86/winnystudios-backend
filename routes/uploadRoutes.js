// routes/upload.js
import express from "express";
import upload from "../middleware/upload.js";

const router = express.Router();

// ✅ Single file upload
router.post("/", upload.single("image"), (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded" });
    }

    res.json({
      success: true,
      url: req.file.path, // ✅ Cloudinary URL
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ success: false, error: "Upload failed" });
  }
});

export default router;
