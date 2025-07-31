import React, { useEffect, useState } from 'react'

function Contactos() {
  const [contactos, setContactos] = useState([])

  useEffect(() => {
    fetch('http://localhost:3000/api/contactos')
      .then(res => res.json())
      .then(data => setContactos(data))
      .catch(err => console.error('Error al cargar contactos:', err))
  }, [])

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">📇 Contactos</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {contactos.map((c) => (
          <div key={c.id} className="border rounded p-4 shadow dark:bg-gray-800 dark:border-gray-600">
            <h3 className="text-lg font-bold">{c.nombre}</h3>
            <p>📞 {c.celular} | ☎️ {c.telefono_fijo}</p>
            <p>📧 {c.email}</p>
            <p>🏢 {c.empresa}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Contactos