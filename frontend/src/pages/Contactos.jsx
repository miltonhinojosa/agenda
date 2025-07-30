import React, { useEffect, useState } from 'react';

function Contactos() {
    const [contactos, setContactos] = useState([]);

    useEffect(() => {
        fetch('http://localhost:3000/api/contactos')
            .then(res => res.json())
            .then(data => setContactos(data))
            .catch(err => console.error('Error al cargar contactos:', err));
    }, []);

    return (
        <div>
            <h2 style={{ marginBottom: '1rem' }}>📒 Contactos Registrados</h2>
            {contactos.length === 0 ? (
                <p>No hay contactos aún.</p>
            ) : (
                contactos.map((c) => (
                    <div
                        key={c.id}
                        style={{
                            border: '1px solid #ccc',
                            marginBottom: '10px',
                            padding: '15px',
                            borderRadius: '10px',
                            backgroundColor: '#f8f8f8',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                    >
                        <h4 style={{ margin: '0 0 10px 0' }}>{c.nombre}</h4>
                        <p>📞 {c.celular} | 📠 {c.telefono_fijo}</p>
                        <p>📍 {c.direccion}</p>
                        <p>📧 {c.email}</p>
                    </div>
                ))
            )}
        </div>
    );
}

export default Contactos;

