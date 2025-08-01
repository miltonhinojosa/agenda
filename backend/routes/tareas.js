const express = require('express');
const router = express.Router();
const db = require('../db/conexion');

router.get('/', (req, res) => {
  const sql = `SELECT * FROM tareas`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('❌ Error al obtener tareas:', err.message);
      res.status(500).json({ error: 'Error al obtener tareas' });
    } else {
      res.json(rows);
    }
  });
});

module.exports = router;
