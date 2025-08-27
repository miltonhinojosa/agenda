// backend/routes/contactos-export.js
const express = require('express');
const ruta = express.Router();
const db = require('../db/conexion');
const requireAuth = require('../middleware/requireAuth');

// CSV seguro con comillas para campos que tengan coma, salto de línea, etc.
function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

ruta.get('/export/csv', requireAuth, (req, res) => {
  const sql = `
    SELECT id, nombre, telefono_fijo, celular, whatsapp,
           direccion, email, fecha_nacimiento, empresa,
           grupo_id, foto_url, instagram, tiktok, favorito
    FROM contactos
    ORDER BY favorito DESC, nombre COLLATE NOCASE ASC
  `;
  db.all(sql, [], (err, filas) => {
    if (err) {
      console.error('❌ Error export CSV contactos:', err.message);
      return res.status(500).json({ mensaje: 'Error al exportar CSV' });
    }

    const headers = [
      'id','nombre','telefono_fijo','celular','whatsapp',
      'direccion','email','fecha_nacimiento','empresa',
      'grupo_id','foto_url','instagram','tiktok','favorito'
    ];

    let csv = headers.join(',') + '\n';
    for (const f of filas) {
      const row = headers.map((h) => csvEscape(f[h]));
      csv += row.join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="contactos.csv"');
    res.send(csv);
  });
});

module.exports = ruta;
