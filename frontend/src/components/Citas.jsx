// Citas.jsx — mismos estilos de botones que Notas (solo UI)
import React, { useEffect, useRef, useState } from 'react';

const tiposPredef = ['Reunión', 'Llamada', 'Médico', 'Personal', 'Otro'];
const TABS = ['Pendientes', 'Archivados', 'Cancelados'];

/* ===== helper de sesión: todas las peticiones con cookies ===== */
const withCreds = (url, opts = {}) => fetch(url, { credentials: 'include', ...opts });

// ======= Persistencia mínima (local) =======
const STORAGE_KEY = 'citasNotifState';
const MUTED_KEY = 'citasMuted';
const loadJSON = (k, fb) => { try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : fb; } catch { return fb; } };
const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const loadNotifState = () => loadJSON(STORAGE_KEY, {});
const saveNotifState = (s) => saveJSON(STORAGE_KEY, s);
const loadMuted = () => loadJSON(MUTED_KEY, {});
const saveMuted = (m) => saveJSON(MUTED_KEY, m);

// ======= Helpers =======
const firstTriggerMs = (citaMs, avisoMin) => citaMs - (Math.max(0, +avisoMin || 0) * 60 * 1000);
const formatMin = (m = 0) => { const v = +m || 0; if (v === 0) return 'sin anticipación'; if (v % 60 === 0) { const h = v / 60; return h === 1 ? '1 hora' : `${h} horas`; } return `${v} min`; };
const formatRepetir = (m = 0) => { const v = +m || 0; if (v === 0) return ''; if (v % 60 === 0) { const h = v / 60; return ` • repetir cada ${h === 1 ? '1 hora' : `${h} horas`}`; } return ` • repetir cada ${v} min`; };
const formatFecha = (dt) => new Date(dt).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatHora = (dt) => new Date(dt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });

// Convierte fecha+hora a ms (validación)
const fechaHoraMs = (fecha, hora) => { if (!fecha || !hora) return NaN; return new Date(`${fecha}T${hora}:00`).getTime(); };

const estadosForTab = (tab) => {
  if (tab === 'Archivados') return ['Archivado'];
  if (tab === 'Cancelados') return ['Cancelado'];
  return ['Pendiente', 'Activo'];
};

