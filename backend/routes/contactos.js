const express = require('express');
const ruta = express.Router();
const bd = require('../db/conexion');

// Obtener todos los contactos
ruta.get('/', (req, res) => {
    const consulta = 'SELECT * FROM contactos';

    bd.all(consulta, [], (error, filas) => {
        if (error) {
            console.error('❌ Error al obtener contactos:', error.message);
            res.status(500).json({ mensaje: 'Error en la base de datos' });
        } else {
            res.status(200).json(filas);
        }
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

    bd.run(consulta, valores, function(error) {
        if (error) {
            console.error('❌ Error al insertar contacto:', error.message);
            res.status(500).json({ mensaje: 'No se pudo guardar el contacto' });
        } else {
            res.status(201).json({ mensaje: 'Contacto guardado', id: this.lastID });
        }
    });
});

