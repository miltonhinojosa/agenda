const express = require('express');
const ruta = express.Router();
const db = require('../db/conexion');

// ---- Helpers: contactos ----
function replaceNotaContactos(notaId, contactosIds = []) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('DELETE FROM nota_contactos WHERE nota_id = ?', [notaId], (errDel) => {
        if (errDel) return reject(errDel);
        if (!Array.isArray(contactosIds) || contactosIds.length === 0) return resolve();

        const stmt = db.prepare('INSERT INTO nota_contactos (nota_id, contacto_id) VALUES (?, ?)');
        for (const cid of contactosIds) {
          if (cid == null) continue;
          stmt.run([notaId, cid]);
        }
        stmt.finalize((errIns) => (errIns ? reject(errIns) : resolve()));
      });
    });
  });
}

function getContactosDeNotas(ids = []) {
  return new Promise((resolve, reject) => {
    if (!ids.length) return resolve({});
    const placeholders = ids.map(() => '?').join(',');
    const sql = `
      SELECT nc.nota_id, c.id, c.nombre
      FROM nota_contactos nc
      JOIN contactos c ON c.id = nc.contacto_id
      WHERE nc.nota_id IN (${placeholders})
      ORDER BY c.nombre COLLATE NOCASE
    `;
    db.all(sql, ids, (err, filas) => {
      if (err) return reject(err);
      const map = {};
      for (const f of filas) {
        if (!map[f.nota_id]) map[f.nota_id] = [];
        map[f.nota_id].push({ id: f.id, nombre: f.nombre });
      }
      resolve(map);
    });
  });
}

