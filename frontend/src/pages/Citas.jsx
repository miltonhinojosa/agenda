import React from 'react';

function Citas() {
  const citasEjemplo = [
    {
      id: 1,
      titulo: 'Reunión con el equipo',
      fecha: '2025-08-01',
      hora: '10:00',
      descripcion: 'Planificación semanal de tareas.'
    },
    {
      id: 2,
      titulo: 'Cita médica',
      fecha: '2025-08-02',
      hora: '15:30',
      descripcion: 'Chequeo general con el doctor.'
    }
  ];

  return (
    <div>
      {citasEjemplo.map((cita) => (
        <div
          key={cita.id}
          style={{
            border: '1px solid #a7f3d0',
            marginBottom: '10px',
            padding: '15px',
            borderRadius: '10px',
            backgroundColor: '#ecfdf5',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <h4 style={{ margin: '0 0 5px 0' }}>{cita.titulo}</h4>
          <p>🗓️ {cita.fecha} 🕒 {cita.hora}</p>
          <p>{cita.descripcion}</p>
        </div>
      ))}
    </div>
  );
}

export default Citas;