const Citas = () => {
  const [citas, setCitas] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [tab, setTab] = useState('Pendientes');

  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [citaEditandoId, setCitaEditandoId] = useState(null);

  const [nuevaCita, setNuevaCita] = useState({
    contacto_id: '',
    fecha: '',
    hora: '',
    descripcion: '',
    lugar: '',
    tipo: '',
    aviso_anticipado_min: 0,
    recordatorio_cada_min: 0,
    estado: 'Pendiente',
  });

  const [notifState, setNotifState] = useState({});
  const [muted, setMuted] = useState({});
  const activacionesRef = useRef(new Set());

  // Toast simple
  const [toast, setToast] = useState(null);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  // Audio
  const bellRef = useRef(null);
  const [audioReady, setAudioReady] = useState(false);
  useEffect(() => {
    const unlock = () => {
      if (bellRef.current && !audioReady) {
        bellRef.current.play().then(() => {
          bellRef.current.pause(); bellRef.current.currentTime = 0; setAudioReady(true);
        }).catch(() => {});
      }
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => { window.removeEventListener('click', unlock); window.removeEventListener('keydown', unlock); };
  }, [audioReady]);

  // Datos
  const cargarContactos = () => {
    withCreds('http://localhost:3000/api/contactos')
      .then(r => r.json())
      .then(setContactos)
      .catch(console.error);
  };
  const cargarCitas = () => {
    const estados = estadosForTab(tab).join(',');
    withCreds(`http://localhost:3000/api/citas?estado=${encodeURIComponent(estados)}`)
      .then(r => r.json())
      .then(arr => {
        setCitas(arr);
        activacionesRef.current = new Set(arr.filter(c => c.estado === 'Activo').map(c => c.id));
      })
      .catch(console.error);
  };
  useEffect(() => { cargarContactos(); }, []);
  useEffect(() => { cargarCitas(); }, [tab]);

  const nombreContacto = (id) => contactos.find(ct => ct.id === id)?.nombre || '—';

  // Permiso notificaciones
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Estado local persistente
  useEffect(() => { setNotifState(loadNotifState()); setMuted(loadMuted()); }, []);
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setNotifState(loadNotifState());
      if (e.key === MUTED_KEY) setMuted(loadMuted());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Inicializa programación local por cita
  useEffect(() => {
    if (!Array.isArray(citas) || citas.length === 0) return;
    const now = Date.now();
    const updated = { ...notifState };

    citas.forEach(c => {
      if (!c.fecha || !c.hora) return;
      const citaMs = new Date(`${c.fecha}T${c.hora}:00`).getTime();
      const aviso = Number.isFinite(+c.aviso_anticipado_min) ? +c.aviso_anticipado_min : 0;
      const rep = (c.recordatorio_cada_min ? +c.recordatorio_cada_min : 0) || 0;
      const firstAt = firstTriggerMs(citaMs, aviso);

      let mode = 'single0';
      if (rep > 0) mode = 'repeat';
      else if (aviso > 0) mode = 'two-step';

      const existed = updated[c.id];
      if (!existed) {
        if (mode === 'single0') {
          updated[c.id] = { nextAt: citaMs, last: null, mode, citaAt: citaMs };
          if (now > citaMs + 5 * 60 * 1000) updated[c.id].nextAt = Infinity;
        } else if (mode === 'two-step') {
          const step = now <= firstAt ? 1 : (now <= citaMs ? 2 : 3);
          const nextAt = step === 1 ? firstAt : (step === 2 ? citaMs : Infinity);
          updated[c.id] = { nextAt, last: null, mode, step: step === 3 ? 2 : step, citaAt: citaMs };
        } else {
          const base = now <= firstAt ? firstAt : now;
          updated[c.id] = { nextAt: base, last: null, mode, citaAt: citaMs };
        }
      } else {
        const s = existed;
        s.mode = mode; s.citaAt = citaMs;
        if (mode === 'single0') {
          if (s.nextAt < citaMs - 1000 || s.nextAt === undefined) s.nextAt = citaMs;
          if (now > citaMs + 5 * 60 * 1000) s.nextAt = Infinity;
        } else if (mode === 'two-step') {
          const step = s.step ?? (now <= firstAt ? 1 : (now <= citaMs ? 2 : 3));
          s.step = step;
          if (step === 1 && s.nextAt !== firstAt) s.nextAt = firstAt;
          if (step === 2 && s.nextAt < citaMs - 1000) s.nextAt = citaMs;
          if (step === 3) s.nextAt = Infinity;
        } else {
          if (s.nextAt === undefined || s.nextAt === Infinity) s.nextAt = now;
        }
      }

      if (mode !== 'repeat' && now > citaMs + 5 * 60 * 1000) {
        updated[c.id].nextAt = Infinity;
      }
    });

    Object.keys(updated).forEach(idStr => {
      const id = +idStr;
      if (!citas.some(c => c.id === id)) delete updated[idStr];
    });

    setNotifState(updated);
    saveNotifState(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citas]);

  // Cambiar estado en backend
  const cambiarEstado = async (id, estado) => {
    try {
      await withCreds(`http://localhost:3000/api/citas/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado })
      });
      cargarCitas();
    } catch (e) {
      console.error('Error al cambiar estado:', e);
      alert('No se pudo cambiar el estado.');
    }
  };

  // Ticker de disparo (10s) — muestra toast y suena
  useEffect(() => {
    const tick = async () => {
      const now = Date.now();
      let changed = false;
      const nextState = { ...notifState };
      const mutedMap = { ...muted };

      for (const c of citas) {
        if (!c.fecha || !c.hora) continue;
        const entry = nextState[c.id];
        if (!entry) continue;

        // Auto-activar al entrar a ventana si estaba en Pendiente
        try {
          const citaMs = new Date(`${c.fecha}T${c.hora}:00`).getTime();
          const aviso = Number.isFinite(+c.aviso_anticipado_min) ? +c.aviso_anticipado_min : 0;
          const firstAt = firstTriggerMs(citaMs, aviso);
          const enVentana = now >= firstAt && now <= (citaMs + 5 * 60 * 1000);

          if (c.estado === 'Pendiente' && enVentana && !activacionesRef.current.has(c.id)) {
            activacionesRef.current.add(c.id);
            cambiarEstado(c.id, 'Activo');
          }
        } catch {}

        if (mutedMap[c.id]) continue;
        const rep = (c.recordatorio_cada_min ? +c.recordatorio_cada_min : 0) || 0;

        if (now >= entry.nextAt) {
          try {
            if ('serviceWorker' in navigator) {
              const reg = await navigator.serviceWorker.ready;
              await reg.showNotification('⏰ Cita', {
                body: `${c.descripcion || 'Sin descripción'} • ${c.fecha} ${c.hora}`,
                icon: '/icono.png',
                badge: '/icono.png',
                tag: `cita-${c.id}`,
                renotify: true
              });
            } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification('⏰ Cita', {
                body: `${c.descripcion || 'Sin descripción'} • ${c.fecha} ${c.hora}`,
                icon: '/icono.png',
                tag: `cita-${c.id}`,
                renotify: true
              });
            }
          } catch {}
          if (bellRef.current) { try { bellRef.current.currentTime = 0; await bellRef.current.play(); } catch {} }
          if (document.visibilityState === 'visible') {
            showToast(`⏰ Cita: ${c.descripcion || 'Sin descripción'} • ${c.fecha} ${c.hora}`);
          }

          if (entry.mode === 'single0') entry.nextAt = Infinity;
          else if (entry.mode === 'two-step') {
            if ((entry.step ?? 1) === 1) { entry.step = 2; entry.nextAt = entry.citaAt; }
            else { entry.step = 3; entry.nextAt = Infinity; }
          } else {
            entry.nextAt = rep > 0 ? now + rep * 60 * 1000 : Infinity;
          }
          entry.last = now;
          changed = true;
        }
      }

      if (changed) { setNotifState(nextState); saveNotifState(nextState); }
    };

    const id = setInterval(() => { tick(); }, 10000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citas, notifState, muted]);

  // Parar avisos (archiva)
  const pararAviso = async (id) => {
    setMuted(prev => { const m = { ...prev, [id]: true }; saveMuted(m); return m; });
    setNotifState(prev => {
      const n = { ...prev };
      if (!n[id]) n[id] = { nextAt: Infinity, last: Date.now(), mode: 'single0', citaAt: Date.now() };
      else n[id].nextAt = Infinity;
      saveNotifState(n);
      return n;
    });
    await cambiarEstado(id, 'Archivado');
  };

  // CRUD UI
  const abrirNuevo = () => {
    setModoEdicion(false);
    setCitaEditandoId(null);
    setNuevaCita({
      contacto_id: '', fecha: '', hora: '', descripcion: '', lugar: '', tipo: '',
      aviso_anticipado_min: 0, recordatorio_cada_min: 0, estado: 'Pendiente'
    });
    setMostrarModal(true);
  };

  const abrirEditar = (c) => {
    setModoEdicion(true);
    setCitaEditandoId(c.id);
    setNuevaCita({
      contacto_id: c.contacto_id || '',
      fecha: c.fecha || '',
      hora: c.hora || '',
      descripcion: c.descripcion || '',
      lugar: c.lugar || '',
      tipo: c.tipo || '',
      aviso_anticipado_min: c.aviso_anticipado_min ?? 0,
      recordatorio_cada_min: c.recordatorio_cada_min ?? 0,
      estado: c.estado || 'Pendiente'
    });
    setMostrarModal(true);
  };

  const guardarCita = async () => {
    // Validación: fecha/hora futuras
    const ms = fechaHoraMs(nuevaCita.fecha, nuevaCita.hora);
    if (!Number.isFinite(ms) || ms < Date.now()) {
      alert('La fecha y hora no pueden ser anteriores al momento actual.');
      return;
    }
    const body = {
      ...nuevaCita,
      aviso_anticipado_min: +nuevaCita.aviso_anticipado_min || 0,
      recordatorio_cada_min: +nuevaCita.recordatorio_cada_min || 0,
    };
    if (modoEdicion) body.estado = 'Pendiente';

    const method = modoEdicion ? 'PUT' : 'POST';
    const endpoint = modoEdicion
      ? `http://localhost:3000/api/citas/${citaEditandoId}`
      : 'http://localhost:3000/api/citas';

    await withCreds(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    // Limpiar programación/mute locales si era edición
    if (modoEdicion && citaEditandoId) {
      setNotifState(prev => { const n = { ...prev }; delete n[citaEditandoId]; saveNotifState(n); return n; });
      setMuted(prev => { const m = { ...prev }; delete m[citaEditandoId]; saveMuted(m); return m; });
    }

    setMostrarModal(false);
    setModoEdicion(false);
    setCitaEditandoId(null);
    cargarCitas();
  };

  const borrarCita = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta cita?')) return;
    await withCreds(`http://localhost:3000/api/citas/${id}`, { method: 'DELETE' });
    setNotifState(prev => { const n = { ...prev }; delete n[id]; saveNotifState(n); return n; });
    setMuted(prev => { const m = { ...prev }; delete m[id]; saveMuted(m); return m; });
    cargarCitas();
  };

  // ======= UI =======
  return (
    <div className="px-2 py-2">
      <audio ref={bellRef} src="/sonido-alerta.mp3" preload="auto" />
      {toast && (
        <div className="fixed top-4 right-4 z-[9999] bg-black text-white px-4 py-3 rounded shadow-lg">
          {toast}
        </div>
      )}

      {/* Encabezado */}
      <div className="mb-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="flex-1 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">📅 Citas</h2>

            <div className="flex gap-2 flex-wrap">
              {TABS.map(t => {
                const active = t === tab;
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors
                      ${active
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="🔍 Buscar (contacto, lugar, tipo, descripción)"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full sm:w-80 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={abrirNuevo}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800
                         transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              ➕ Nueva cita
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
        {citas
          .filter(c => {
            const t = busqueda.toLowerCase();
            return (
              (nombreContacto(c.contacto_id) || '').toLowerCase().includes(t) ||
              (c.lugar || '').toLowerCase().includes(t) ||
              (c.tipo || '').toLowerCase().includes(t) ||
              (c.descripcion || '').toLowerCase().includes(t)
            );
          })
          .map(c => {
            const activa = c.estado === 'Activo';
            const dt = new Date(`${c.fecha}T${c.hora}:00`);

            return (
              <div
                key={c.id}
                className={`relative h-full flex flex-col p-4 rounded-2xl shadow-sm ring-1 ring-inset ring-black/5
                  bg-gray-200 dark:bg-gray-800 border border-transparent
                  ${activa ? 'animate-pulse ring-2 ring-amber-400 dark:ring-amber-300' : ''}`}
              >
                {/* Cabecera */}
                <div className="grid grid-cols-[1fr,auto] gap-3 items-start">
                  <div>
                    <h3 className="font-semibold text-base text-gray-800 dark:text-gray-100">
                      {nombreContacto(c.contacto_id)}
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      📅 {formatFecha(dt)} — ⏰ {formatHora(dt)}
                    </p>
                  </div>
                  <span className="justify-self-end text-xs px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-100">
                    {c.tipo || '—'}
                  </span>
                </div>

                {/* Lugar y descripción */}
                {(c.lugar || c.descripcion) && (
                  <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                    {c.lugar && <p>📍 {c.lugar}</p>}
                    {c.descripcion && <p>📝 {c.descripcion}</p>}
                  </div>
                )}

                {/* Línea info + estado */}
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {c.aviso_anticipado_min === 0 ? 'Sin anticipación' : `Notificar ${formatMin(c.aviso_anticipado_min)} antes`}
                  {formatRepetir(c.recordatorio_cada_min)}
                  <span className="ml-2 px-2 py-0.5 rounded bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-100">
                    {c.estado}
                  </span>
                </div>

                {/* Acciones (igual que Notas: abajo a la derecha) */}
                <div className="mt-auto pt-3 flex justify-end gap-2 border-t border-black/10">
                  {(c.estado === 'Pendiente' || c.estado === 'Activo') && (
                    <button
                      onClick={() => cambiarEstado(c.id, 'Cancelado')}
                      className="px-3 py-1 text-xs rounded-lg bg-gray-500 text-white hover:bg-gray-600 active:bg-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                  )}

                  {c.estado === 'Activo' && (
                    <button
                      onClick={() => pararAviso(c.id)}
                      className="px-3 py-1 text-xs rounded-lg bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 transition-colors"
                      title="Detener recordatorios (archivar)"
                    >
                      Parar avisos
                    </button>
                  )}

                  <button
                    onClick={() => abrirEditar(c)}
                    className="px-3 py-1 text-xs rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => borrarCita(c.id)}
                    className="px-3 py-1 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* Modal */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto
                          shadow-xl ring-1 ring-black/10">
            <h3 className="text-xl font-bold mb-4 text-center">
              {modoEdicion ? '✏️ Editar cita' : '➕ Nueva cita'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Contacto */}
              <div className="md:col-span-2">
                <label className="block text-xs mb-1">Contacto <span className="text-red-500">*</span></label>
                <select
                  name="contacto_id"
                  value={nuevaCita.contacto_id}
                  onChange={(e) => setNuevaCita({ ...nuevaCita, contacto_id: e.target.value })}
                  required
                  className={`w-full px-2 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2
                    ${!nuevaCita.contacto_id ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500'}
                    bg-white text-black dark:bg-gray-800 dark:text-white`}
                >
                  <option value="">-- Selecciona contacto --</option>
                  {contactos.map(ct => (
                    <option key={ct.id} value={ct.id}>{ct.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs mb-1">Fecha <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={nuevaCita.fecha}
                  onChange={(e) => setNuevaCita({ ...nuevaCita, fecha: e.target.value })}
                  required
                  className={`w-full px-2 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2
                    ${!nuevaCita.fecha ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500'}
                    dark:bg-gray-800 dark:text-white`}
                />
              </div>

              {/* Hora */}
              <div>
                <label className="block text-xs mb-1">Hora <span className="text-red-500">*</span></label>
                <input
                  type="time"
                  value={nuevaCita.hora}
                  onChange={(e) => setNuevaCita({ ...nuevaCita, hora: e.target.value })}
                  required
                  className={`w-full px-2 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2
                    ${!nuevaCita.hora ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500'}
                    dark:bg-gray-800 dark:text-white`}
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-xs mb-1">Tipo</label>
                <select
                  value={nuevaCita.tipo}
                  onChange={(e) => setNuevaCita({ ...nuevaCita, tipo: e.target.value })}
                  className="w-full px-2 py-2 rounded-xl border text-sm border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">(Sin tipo)</option>
                  {tiposPredef.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Lugar */}
              <div>
                <label className="block text-xs mb-1">Lugar</label>
                <input
                  type="text"
                  value={nuevaCita.lugar}
                  onChange={(e) => setNuevaCita({ ...nuevaCita, lugar: e.target.value })}
                  className="w-full px-2 py-2 rounded-xl border text-sm border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* Descripción */}
              <div className="md:col-span-2">
                <label className="block text-xs mb-1">Descripción</label>
                <textarea
                  value={nuevaCita.descripcion}
                  onChange={(e) => setNuevaCita({ ...nuevaCita, descripcion: e.target.value })}
                  rows={3}
                  className="w-full px-2 py-2 rounded-xl border text-sm border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* Notificar (minutos) */}
              <select
                value={nuevaCita.aviso_anticipado_min}
                onChange={(e) => setNuevaCita({ ...nuevaCita, aviso_anticipado_min: +e.target.value })}
                className="w-full px-2 py-2 rounded-xl border text-sm border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value={0}>Sin anticipación</option>
                {[5,10,15,20,30,45,60,120].map(v => (
                  <option key={v} value={v}>{v % 60 === 0 ? (v/60 === 1 ? '1 hora' : `${v/60} horas`) : `${v} min`}</option>
                ))}
              </select>

              {/* Repetir cada (min) */}
              <select
                value={nuevaCita.recordatorio_cada_min}
                onChange={(e) => setNuevaCita({ ...nuevaCita, recordatorio_cada_min: +e.target.value })}
                className="w-full px-2 py-2 rounded-xl border text-sm border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value={0}>Sin repetición</option>
                {[5,10,15,20,30,45,60,120].map(v => (
                  <option key={v} value={v}>{v % 60 === 0 ? (v/60 === 1 ? '1 hora' : `${v/60} horas`) : `${v} min`}</option>
                ))}
              </select>
            </div>

            {/* Botones modal al estilo Notas */}
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setMostrarModal(false); setModoEdicion(false); setCitaEditandoId(null); }}
                className="px-4 py-1 rounded-xl bg-gray-600 text-white hover:bg-gray-700
                           focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={guardarCita}
                disabled={!nuevaCita.contacto_id || !nuevaCita.fecha || !nuevaCita.hora}
                className="px-4 py-1 rounded-xl bg-green-600 text-white hover:bg-green-700
                           focus:outline-none focus:ring-2 focus:ring-green-400 text-sm
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {modoEdicion ? 'Guardar cambios' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Citas;
