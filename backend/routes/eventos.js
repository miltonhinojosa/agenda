// backend/routes/eventos.js
const express = require('express');
const ruta = express.Router();
const db = require('../db/conexion');

const rowToEvento = (r) => ({
  id: r.id,
  titulo: r.titulo || '',
  descripcion: r.descripcion || '',
  ubicacion: r.ubicacion || '',
  categoria: r.categoria || '',
  color: r.color || null,
  inicio: r.inicio,
  fin: r.fin,
  todo_dia: r.todo_dia ? 1 : 0,
  aviso_min: r.aviso_min ?? 0,
  repetir_cada_min: r.repetir_cada_min ?? 0,
  estado: r.estado || 'Activo',
  creado_en: r.creado_en,
  actualizado_en: r.actualizado_en
});

/* LISTAR (filtros: ?estado=Activo|Archivado|Cancelado|Todos, ?desde=YYYY-MM-DD, ?hasta=YYYY-MM-DD) */
ruta.get('/', (req, res) => {
  const { estado = 'Activo', desde, hasta } = req.query;
  const where = [];
  const params = [];

  if (estado !== 'Todos') { where.push('estado = ?'); params.push(estado); }
  if (desde) { where.push("date(substr(inicio,1,10)) >= date(?)"); params.push(desde); }
  if (hasta) { where.push("date(substr(inicio,1,10)) <= date(?)"); params.push(hasta); }

  const sql = `
    SELECT * FROM eventos
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY
      CASE WHEN todo_dia=1 THEN 0 ELSE 1 END,
      datetime(inicio) ASC, id DESC
  `;
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ mensaje: 'Error al listar', detalle: err.message });
    res.json((rows || []).map(rowToEvento));
  });
});

/* DETALLE */
ruta.get('/:id', (req, res) => {
  db.get(`SELECT * FROM eventos WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ mensaje: 'Error al obtener', detalle: err.message });
    if (!row) return res.status(404).json({ mensaje: 'No encontrado' });
    res.json(rowToEvento(row));
  });
});

/* CREAR */
ruta.post('/', (req, res) => {
  const {
    titulo, descripcion = '', ubicacion = '', categoria = '', color = null,
    inicio, fin = null, todo_dia = 0,
    aviso_min = 0, repetir_cada_min = 0,
    estado = 'Activo'
  } = req.body || {};

  if (!titulo || !inicio) {
    return res.status(400).json({ mensaje: 'Título e inicio son obligatorios.' });
  }

  const sql = `
    INSERT INTO eventos
    (titulo, descripcion, ubicacion, categoria, color, inicio, fin, todo_dia, aviso_min, repetir_cada_min, estado)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`;

  const args = [
    String(titulo).trim(),
    String(descripcion || ''),
    String(ubicacion || ''),
    String(categoria || ''),
    color || null,
    String(inicio),
    fin || null,
    Number(todo_dia) ? 1 : 0,
    Number(aviso_min) || 0,
    Number(repetir_cada_min) || 0,
    String(estado || 'Activo')
  ];

  db.run(sql, args, function (err) {
    if (err) return res.status(500).json({ mensaje: 'Error al crear', detalle: err.message });
    db.get(`SELECT * FROM eventos WHERE id = ?`, [this.lastID], (e2, row) => {
      if (e2) return res.status(201).json({ id: this.lastID });
      res.status(201).json(rowToEvento(row));
    });
  });
});

/* ACTUALIZAR */
ruta.put('/:id', (req, res) => {
  const {
    titulo, descripcion = '', ubicacion = '', categoria = '', color = null,
    inicio, fin = null, todo_dia = 0,
    aviso_min = 0, repetir_cada_min = 0,
    estado = 'Activo'
  } = req.body || {};

  if (!titulo || !inicio) {
    return res.status(400).json({ mensaje: 'Título e inicio son obligatorios.' });
  }

  const sql = `
    UPDATE eventos SET
      titulo=?, descripcion=?, ubicacion=?, categoria=?, color=?,
      inicio=?, fin=?, todo_dia=?, aviso_min=?, repetir_cada_min=?, estado=?
    WHERE id = ?`;

  const args = [
    String(titulo).trim(), String(descripcion || ''), String(ubicacion || ''), String(categoria || ''), color || null,
    String(inicio), fin || null, Number(todo_dia) ? 1 : 0, Number(aviso_min) || 0, Number(repetir_cada_min) || 0, String(estado || 'Activo'),
    req.params.id
  ];

  db.run(sql, args, function (err) {
    if (err) return res.status(500).json({ mensaje: 'Error al actualizar', detalle: err.message });
    if (this.changes === 0) return res.status(404).json({ mensaje: 'No encontrado' });
    db.get(`SELECT * FROM eventos WHERE id = ?`, [req.params.id], (e2, row) => {
      if (e2 || !row) return res.json({ mensaje: 'Actualizado' });
      res.json(rowToEvento(row));
    });
  });
});

/* ELIMINAR */
ruta.delete('/:id', (req, res) => {
  db.run(`DELETE FROM eventos WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ mensaje: 'Error al eliminar', detalle: err.message });
    if (this.changes === 0) return res.status(404).json({ mensaje: 'No encontrado' });
    res.json({ mensaje: 'Eliminado' });
  });
});

/* Cambiar estado rápido */
ruta.patch('/:id/estado', (req, res) => {
  const { estado } = req.body || {};
  if (!estado) return res.status(400).json({ mensaje: 'Estado requerido.' });
  db.run(`UPDATE eventos SET estado=? WHERE id=?`, [String(estado), req.params.id], function (err) {
    if (err) return res.status(500).json({ mensaje: 'Error al cambiar estado', detalle: err.message });
    if (this.changes === 0) return res.status(404).json({ mensaje: 'No encontrado' });
    res.json({ mensaje: 'OK' });
  });
});

module.exports = ruta;
