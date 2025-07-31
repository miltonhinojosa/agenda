
import React, { useState } from 'react';
import Contactos from './componentes/Contactos';

function App() {
  const [modoOscuro, setModoOscuro] = useState(false);

  const toggleModo = () => {
    document.documentElement.classList.toggle('dark');
    setModoOscuro(!modoOscuro);
  };

  return (
    <div className="min-h-screen p-4 transition-colors duration-300">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">📅 Agenda Electrónica</h1>
        <button
          onClick={toggleModo}
          className="px-4 py-2 rounded bg-gray-800 text-white dark:bg-gray-200 dark:text-black"
        >
          {modoOscuro ? 'Modo Claro' : 'Modo Oscuro'}
        </button>
      </header>
      <main>
        <Contactos />
      </main>
    </div>
  );
}

export default App;
