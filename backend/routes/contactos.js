const express = require('express');
const ruta = express.Router();
const bd = require('../db/conexion');

// Obtener todos los contactos
ruta.get('/', (req, res) => {
    const consulta = 'SELECT * FROM contactos';

    bd.all(consulta, [], (error, filas) => {
        if (error) {
            console.error('Error al obtener contactos:', error.message);
            res.status(500).json({ mensaje: 'Error al obtener los contactos' });
        } else {
            res.json(filas);
        }
    });
});

module.exports = ruta;
