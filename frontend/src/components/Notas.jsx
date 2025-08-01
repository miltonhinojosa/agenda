import React, { useEffect, useState } from 'react';

const Notas = () => {
  const [notas, setNotas] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3000/api/notas')
      .then(res => res.json())
      .then(setNotas)
      .catch(console.error);
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">📝 Notas</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {notas.map(n => (
          <div key={n.id} className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded shadow">
            <h4 className="text-lg font-semibold">{n.titulo}</h4>
            <p>{n.contenido}</p>
            <small className="block text-sm text-gray-500 dark:text-gray-300 mt-2">🗓️ {n.creado_en}</small>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notas;
