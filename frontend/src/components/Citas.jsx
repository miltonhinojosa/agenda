import React, { useEffect, useState } from 'react';

const Citas = () => {
  const [citas, setCitas] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3000/api/citas')
      .then(res => res.json())
      .then(setCitas)
      .catch(console.error);
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">📆 Citas</h2>
      <ul className="space-y-4">
        {citas.map(c => (
          <li key={c.id} className="p-4 bg-gray-100 dark:bg-gray-800 rounded shadow">
            <p><strong>{c.descripcion}</strong></p>
            <p>📅 {c.fecha} 🕒 {c.hora}</p>
            <p>📍 {c.lugar}</p>
            <p>🔖 {c.tipo}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Citas;

