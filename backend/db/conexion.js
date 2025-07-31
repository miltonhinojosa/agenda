const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.resolve(__dirname, 'agenda.db'); // debe apuntar al archivo correcto
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error al conectar:', err.message);
  } else {
    console.log('✅ Conectado a la base de datos');
  }
});

module.exports = db;
