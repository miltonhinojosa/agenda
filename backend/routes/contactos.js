// backend/routes/contactos.js
const express = require('express');
const ruta = express.Router();
const db = require('../db/conexion');

// Función para armar enlace de WhatsApp
function buildWhatsappLink(codigo_pais, celular) {
  const cod = (codigo_pais || '+591').replace(/\D/g, '');
  const num = (celular || '').replace(/\D/g, '');
  if (!cod || !num) return null;
  return `https://wa.me/${cod}${num}`;
}

// ===================== RUTAS =====================

// Obtener todos los contactos
ruta.get('/', (req, res) => {
  const consulta = 'SELECT * FROM contactos ORDER BY favorito DESC, nombre ASC';
  db.all(consulta, [], (error, filas) => {
    if (error) {
      console.error('❌ Error al obtener contactos:', error.message);
      return res.status(500).json({ mensaje: 'Error en la base de datos' });
    }
    res.status(200).json(filas);
  });
});

// Obtener un contacto por ID
ruta.get('/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM contactos WHERE id = ?';
  db.get(sql, [id], (err, fila) => {
    if (err) {
      console.error('❌ Error al obtener contacto:', err.message);
      return res.status(500).json({ mensaje: 'Error en la base de datos' });
    }
    if (!fila) return res.status(404).json({ mensaje: 'Contacto no encontrado' });
    res.json(fila);
  });
});

// Crear un nuevo contacto
ruta.post('/', (req, res) => {
  const {
    nombre,
    telefono_fijo,
    celular,
    direccion,
    email,
    instagram,
    tiktok,
    fecha_nacimiento,
    empresa,
    grupo_id,
    foto_url,
    codigo_pais,
    favorito
  } = req.body;

  const whatsapp = buildWhatsappLink(codigo_pais, celular);

  const consulta = `
    INSERT INTO contactos (
      nombre, telefono_fijo, celular, whatsapp, direccion,
      email, instagram, tiktok, fecha_nacimiento, empresa,
      grupo_id, foto_url, favorito
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const valores = [
    nombre, telefono_fijo, celular, whatsapp, direccion,
    email, instagram, tiktok, fecha_nacimiento, empresa,
    grupo_id, foto_url, favorito ? 1 : 0
  ];

  db.run(consulta, valores, function (error) {
    if (error) {
      console.error('❌ Error al insertar contacto:', error.message);
      return res.status(500).json({ mensaje: 'No se pudo guardar el contacto' });
    }
    res.status(201).json({ mensaje: 'Contacto guardado', id: this.lastID });
  });
});

// Actualizar un contacto
ruta.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    telefono_fijo,
    celular,
    direccion,
    email,
    instagram,
    tiktok,
    fecha_nacimiento,
    empresa,
    grupo_id,
    foto_url,
    codigo_pais,
    favorito
  } = req.body;

  const whatsapp = buildWhatsappLink(codigo_pais, celular);

  const sql = `
    UPDATE contactos
       SET nombre = ?,
           telefono_fijo = ?,
           celular = ?,
           whatsapp = ?,
           direccion = ?,
           email = ?,
           instagram = ?,
           tiktok = ?,
           fecha_nacimiento = ?,
           empresa = ?,
           grupo_id = ?,
           foto_url = ?,
           favorito = ?
     WHERE id = ?
  `;

  const valores = [
    nombre, telefono_fijo, celular, whatsapp, direccion,
    email, instagram, tiktok, fecha_nacimiento, empresa,
    grupo_id, foto_url, favorito ? 1 : 0, id
  ];

  db.run(sql, valores, function (err) {
    if (err) {
      console.error('❌ Error al actualizar contacto:', err.message);
      return res.status(500).json({ mensaje: 'No se pudo actualizar el contacto' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ mensaje: 'Contacto no encontrado' });
    }
    res.json({ mensaje: 'Contacto actualizado correctamente' });
  });
});

// Cambiar solo el valor de favorito
ruta.patch('/:id/favorito', (req, res) => {
  const { id } = req.params;
  const { valor } = req.body;

  const sql = 'UPDATE contactos SET favorito = ? WHERE id = ?';
  db.run(sql, [valor ? 1 : 0, id], function (err) {
    if (err) {
      console.error('❌ Error al actualizar favorito:', err.message);
      return res.status(500).json({ mensaje: 'No se pudo actualizar el favorito' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ mensaje: 'Contacto no encontrado' });
    }
    res.json({ mensaje: 'Favorito actualizado correctamente' });
  });
});

// Eliminar contacto por ID
ruta.delete('/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM contactos WHERE id = ?';

  db.run(sql, [id], function (err) {
    if (err) {
      console.error('❌ Error al eliminar contacto:', err.message);
      return res.status(500).json({ error: 'Error al eliminar contacto' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }
    res.json({ mensaje: 'Contacto eliminado correctamente' });
  });
});

module.exports = ruta;

