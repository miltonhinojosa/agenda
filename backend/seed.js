const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/agenda.db');

db.serialize(() => {
  console.log('✅ Insertando datos de prueba...');

  db.run(`DELETE FROM contactos`);
  db.run(`DELETE FROM citas`);

  db.run(`
    INSERT INTO contactos (nombre, telefono_fijo, celular, whatsapp, direccion, email, facebook, fecha_nacimiento, empresa, grupo_id, foto_url)
    VALUES
    ('Ana López', '4222222', '71234567', 'https://wa.me/71234567', 'Av. Sucre 45', 'ana@mail.com', 'https://fb.com/ana', '1991-01-10', 'Soluciones SRL', 1, ''),
    ('Carlos Ríos', '4333333', '72345678', 'https://wa.me/72345678', 'Calle Bolívar 21', 'carlos@mail.com', 'https://fb.com/carlos', '1990-07-25', 'Freelancer', 2, ''),
    ('Esteban Quispe', '4444444', '73456789', 'https://wa.me/73456789', 'Zona Mercado', 'esteban@mail.com', 'https://fb.com/esteban', '1985-12-03', 'TecnoPlus', 3, '')
  `);

  db.run(`
    INSERT INTO citas (titulo, descripcion, fecha, hora, contacto_id)
    VALUES
    ('Reunión laboral', 'Planificación mensual de tareas', '2025-08-10', '10:00', 1),
    ('Cita médica', 'Control general con el doctor', '2025-08-12', '14:00', 2),
    ('Presentación del sistema', 'Demostración de la agenda electrónica', '2025-08-15', '09:00', 3)
  `);

  console.log('✅ Datos insertados correctamente');
});

db.close();
