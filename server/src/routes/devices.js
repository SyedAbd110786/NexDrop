const express = require("express");
const QRCode = require("qrcode");
const router = express.Router();

// GET /api/devices/qr?data=...
// Generates a QR code image from any string (pairing code, URL, etc.)
router.get("/qr", async (req, res) => {
  const { data } = req.query;
  if (!data) return res.status(400).json({ error: "No data provided" });

  try {
    const qrDataUrl = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
    });
    res.json({ qrCode: qrDataUrl });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

// GET /api/devices/status
router.get("/status", (req, res) => {
  res.json({ status: "ok", message: "NexDrop device API is running" });
});

module.exports = router;
