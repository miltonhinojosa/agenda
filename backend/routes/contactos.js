const express = require('express');
const ruta = express.Router();
const db = require('../db/conexion');

// Obtener todos los contactos
ruta.get('/', (req, res) => {
    const consulta = 'SELECT * FROM contactos';

    db.all(consulta, [], (error, filas) => {
        if (error) {
            console.error('❌ Error al obtener contactos:', error.message);
            res.status(500).json({ mensaje: 'Error en la base de datos' });
        } else {
            res.status(200).json(filas);
        }
    });
});

// Eliminar contacto por ID
ruta.delete('/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM contactos WHERE id = ?';

  db.run(sql, [id], function (err) {
    if (err) {
      console.error('Error al eliminar contacto:', err.message);
      return res.status(500).json({ error: 'Error al eliminar contacto' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }

    res.json({ mensaje: 'Contacto eliminado correctamente' });
  });
});

// Actualizar contacto por ID
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
    foto_url
  } = req.body;

  const sql = `
    UPDATE contactos SET
      nombre = ?, telefono_fijo = ?, celular = ?, direccion = ?, email = ?,
      facebook = ?, fecha_nacimiento = ?, empresa = ?, grupo_id = ?, foto_url = ?
    WHERE id = ?
  `;

  const params = [
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
    id
  ];

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Error al actualizar contacto:', err.message);
      return res.status(500).json({ error: 'Error al actualizar contacto' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }

    res.json({ mensaje: 'Contacto actualizado correctamente' });
  });
});

module.exports = ruta;

// Crear un nuevo contacto
ruta.post('/', (req, res) => {
    const {
        nombre,
        telefono_fijo,
        celular,
        whatsapp,
        direccion,
        email,
        facebook,
        fecha_nacimiento,
        empresa,
        grupo_id,
        foto_url
    } = req.body;

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

    db.run(consulta, valores, function(error) {
        if (error) {
            console.error('❌ Error al insertar contacto:', error.message);
            res.status(500).json({ mensaje: 'No se pudo guardar el contacto' });
        } else {
            res.status(201).json({ mensaje: 'Contacto guardado', id: this.lastID });
        }
    });
});


