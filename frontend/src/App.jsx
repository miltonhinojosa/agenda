// frontend/src/App.jsx
import React, { useEffect, useState } from 'react';
import Contactos from './components/Contactos';
import Eventos from './components/Eventos';
import Citas from './components/Citas';
import Notas from './components/Notas';
import Tareas from './components/Tareas';
import Auth from './components/Auth';
import Home from './components/Home';
import CitasNotifier from './hooks/useCitasNotificaciones.jsx';


const API = 'http://localhost:3000/api';

const App = () => {
  const [seccion, setSeccion] = useState('home');
  const [modoOscuro, setModoOscuro] = useState(false);

  // === Autenticación ===
  const [user, setUser] = useState(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);

  const toggleModo = () => {
    document.documentElement.classList.toggle('dark');
    setModoOscuro(!modoOscuro);
  };

  const checkAuth = async () => {
    try {
      const r = await fetch(`${API}/auth/me`, { credentials: 'include' });
      if (r.ok) {
        const j = await r.json();
        setUser(j.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setCargandoAuth(false);
    }
  };

  const logout = async () => {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const renderSeccion = () => {
    switch (seccion) {
      case 'home': return <Home />;
      case 'eventos': return <Eventos />;
      case 'citas': return <Citas />;
      case 'notas': return <Notas />;
      case 'tareas': return <Tareas />;
      default: return <Contactos />;
    }
  };

  if (cargandoAuth) return null;

  // Si no hay usuario autenticado, mostrar Auth (login/registro único)
  if (!user) {
    return <Auth onAuth={checkAuth} />;
  }

  // App normal
  return (
    <div className="min-h-screen bg-gray-100 text-black dark:bg-gray-900 dark:text-white transition-colors">
      <nav className="flex justify-between p-4 shadow-md dark:shadow-gray-700">
        <div className="flex gap-4 flex-wrap">
          <button onClick={() => setSeccion('home')}>🏠 Inicio</button>
          <button onClick={() => setSeccion('contactos')}>📇 Contactos</button>
          <button onClick={() => setSeccion('eventos')}>📅 Eventos</button>
          <button onClick={() => setSeccion('citas')}>📆 Citas</button>
          <button onClick={() => setSeccion('notas')}>📝 Notas</button>
          <button onClick={() => setSeccion('tareas')}>✅ Tareas</button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={toggleModo}>
            {modoOscuro ? '☀️ Claro' : '🌙 Oscuro'}
          </button>
          <div className="flex items-center gap-2">
            {user?.foto_url ? (
              <img
                src={`http://localhost:3000${user.foto_url}`}
                alt="Yo"
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <span>👤</span>
            )}
            <span className="text-sm opacity-80">{user?.nombre || user?.username}</span>
          </div>
          <button
            onClick={logout}
            className="px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm"
          >
            Salir
          </button>
        </div>
      </nav>

      <main className="p-6">{renderSeccion()}</main>

      {/* Notificador global: activo en cualquier sección */}
      <CitasNotifier /> {/* <- AÑADIDO */}
    </div>
  );
};

export default App;
