const sqlite3 = require('sqlite3').verbose();
const rutaBD = './agenda.db';

const baseDatos = new sqlite3.Database(rutaBD, (error) => {
    if (error) {
        console.error('❌ Error al conectar a la base de datos:', error.message);
    } else {
        console.log('✅ Conexión exitosa a agenda.db');
    }
});

module.exports = baseDatos;
