const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rutas
const rutaContactos = require('./routes/contactos');
app.use('/api/contactos', rutaContactos);

// Puerto
const puerto = process.env.PUERTO || 3000;

// Test simple
const bd = require('./db/conexion');
bd.get("SELECT name FROM sqlite_master WHERE type='table'", (error, fila) => {
    if (error) {
        console.error("❌ Error al acceder a la base de datos:", error.message);
    } else {
        console.log("📂 Conexión confirmada. Base de datos contiene tablas.");
    }
});
app.listen(puerto, () => {
    console.log(`🚀 Servidor escuchando en http://localhost:${puerto}`);
});
