// backend/routes/tareas.js
const express = require("express");
const ruta = express.Router();
const db = require("../db/conexion");

// Normaliza una fila de SQLite a objeto tarea
const rowToTask = (r) => ({
  id: r.id,
  titulo: r.titulo || "",
  descripcion: r.descripcion || "",
  vencimiento: r.vencimiento || null,
  completado: r.completado ? 1 : 0,
  creado_en: r.creado_en || null,
  actualizado_en: r.actualizado_en || null,
});

// Obtener todas las tareas ordenadas
ruta.get('/', (req, res) => {
  const sql = `
    SELECT *
    FROM tareas
    ORDER BY 
      completado ASC,
      vencimiento DESC
  `;
  db.all(sql, [], (err, filas) => {
    if (err) {
      return res.status(500).json({ mensaje: "Error al obtener tareas" });
    }
    res.json(filas);
  });
});


/* DETALLE */
ruta.get("/:id", (req, res) => {
  db.get(`SELECT * FROM tareas WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ mensaje: "Error al obtener", detalle: err.message });
    if (!row) return res.status(404).json({ mensaje: "No encontrada" });
    res.json(rowToTask(row));
  });
});

/* CREAR */
ruta.post("/", (req, res) => {
  const { titulo, descripcion = "", vencimiento = null, completado = 0 } = req.body || {};
  if (!titulo || String(titulo).trim() === "") {
    return res.status(400).json({ mensaje: "El título es obligatorio." });
  }
  const sql = `INSERT INTO tareas (titulo, descripcion, vencimiento, completado) VALUES (?, ?, ?, ?)`;
  const args = [String(titulo).trim(), String(descripcion || ""), vencimiento || null, Number(completado) ? 1 : 0];

  db.run(sql, args, function (err) {
    if (err) return res.status(500).json({ mensaje: "Error al crear", detalle: err.message });
    db.get(`SELECT * FROM tareas WHERE id = ?`, [this.lastID], (e2, row) => {
      if (e2) return res.status(201).json({ id: this.lastID });
      res.status(201).json(rowToTask(row));
    });
  });
});

/* ACTUALIZAR (PUT completo) */
ruta.put("/:id", (req, res) => {
  const { titulo, descripcion = "", vencimiento = null, completado = 0 } = req.body || {};
  if (!titulo || String(titulo).trim() === "") {
    return res.status(400).json({ mensaje: "El título es obligatorio." });
  }
  const sql = `
    UPDATE tareas
       SET titulo = ?, descripcion = ?, vencimiento = ?, completado = ?
     WHERE id = ?
  `;
  const args = [String(titulo).trim(), String(descripcion || ""), vencimiento || null, Number(completado) ? 1 : 0, req.params.id];

  db.run(sql, args, function (err) {
    if (err) return res.status(500).json({ mensaje: "Error al actualizar", detalle: err.message });
    if (this.changes === 0) return res.status(404).json({ mensaje: "No encontrada" });
    db.get(`SELECT * FROM tareas WHERE id = ?`, [req.params.id], (e2, row) => {
      if (e2 || !row) return res.json({ mensaje: "Actualizada" });
      res.json(rowToTask(row));
    });
  });
});

/* ELIMINAR */
ruta.delete("/:id", (req, res) => {
  db.run(`DELETE FROM tareas WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ mensaje: "Error al eliminar", detalle: err.message });
    if (this.changes === 0) return res.status(404).json({ mensaje: "No encontrada" });
    res.json({ mensaje: "Eliminada" });
  });
});

/* OPCIONAL: Toggle rápido de completado (si algún día lo quieres usar)
   PATCH /api/tareas/:id/toggle  -> invierte 0/1 */
ruta.patch("/:id/toggle", (req, res) => {
  const sql = `UPDATE tareas SET completado = 1 - completado WHERE id = ?`;
  db.run(sql, [req.params.id], function (err) {
    if (err) return res.status(500).json({ mensaje: "Error al alternar", detalle: err.message });
    if (this.changes === 0) return res.status(404).json({ mensaje: "No encontrada" });
    db.get(`SELECT * FROM tareas WHERE id = ?`, [req.params.id], (e2, row) => {
      if (e2 || !row) return res.json({ mensaje: "OK" });
      res.json(rowToTask(row));
    });
  });
});

module.exports = ruta;

