import React, { useEffect, useState } from 'react';

const Tareas = () => {
  const [tareas, setTareas] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3000/api/tareas')
      .then(res => res.json())
      .then(setTareas)
      .catch(console.error);
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">✅ Tareas</h2>
      <ul className="space-y-4">
        {tareas.map(t => (
          <li key={t.id} className={`p-4 rounded shadow ${t.completado ? 'bg-green-100 dark:bg-green-800' : 'bg-red-100 dark:bg-red-800'}`}>
            <h4 className="font-bold">{t.titulo}</h4>
            <p>{t.descripcion}</p>
            <p>📅 Vence: {t.vencimiento}</p>
            <p>{t.completado ? '✔️ Completado' : '⏳ Pendiente'}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Tareas;
