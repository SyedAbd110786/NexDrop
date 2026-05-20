const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

const uploadsDir = path.join(__dirname, "../../uploads");

// Multer config — save with unique name, keep original extension
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// POST /api/files/upload
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const fileInfo = {
    fileId: path.parse(req.file.filename).name,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    fileType: req.file.mimetype,
    filePath: req.file.filename,
    uploadedAt: Date.now(),
  };

  console.log(`📤 File uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
  res.json(fileInfo);
});

// GET /api/files/download/:fileId/:fileName
router.get("/download/:fileId/:fileName", (req, res) => {
  const { fileId, fileName } = req.params;
  const ext = path.extname(fileName);
  const filePath = path.join(uploadsDir, `${fileId}${ext}`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error("Download error:", err);
    } else {
      console.log(`📥 File downloaded: ${fileName}`);
      // Delete file after download (optional — saves storage)
      setTimeout(() => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, 60 * 1000); // Delete after 1 minute
    }
  });
});

// GET /api/files/list — list recent uploads (for history)
router.get("/list", (req, res) => {
  const files = fs.readdirSync(uploadsDir).map((filename) => {
    const stats = fs.statSync(path.join(uploadsDir, filename));
    return {
      fileId: path.parse(filename).name,
      filePath: filename,
      fileSize: stats.size,
      uploadedAt: stats.mtimeMs,
    };
  });
  res.json(files);
});

module.exports = router;
