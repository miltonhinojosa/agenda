// backend/routes/upload.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// Config Multer (guarda en /backend/uploads)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const name = `u_${Date.now()}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

// POST /api/upload  -> { url: "/uploads/archivo.jpg" }
router.post("/", upload.single("foto"), (req, res) => {
  if (!req.file) return res.status(400).json({ mensaje: "No se recibió archivo" });
  // ruta pública para servir el archivo
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

module.exports = router;
