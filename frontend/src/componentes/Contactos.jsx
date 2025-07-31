
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
    <section>
      <h2 className="text-xl font-semibold mb-4">📇 Lista de Contactos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contactos.map(c => (
          <div key={c.id} className="bg-white dark:bg-gray-800 rounded shadow p-4">
            <h3 className="text-lg font-bold">{c.nombre}</h3>
            <p>📱 {c.celular}</p>
            <p>☎️ {c.telefono_fijo}</p>
            <p>✉️ {c.email}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Contactos;
