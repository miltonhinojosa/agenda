const express = require('express');
const session = require("express-session");
const path = require('path');
const app = express();
const cors = require('cors');
const uploadRouter = require('./routes/upload');

app.use(express.json());

// ⚠️ CORS si tu frontend corre en http://localhost:5173 (Vite).
// Si frontend y backend corren en el MISMO origen, puedes comentar esto.
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

// Sesión
app.use(
  session({
    name: "sid",
    secret: "cambia-este-secreto",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // secure: true, // habilita en producción con HTTPS
      maxAge: 1000 * 60 * 60 * 8, // 8 horas
    },
  })
);

// Rutas públicas de auth y upload
app.use("/api/auth", require("./routes/auth"));
app.use("/api/upload", require("./routes/upload"));

// Middleware de protección para el resto de /api/*
const requireAuth = (req, res, next) => {
  if (req.path.startsWith("/auth/") || req.path.startsWith("/upload")) return next();
  if (!req.session || !req.session.user) {
    return res.status(401).json({ mensaje: "No autenticado" });
  }
  next();
};
app.use("/api", requireAuth);

// Rutas
app.use('/api/contactos', require('./routes/contactos'));
app.use('/api/eventos', require('./routes/eventos'));
app.use('/api/citas', require('./routes/citas'));
app.use('/api/notas', require('./routes/notas'));
app.use('/api/tareas', require('./routes/tareas'));
app.use('/api/grupos', require('./routes/grupos'));
app.use('/api/upload', uploadRouter);

// Carpeta pública para fotos
app.use('/uploads', express.static('uploads'));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

