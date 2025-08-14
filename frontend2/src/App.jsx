import React from 'react';
import Contactos from './pages/Contactos';
import Citas from './pages/Citas';
import './index.css';

function App() {
  return (
    <div className="bg-green-50 min-h-screen font-sans">
      <header className="bg-emerald-500 text-white sticky top-0 shadow-md z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">📆 Agenda Electrónica</h1>
          <nav className="space-x-4">
            <a href="#contactos" className="hover:underline">Contactos</a>
            <a href="#citas" className="hover:underline">Citas</a>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10 space-y-16">
        <section id="contactos">
          <h2 className="text-xl font-semibold text-emerald-700 mb-4">📒 Lista de Contactos</h2>
          <Contactos />
        </section>

        <section id="citas">
          <h2 className="text-xl font-semibold text-emerald-700 mb-4">📅 Próximas Citas</h2>
          <Citas />
        </section>
      </main>

      <footer className="bg-emerald-500 text-white text-center py-4">
        <p>© 2025 Agenda Full Stack</p>
      </footer>

      <a href="#contactos"
         className="fixed bottom-6 right-6 bg-emerald-600 text-white rounded-full p-3 shadow-md hover:bg-emerald-700 transition"
         title="Volver arriba">
        ⬆️
      </a>
    </div>
  );
}

export default App;
