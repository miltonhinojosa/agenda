const express = require('express');
const app = express();
const cors = require('cors');
const uploadRouter = require('./routes/upload');

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/contactos', require('./routes/contactos'));
app.use('/api/citas', require('./routes/citas'));
app.use('/api/notas', require('./routes/notas'));
app.use('/api/tareas', require('./routes/tareas'));
app.use('/api/grupos', require('./routes/grupos'));
app.use('/api/upload', uploadRouter);

// Carpeta pública
app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});


// Test simple
const bd = require('./db/conexion');
bd.get("SELECT name FROM sqlite_master WHERE type='table'", (error, fila) => {
    if (error) {
        console.error("❌ Error al acceder a la base de datos:", error.message);
    } else {
        console.log("📂 Conexión confirmada. Base de datos contiene tablas.");
    }
});

