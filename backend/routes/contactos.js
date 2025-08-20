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

/* ================= Cumpleaños → Evento ================= */
function proximaOcurrenciaISO(fechaYYYYMMDD) {
  if (!fechaYYYYMMDD) return null;
  const [y, m, d] = fechaYYYYMMDD.split('-').map(Number);
  if (!m || !d) return null;

  const hoy = new Date();
  const baseHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0).getTime();
  const candidata = new Date(hoy.getFullYear(), m - 1, d, 0, 0, 0);
  const inicio = candidata.getTime() >= baseHoy
    ? candidata
    : new Date(hoy.getFullYear() + 1, m - 1, d, 0, 0, 0);

  const pad = (n) => String(n).padStart(2, '0');
  return `${inicio.getFullYear()}-${pad(inicio.getMonth() + 1)}-${pad(inicio.getDate())}T00:00`;
}

function upsertCumpleEvento({ nombre, fecha_nacimiento }, cb) {
  if (!fecha_nacimiento || !nombre) return cb && cb();

  const titulo = `🎂 Cumpleaños de ${nombre}`;
  const categoria = 'Cumpleaños';
  const inicio = proximaOcurrenciaISO(fecha_nacimiento);
  if (!inicio) return cb && cb();

  const sqlFind = `SELECT id FROM eventos WHERE titulo = ? AND categoria = ? LIMIT 1`;
  db.get(sqlFind, [titulo, categoria], (err, row) => {
    if (err) return cb && cb();

    if (row && row.id) {
      const sqlUpd = `
        UPDATE eventos
           SET inicio = ?, fin = NULL, todo_dia = 1, aviso_min = 0,
               repetir_cada_min = 0, estado = 'Activo'
         WHERE id = ?`;
      db.run(sqlUpd, [inicio, row.id], () => cb && cb());
    } else {
      const sqlIns = `
        INSERT INTO eventos
          (titulo, descripcion, ubicacion, categoria, color, inicio, fin, todo_dia, aviso_min, repetir_cada_min, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const args = [
        titulo,
        'Generado automáticamente desde Contactos.',
        '',
        categoria,
        null,
        inicio,
        null,
        1,   // todo el día
        0,   // aviso al empezar el día (00:00)
        0,   // sin repetición programada
        'Activo'
      ];
      db.run(sqlIns, args, () => cb && cb());
    }
  });
}

/* ===================== RUTAS ===================== */

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
    // NOTA: codigo_pais NO se guarda en DB, solo para armar whatsapp
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
    nombre || '',
    telefono_fijo || '',
    celular || '',
    whatsapp || '',
    direccion || '',
    email || '',
    instagram || '',
    tiktok || '',
    fecha_nacimiento || '',
    empresa || '',
    (grupo_id === null || grupo_id === '' ? null : grupo_id),
    foto_url || '',
    favorito ? 1 : 0
  ];

  db.run(consulta, valores, function (error) {
    if (error) {
      console.error('❌ Error al insertar contacto:', error.message);
      return res.status(500).json({ mensaje: 'No se pudo guardar el contacto' });
    }

    // Crear/actualizar evento de cumpleaños (no bloqueante)
    upsertCumpleEvento({ nombre, fecha_nacimiento }, () => {
      res.status(201).json({ mensaje: 'Contacto guardado', id: this.lastID });
    });
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
    // NOTA: codigo_pais NO se guarda en DB, solo para armar whatsapp
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
    nombre || '',
    telefono_fijo || '',
    celular || '',
    whatsapp || '',
    direccion || '',
    email || '',
    instagram || '',
    tiktok || '',
    fecha_nacimiento || '',
    empresa || '',
    (grupo_id === null || grupo_id === '' ? null : grupo_id),
    foto_url || '',
    favorito ? 1 : 0,
    id
  ];

  db.run(sql, valores, function (err) {
    if (err) {
      console.error('❌ Error al actualizar contacto:', err.message);
      return res.status(500).json({ mensaje: 'No se pudo actualizar el contacto' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ mensaje: 'Contacto no encontrado' });
    }

    // Crear/actualizar evento de cumpleaños (no bloqueante)
    upsertCumpleEvento({ nombre, fecha_nacimiento }, () => {
      res.json({ mensaje: 'Contacto actualizado correctamente' });
    });
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
