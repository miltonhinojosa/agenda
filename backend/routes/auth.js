// backend/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const db = require("../db/conexion");

// Asegurar tabla (por si faltara)
db.run(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre TEXT,
    email TEXT,
    foto_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// GET /api/auth/availability  -> { canRegister: true|false }
router.get("/availability", (req, res) => {
  db.get(`SELECT COUNT(*) AS c FROM usuarios`, [], (err, row) => {
    if (err) return res.status(500).json({ mensaje: "Error en BD" });
    res.json({ canRegister: (row?.c || 0) === 0 });
  });
});

// POST /api/auth/register  (solo permitido si NO hay usuarios)
router.post("/register", (req, res) => {
  const { username, password, nombre, email, foto_url } = req.body || {};
  const u = String(username || "").trim();
  const p = String(password || "").trim();

  if (!u || !p) return res.status(400).json({ mensaje: "Usuario y contraseña son obligatorios" });

  db.get(`SELECT COUNT(*) AS c FROM usuarios`, [], async (err, row) => {
    if (err) return res.status(500).json({ mensaje: "Error en BD" });
    if ((row?.c || 0) > 0) {
      return res.status(403).json({ mensaje: "El registro está cerrado (ya existe un usuario)" });
    }

    try {
      const hash = await bcrypt.hash(p, 10);
      db.run(
        `INSERT INTO usuarios (username, password_hash, nombre, email, foto_url)
         VALUES (?,?,?,?,?)`,
        [u, hash, (nombre || "").trim(), (email || "").trim(), foto_url || ""],
        function (e) {
          if (e) return res.status(500).json({ mensaje: "No se pudo crear el usuario" });
          // Autologin
          req.session.user = {
            id: this.lastID,
            username: u,
            nombre: nombre || "",
            foto_url: foto_url || ""
          };
          res.status(201).json({ ok: true, user: req.session.user });
        }
      );
    } catch {
      return res.status(500).json({ mensaje: "Error al crear usuario" });
    }
  });
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ mensaje: "Faltan credenciales" });
  }

  db.get(`SELECT * FROM usuarios WHERE username = ?`, [username], async (err, user) => {
    if (err) return res.status(500).json({ mensaje: "Error en BD" });
    if (!user) return res.status(401).json({ mensaje: "Usuario o contraseña inválidos" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ mensaje: "Usuario o contraseña inválidos" });

    req.session.user = {
      id: user.id,
      username: user.username,
      nombre: user.nombre || "",
      foto_url: user.foto_url || ""
    };
    res.json({ ok: true, user: req.session.user });
  });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("sid");
    res.json({ ok: true });
  });
});

// GET /api/auth/me
router.get("/me", (req, res) => {
  if (!req.session?.user) return res.status(401).json({ mensaje: "No autenticado" });
  res.json({ user: req.session.user });
});

module.exports = router;
