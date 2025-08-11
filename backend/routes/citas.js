// routes/citas.js — CRUD + filtro por estado + validación fecha/hora + cambio de estado
const express = require('express');
const ruta = express.Router();
const db = require('../db/conexion');

// Helper: validar fecha/hora futuras
const esFuturo = (f, h) => {
  if (!f || !h) return false;
  const ms = new Date(`${f}T${h}:00`).getTime();
  return Number.isFinite(ms) && ms >= Date.now();
};

// GET /api/citas?estado=Pendiente,Activo  (si no se manda, devuelve todas)
ruta.get('/', (req, res) => {
  const { estado } = req.query;
  let sql = `SELECT * FROM citas`;
  let params = [];

  if (estado) {
    const estados = estado.split(',').map(s => s.trim()).filter(Boolean);
    if (estados.length > 0) {
      sql += ` WHERE estado IN (${estados.map(() => '?').join(',')})`;
      params = estados;
    }
  }

  sql += ` ORDER BY fecha ASC, hora ASC`;

  db.all(sql, params, (err, filas) => {
    if (err) {
      console.error('❌ Error al obtener citas:', err.message);
      return res.status(500).json({ error: 'Error al obtener citas' });
    }
    res.json(filas);
  });
});

// POST /api/citas (crear)
ruta.post('/', (req, res) => {
  const {
    contacto_id, fecha, hora, descripcion, lugar, tipo,
    aviso_anticipado_min = 0, recordatorio_cada_min = 0, estado = 'Pendiente'
  } = req.body;

  if (!esFuturo(fecha, hora)) {
    return res.status(400).json({ error: 'La fecha y hora no pueden ser anteriores al momento actual.' });
  }

  const sql = `
    INSERT INTO citas (
      contacto_id, fecha, hora, descripcion, lugar, tipo,
      aviso_anticipado_min, recordatorio_cada_min, estado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const valores = [
    contacto_id || null,
    fecha, hora,
    descripcion || null,
    lugar || null,
    tipo || null,
    Number.isFinite(+aviso_anticipado_min) ? +aviso_anticipado_min : 0,
    Number.isFinite(+recordatorio_cada_min) ? +recordatorio_cada_min : 0,
    estado || 'Pendiente'
  ];

  db.run(sql, valores, function (err) {
    if (err) {
      console.error('❌ Error al crear cita:', err.message);
      return res.status(500).json({ error: 'Error al crear cita' });
    }
    res.status(201).json({ mensaje: 'Cita creada', id: this.lastID });
  });
});

// PUT /api/citas/:id (actualizar + fuerza estado=Pendiente)
ruta.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    contacto_id, fecha, hora, descripcion, lugar, tipo,
    aviso_anticipado_min = 0, recordatorio_cada_min = 0
  } = req.body;

  if (!esFuturo(fecha, hora)) {
    return res.status(400).json({ error: 'La fecha y hora no pueden ser anteriores al momento actual.' });
  }

  const estado = 'Pendiente';

  const sql = `
    UPDATE citas
    SET contacto_id = ?, fecha = ?, hora = ?, descripcion = ?, lugar = ?, tipo = ?,
        aviso_anticipado_min = ?, recordatorio_cada_min = ?, estado = ?
    WHERE id = ?
  `;
  const valores = [
    contacto_id || null,
    fecha, hora,
    descripcion || null,
    lugar || null,
    tipo || null,
    Number.isFinite(+aviso_anticipado_min) ? +aviso_anticipado_min : 0,
    Number.isFinite(+recordatorio_cada_min) ? +recordatorio_cada_min : 0,
    estado,
    id
  ];

  db.run(sql, valores, function (err) {
    if (err) {
      console.error('❌ Error al actualizar cita:', err.message);
      return res.status(500).json({ error: 'Error al actualizar cita' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    res.json({ mensaje: 'Cita actualizada', id });
  });
});

// PATCH /api/citas/:id/estado  { estado: 'Activo'|'Archivado'|'Cancelado'|'Pendiente' }
ruta.patch('/:id/estado', (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  const permitidos = ['Pendiente', 'Activo', 'Archivado', 'Cancelado'];
  if (!permitidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  const sql = `UPDATE citas SET estado = ? WHERE id = ?`;
  db.run(sql, [estado, id], function (err) {
    if (err) {
      console.error('❌ Error al cambiar estado:', err.message);
      return res.status(500).json({ error: 'Error al cambiar estado' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    res.json({ mensaje: 'Estado actualizado', id, estado });
  });
});

// DELETE /api/citas/:id
ruta.delete('/:id', (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM citas WHERE id = ?`;
  db.run(sql, [id], function (err) {
    if (err) {
      console.error('❌ Error al eliminar cita:', err.message);
      return res.status(500).json({ error: 'Error al eliminar cita' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    res.json({ mensaje: 'Cita eliminada' });
  });
});

module.exports = ruta;
