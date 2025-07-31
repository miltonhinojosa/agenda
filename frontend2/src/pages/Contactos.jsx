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
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">📇 Lista de Contactos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contactos.map(c => (
          <div key={c.id} className="bg-white shadow-md p-4 rounded-lg">
            <h3 className="font-semibold text-lg">{c.nombre}</h3>
            <p>📞 Celular: {c.celular}</p>
            <p>☎️ Fijo: {c.telefono_fijo}</p>
            <p>📧 {c.email}</p>
            <p>🏢 {c.empresa}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Contactos;
