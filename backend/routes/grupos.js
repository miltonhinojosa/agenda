const express = require('express');
const ruta = express.Router();
const db = require('../db/conexion');

ruta.get('/', (req, res) => {
  const sql = `SELECT id, nombre FROM grupos_contacto`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('❌ Error al obtener grupos:', err.message);
      return res.status(500).json({ error: 'Error al obtener grupos' });
    }
    res.json(rows);
  });
});

module.exports = ruta;
