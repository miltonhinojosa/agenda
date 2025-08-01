const express = require('express');
const multer = require('multer');
const router = express.Router();
const path = require('path');

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const nombre = Date.now() + ext;
    cb(null, nombre);
  }
});

const upload = multer({ storage });

// Ruta para subir imagen
router.post('/', upload.single('foto'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió archivo' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

module.exports = router;
