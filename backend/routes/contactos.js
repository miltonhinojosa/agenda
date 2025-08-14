// backend/routes/contactos.js
const express = require('express');
const ruta = express.Router();
const db = require('../db/conexion');

// Utilidad para construir el link de WhatsApp desde código de país y celular
function buildWhatsappLink(codigo_pais, celular) {
  const cod = (codigo_pais || '+591').replace(/\D/g, ''); // "+591" -> "591"
  const num = (celular || '').replace(/\D/g, '');         // "700-11-222" -> "70011222"
  if (!cod || !num) return null;
  return `https://wa.me/${cod}${num}`;
}

// ===================== RUTAS =====================

// Obtener todos los contactos
ruta.get('/', (req, res) => {
  const consulta = 'SELECT * FROM contactos';
  db.all(consulta, [], (error, filas) => {
    if (error) {
      console.error('❌ Error al obtener contactos:', error.message);
      return res.status(500).json({ mensaje: 'Error en la base de datos' });
    }
    res.status(200).json(filas);
  });
});

// (Opcional) Obtener un contacto por ID
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
    facebook,
    fecha_nacimiento,
    empresa,
    grupo_id,
    foto_url,
    codigo_pais, // 👈 lo usamos para armar el link
  } = req.body;

  const whatsapp = buildWhatsappLink(codigo_pais, celular);

  const consulta = `
    INSERT INTO contactos (
      nombre, telefono_fijo, celular, whatsapp, direccion,
      email, facebook, fecha_nacimiento, empresa,
      grupo_id, foto_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const valores = [
    nombre, telefono_fijo, celular, whatsapp, direccion,
    email, facebook, fecha_nacimiento, empresa,
    grupo_id, foto_url
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
    facebook,
    fecha_nacimiento,
    empresa,
    grupo_id,
    foto_url,
    codigo_pais // 👈 recalculamos el link con lo que venga del form
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
           facebook = ?,
           fecha_nacimiento = ?,
           empresa = ?,
           grupo_id = ?,
           foto_url = ?
     WHERE id = ?
  `;

  const valores = [
    nombre, telefono_fijo, celular, whatsapp, direccion,
    email, facebook, fecha_nacimiento, empresa,
    grupo_id, foto_url, id
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