// ---- Listar ----
ruta.get('/', async (req, res) => {
  try {
    const { q = '', estado = 'p', fijadas, limit = 100, offset = 0, ordenar = 'reciente' } = req.query;

    const filtros = [];
    const params = [];

    if (estado === 'a') filtros.push('archivada = 1');
    else if (estado !== 't') filtros.push('archivada = 0');

    if (String(fijadas) === '1') filtros.push('fijada = 1');

    if (q && q.trim()) {
      filtros.push('(LOWER(titulo) LIKE ? OR LOWER(contenido) LIKE ?)');
      const like = `%${q.toLowerCase()}%`;
      params.push(like, like);
    }

    const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
    const orderBy =
      ordenar === 'titulo'
        ? 'ORDER BY titulo COLLATE NOCASE ASC'
        : 'ORDER BY actualizado_en DESC, creado_en DESC, id DESC';

    const sql = `
      SELECT id, titulo, contenido, color, fijada, archivada,
             recordatorio_en, creado_en, actualizado_en
      FROM notas
      ${where}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;
    params.push(Number(limit), Number(offset));

    db.all(sql, params, async (err, notas) => {
      if (err) return res.status(500).json({ mensaje: 'Error en la base de datos' });

      const ids = notas.map(n => n.id);
      const mapContactos = await getContactosDeNotas(ids);

      const resultado = notas.map(n => ({
        ...n,
        contactos: mapContactos[n.id] || [],
      }));

      res.json(resultado);
    });
  } catch (e) {
    console.error('GET /api/notas', e);
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

// ---- Detalle ----
ruta.get('/:id', (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT id, titulo, contenido, color, fijada, archivada,
           recordatorio_en, creado_en, actualizado_en
    FROM notas
    WHERE id = ?
  `;
  db.get(sql, [id], async (err, nota) => {
    if (err) return res.status(500).json({ mensaje: 'Error en la base de datos' });
    if (!nota) return res.status(404).json({ mensaje: 'Nota no encontrada' });
    try {
      const mapC = await getContactosDeNotas([id]);
      nota.contactos = mapC[id] || [];
      res.json(nota);
    } catch (e) {
      res.status(500).json({ mensaje: 'Error al cargar contactos' });
    }
  });
});

// ---- Crear ----
ruta.post('/', (req, res) => {
  const {
    titulo = '',
    contenido = '',
    color = null,
    fijada = 0,
    archivada = 0,
    recordatorio_en = null,
    contactosIds = [],
  } = req.body || {};

  if (!titulo.trim() || !contenido.trim()) {
    return res.status(400).json({ mensaje: 'titulo y contenido son obligatorios' });
  }

  const sql = `
    INSERT INTO notas (titulo, contenido, color, fijada, archivada, recordatorio_en)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const vals = [titulo.trim(), contenido.trim(), color, Number(fijada) ? 1 : 0, Number(archivada) ? 1 : 0, recordatorio_en];

  db.run(sql, vals, function (err) {
    if (err) return res.status(500).json({ mensaje: 'No se pudo crear la nota' });

    const nuevaId = this.lastID;
    replaceNotaContactos(nuevaId, contactosIds)
      .then(() => res.status(201).json({ mensaje: 'Nota creada', id: nuevaId }))
      .catch(() => res.status(201).json({ mensaje: 'Nota creada (sin contactos)', id: nuevaId }));
  });
});

// ---- Actualizar ----
ruta.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    titulo = '',
    contenido = '',
    color = null,
    fijada = 0,
    archivada = 0,
    recordatorio_en = null,
    contactosIds,
  } = req.body || {};

  if (!titulo.trim() || !contenido.trim()) {
    return res.status(400).json({ mensaje: 'titulo y contenido son obligatorios' });
  }

  const sql = `
    UPDATE notas
       SET titulo = ?,
           contenido = ?,
           color = ?,
           fijada = ?,
           archivada = ?,
           recordatorio_en = ?
     WHERE id = ?
  `;
  const vals = [titulo.trim(), contenido.trim(), color, Number(fijada) ? 1 : 0, Number(archivada) ? 1 : 0, recordatorio_en, id];

  db.run(sql, vals, function (err) {
    if (err) return res.status(500).json({ mensaje: 'No se pudo actualizar la nota' });
    if (this.changes === 0) return res.status(404).json({ mensaje: 'Nota no encontrada' });

    if (Array.isArray(contactosIds)) {
      replaceNotaContactos(id, contactosIds)
        .then(() => res.json({ mensaje: 'Nota actualizada' }))
        .catch(() => res.json({ mensaje: 'Nota actualizada (con errores en contactos)' }));
    } else {
      res.json({ mensaje: 'Nota actualizada' });
    }
  });
});

// ---- Borrar ----
ruta.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM notas WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ mensaje: 'No se pudo eliminar la nota' });
    if (this.changes === 0) return res.status(404).json({ mensaje: 'Nota no encontrada' });
    res.json({ mensaje: 'Nota eliminada' });
  });
});

// ---- Fijar ----
ruta.patch('/:id/fijar', (req, res) => {
  const { id } = req.params;
  const { valor } = req.body || {};
  const sqlGet = 'SELECT fijada FROM notas WHERE id = ?';
  db.get(sqlGet, [id], (err, row) => {
    if (err) return res.status(500).json({ mensaje: 'Error en la base de datos' });
    if (!row) return res.status(404).json({ mensaje: 'Nota no encontrada' });
    const nuevo = (valor === 0 || valor === 1) ? valor : (row.fijada ? 0 : 1);
    db.run('UPDATE notas SET fijada = ? WHERE id = ?', [nuevo, id], function (err2) {
      if (err2) return res.status(500).json({ mensaje: 'No se pudo actualizar' });
      res.json({ mensaje: 'OK', fijada: nuevo });
    });
  });
});

// ---- Archivar ----
ruta.patch('/:id/archivar', (req, res) => {
  const { id } = req.params;
  const { valor } = req.body || {};
  const sqlGet = 'SELECT archivada FROM notas WHERE id = ?';
  db.get(sqlGet, [id], (err, row) => {
    if (err) return res.status(500).json({ mensaje: 'Error en la base de datos' });
    if (!row) return res.status(404).json({ mensaje: 'Nota no encontrada' });
    const nuevo = (valor === 0 || valor === 1) ? valor : (row.archivada ? 0 : 1);
    db.run('UPDATE notas SET archivada = ? WHERE id = ?', [nuevo, id], function (err2) {
      if (err2) return res.status(500).json({ mensaje: 'No se pudo actualizar' });
      res.json({ mensaje: 'OK', archivada: nuevo });
    });
  });
});

// ---- Reemplazar contactos (opcional) ----
ruta.post('/:id/contactos', async (req, res) => {
  const { id } = req.params;
  const { contactosIds = [] } = req.body || {};
  try {
    await replaceNotaContactos(id, contactosIds);
    res.json({ mensaje: 'Contactos vinculados' });
  } catch (e) {
    res.status(500).json({ mensaje: 'No se pudieron vincular los contactos' });
  }
});

module.exports = ruta;
