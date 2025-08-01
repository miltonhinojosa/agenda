import React, { useState } from 'react';
import Contactos from './components/Contactos';
import Citas from './components/Citas';
import Notas from './components/Notas';
import Tareas from './components/Tareas';

const App = () => {
  const [seccion, setSeccion] = useState('contactos');
  const [modoOscuro, setModoOscuro] = useState(false);

  const toggleModo = () => {
    document.documentElement.classList.toggle('dark');
    setModoOscuro(!modoOscuro);
  };

  const renderSeccion = () => {
    switch (seccion) {
      case 'citas': return <Citas />;
      case 'notas': return <Notas />;
      case 'tareas': return <Tareas />;
      default: return <Contactos />;
    }
  };

  return (
    <div className="min-h-screen bg-white text-black dark:bg-gray-900 dark:text-white transition-colors">
      <nav className="flex justify-between p-4 shadow-md dark:shadow-gray-700">
        <div className="flex gap-4">
          <button onClick={() => setSeccion('contactos')}>📇 Contactos</button>
          <button onClick={() => setSeccion('citas')}>📆 Citas</button>
          <button onClick={() => setSeccion('notas')}>📝 Notas</button>
          <button onClick={() => setSeccion('tareas')}>✅ Tareas</button>
        </div>
        <button onClick={toggleModo}>
          {modoOscuro ? '☀️ Claro' : '🌙 Oscuro'}
        </button>
      </nav>
      <main className="p-6">{renderSeccion()}</main>
    </div>
  );
};

export default App;
