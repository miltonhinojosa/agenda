// backend/routes/eventos-export.js
const express = require('express');
const ruta = express.Router();
const db = require('../db/conexion');
const requireAuth = require('../middleware/requireAuth');

// Formateo ICS (UTC o all-day)
function toIcsDateTime(isoString) {
  // Espera "YYYY-MM-DDTHH:mm"
  if (!isoString) return null;
  const d = new Date(isoString);
  // a UTC y formato YYYYMMDDTHHmmssZ
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const HH = String(d.getUTCHours()).padStart(2, '0');
  const MM = String(d.getUTCMinutes()).padStart(2, '0');
  const SS = String(d.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${HH}${MM}${SS}Z`;
}
function toIcsDate(isoString) {
  // Solo fecha "YYYY-MM-DD"
  if (!isoString) return null;
  const d = new Date(isoString);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}
function icsEscape(v) {
  if (v == null) return '';
  return String(v)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

ruta.get('/export/ics', requireAuth, (req, res) => {
  // Permite filtros opcionales por query:
  // ?estado=Activo|Archivado|Cancelado|Todos  (default: Todos)
  // ?categoria=Cumpleaños  (opcional)
  const { estado = 'Todos', categoria } = req.query;

  const params = [];
  let where = [];
  if (estado && estado !== 'Todos') {
    where.push('estado = ?');
    params.push(estado);
  }
  if (categoria) {
    where.push('LOWER(COALESCE(categoria,"")) = LOWER(?)');
    params.push(categoria);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
    SELECT id, titulo, descripcion, ubicacion, categoria, color,
           inicio, fin, todo_dia, aviso_min, repetir_cada_min, estado
    FROM eventos
    ${whereSql}
    ORDER BY COALESCE(inicio,'9999-12-31') ASC, id ASC
  `;

  db.all(sql, params, (err, filas) => {
    if (err) {
      console.error('❌ Error export ICS eventos:', err.message);
      return res.status(500).json({ mensaje: 'Error al exportar ICS' });
    }

    const now = new Date();
    const stamp = toIcsDateTime(now.toISOString());
    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Agenda Milton//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ].join('\r\n') + '\r\n';

    for (const e of filas) {
      const uid = `evento-${e.id}@agenda-milton`;
      const summary = icsEscape(e.titulo || '');
      const desc = icsEscape(e.descripcion || '');
      const loc = icsEscape(e.ubicacion || '');
      const cat = icsEscape(e.categoria || '');

      ics += 'BEGIN:VEVENT\r\n';
      ics += `UID:${uid}\r\n`;
      ics += `DTSTAMP:${stamp}\r\n`;

      if (e.todo_dia) {
        // All-day: usar DATE (sin horas)
        // Si solo tienes "inicio" (YYYY-MM-DD o datetime), tomamos la fecha de inicio.
        const d1 = toIcsDate(e.inicio || now.toISOString());
        // DTEND en all-day es EXCLUSIVO; sumar 1 día. Hacemos un truco simple:
        const endDate = e.fin ? toIcsDate(e.fin) : d1;
        // sumar 1 día a endDate:
        const y = Number(endDate.slice(0, 4));
        const m = Number(endDate.slice(4, 6));
        const d = Number(endDate.slice(6, 8));
        const end = new Date(Date.UTC(y, m - 1, d + 1));
        const eyyyy = end.getUTCFullYear();
        const emm = String(end.getUTCMonth() + 1).padStart(2, '0');
        const edd = String(end.getUTCDate()).padStart(2, '0');
        const d2 = `${eyyyy}${emm}${edd}`;

        ics += `DTSTART;VALUE=DATE:${d1}\r\n`;
        ics += `DTEND;VALUE=DATE:${d2}\r\n`;
      } else {
        // Con hora
        const dtStart = toIcsDateTime(e.inicio || now.toISOString());
        const dtEnd = toIcsDateTime(e.fin || e.inicio || now.toISOString());
        ics += `DTSTART:${dtStart}\r\n`;
        ics += `DTEND:${dtEnd}\r\n`;
      }

      if (summary)  ics += `SUMMARY:${summary}\r\n`;
      if (desc)     ics += `DESCRIPTION:${desc}\r\n`;
      if (loc)      ics += `LOCATION:${loc}\r\n`;
      if (cat)      ics += `CATEGORIES:${cat}\r\n`;

      ics += 'END:VEVENT\r\n';
    }

    ics += 'END:VCALENDAR\r\n';

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="eventos.ics"');
    res.send(ics);
  });
});

module.exports = ruta;
