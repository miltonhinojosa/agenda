const sqlite3 = require('sqlite3').verbose();
const rutaBD = './agenda.db';

const bd = new sqlite3.Database(rutaBD, (error) => {
    if (error) {
        console.error('❌ Error al crear la base de datos:', error.message);
    } else {
        console.log('✅ Base de datos agenda.db creada o abierta exitosamente.');
    }
});

bd.serialize(() => {
    // Grupos de contacto
    bd.run(`CREATE TABLE IF NOT EXISTS grupos_contacto (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL
    )`);

    // Contactos
    bd.run(`CREATE TABLE IF NOT EXISTS contactos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        telefono_fijo TEXT,
        celular TEXT,
        whatsapp TEXT,
        direccion TEXT,
        email TEXT,
        facebook TEXT,
        fecha_nacimiento DATE,
        empresa TEXT,
        grupo_id INTEGER,
        foto_url TEXT,
        creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (grupo_id) REFERENCES grupos_contacto(id)
    )`);

    // Citas
    bd.run(`CREATE TABLE IF NOT EXISTS citas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contacto_id INTEGER,
        fecha DATE,
        hora TIME,
        descripcion TEXT,
        lugar TEXT,
        tipo TEXT,
        FOREIGN KEY (contacto_id) REFERENCES contactos(id)
    )`);

    // Notas
    bd.run(`CREATE TABLE IF NOT EXISTS notas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contacto_id INTEGER,
        titulo TEXT,
        contenido TEXT,
        creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contacto_id) REFERENCES contactos(id)
    )`);

    // Etiquetas
    bd.run(`CREATE TABLE IF NOT EXISTS etiquetas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL
    )`);

    // Relación contacto-etiquetas
    bd.run(`CREATE TABLE IF NOT EXISTS contacto_etiquetas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contacto_id INTEGER,
        etiqueta_id INTEGER,
        FOREIGN KEY (contacto_id) REFERENCES contactos(id),
        FOREIGN KEY (etiqueta_id) REFERENCES etiquetas(id)
    )`);

    // Tareas
    bd.run(`CREATE TABLE IF NOT EXISTS tareas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contacto_id INTEGER,
        titulo TEXT NOT NULL,
        descripcion TEXT,
        vencimiento DATE,
        completado BOOLEAN DEFAULT 0,
        creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contacto_id) REFERENCES contactos(id)
    )`);

    console.log('📦 Tablas creadas correctamente.');
});

bd.close();