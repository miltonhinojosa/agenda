// frontend/src/components/Eventos.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

const API = "http://localhost:3000/api";
const COLORS = [
  { key: "slate",   bg: "bg-slate-200 dark:bg-slate-800", ring: "ring-slate-400" },
  { key: "amber",   bg: "bg-amber-200 dark:bg-amber-800", ring: "ring-amber-400" },
  { key: "emerald", bg: "bg-emerald-200 dark:bg-emerald-800", ring: "ring-emerald-400" },
  { key: "sky",     bg: "bg-sky-200 dark:bg-sky-800", ring: "ring-sky-400" },
  { key: "violet",  bg: "bg-violet-200 dark:bg-violet-800", ring: "ring-violet-400" },
  { key: "rose",    bg: "bg-rose-200 dark:bg-rose-800", ring: "ring-rose-400" },
];

const isEmpty = (v) => v == null || String(v).trim() === "";
const fmtDateTime = (s) => (s ? new Date(s).toLocaleString() : "");
const colorToTailwind = (key) => COLORS.find(c => c.key === key)?.bg || "bg-gray-200 dark:bg-gray-800";
const selectMinutes = [0,5,10,15,20,30,45,60,120];

// ======= Persistencia local de notificaciones (igual esquema que Citas) =======
const STORAGE_KEY = "eventosNotifState";
const MUTED_KEY = "eventosMuted";
const loadJSON = (k, fb) => { try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : fb; } catch { return fb; } };
const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// Cálculo de primer disparo: inicio - (aviso_min)
const firstTriggerMs = (inicioMs, avisoMin) => inicioMs - (Math.max(0, +avisoMin || 0) * 60 * 1000);

const Eventos = () => {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [tab, setTab] = useState("Activo"); // Activo | Archivado | Cancelado | Todos
  const [busqueda, setBusqueda] = useState("");

  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [eventoEditando, setEventoEditando] = useState(null);

  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    ubicacion: "",
    categoria: "",
    color: "slate",
    inicio: "",
    fin: "",
    todo_dia: 0,
    aviso_min: 0,
    repetir_cada_min: 0,
    estado: "Activo",
  });

  // ======= Notificaciones (estado local + mute) =======
  const [notifState, setNotifState] = useState({});
  const [muted, setMuted] = useState({});
  const bellRef = useRef(null);
  const [audioReady, setAudioReady] = useState(false);

  // Toast simple
  const [toast, setToast] = useState(null);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  // ==== Cargar datos ====
  const cargarEventos = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({ estado: tab });
      const r = await fetch(`${API}/eventos?${params.toString()}`, { credentials: "include" });
      const data = await r.json();
      setEventos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando eventos:", e);
      setEventos([]);
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => { cargarEventos(); }, [tab]);

  // ==== Filtro y orden ====
  const filtrados = useMemo(() => {
    const t = busqueda.toLowerCase();
    return eventos
      .filter((e) =>
        (e.titulo || "").toLowerCase().includes(t) ||
        (e.descripcion || "").toLowerCase().includes(t) ||
        (e.ubicacion || "").toLowerCase().includes(t) ||
        (e.categoria || "").toLowerCase().includes(t)
      )
      .sort((a, b) => {
        const da = a.inicio ? new Date(a.inicio).getTime() : Infinity;
        const db = b.inicio ? new Date(b.inicio).getTime() : Infinity;
        return da - db;
      });
  }, [eventos, busqueda]);

  // ==== Permiso notificaciones ====
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // ==== Preparar audio al primer click/tecla ====
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

  // ==== Cargar estado local persistente ====
  useEffect(() => {
    setNotifState(loadJSON(STORAGE_KEY, {}));
    setMuted(loadJSON(MUTED_KEY, {}));
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setNotifState(loadJSON(STORAGE_KEY, {}));
      if (e.key === MUTED_KEY) setMuted(loadJSON(MUTED_KEY, {}));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // ==== Inicializar programación por evento (al cambiar listado) ====
  useEffect(() => {
    if (!Array.isArray(eventos) || eventos.length === 0) return;
    const now = Date.now();
    const updated = { ...notifState };

    eventos.forEach(ev => {
      if (!ev.inicio) return;
      // Solo consideramos eventos activos para notificar
      if (ev.estado !== 'Activo') return;

      const inicioMs = new Date(ev.inicio).getTime();
      const finMs = ev.fin ? new Date(ev.fin).getTime() : (inicioMs + 2 * 60 * 60 * 1000); // si no hay fin, 2h de ventana
      const aviso = Number.isFinite(+ev.aviso_min) ? +ev.aviso_min : 0;
      const rep = (ev.repetir_cada_min ? +ev.repetir_cada_min : 0) || 0;
      const firstAt = firstTriggerMs(inicioMs, aviso);

      // Modos: 'single0' (solo a la hora), 'two-step' (previo + hora), 'repeat' (repetición)
      let mode = 'single0';
      if (rep > 0) mode = 'repeat';
      else if (aviso > 0) mode = 'two-step';

      const existed = updated[ev.id];
      if (!existed) {
        if (mode === 'single0') {
          updated[ev.id] = { nextAt: inicioMs, last: null, mode, inicioMs, finMs };
          if (now > finMs + 5 * 60 * 1000) updated[ev.id].nextAt = Infinity;
        } else if (mode === 'two-step') {
          const step = now <= firstAt ? 1 : (now <= inicioMs ? 2 : 3);
          const nextAt = step === 1 ? firstAt : (step === 2 ? inicioMs : Infinity);
          updated[ev.id] = { nextAt, last: null, mode, step: step === 3 ? 2 : step, inicioMs, finMs };
        } else {
          const base = now <= firstAt ? firstAt : now; // si ya pasó el previo, dispara pronto
          updated[ev.id] = { nextAt: base, last: null, mode, inicioMs, finMs };
        }
      } else {
        const s = existed;
        s.mode = mode; s.inicioMs = inicioMs; s.finMs = finMs;
        if (mode === 'single0') {
          if (s.nextAt < inicioMs - 1000 || s.nextAt === undefined) s.nextAt = inicioMs;
          if (now > finMs + 5 * 60 * 1000) s.nextAt = Infinity;
        } else if (mode === 'two-step') {
          const step = s.step ?? (now <= firstAt ? 1 : (now <= inicioMs ? 2 : 3));
          s.step = step;
          if (step === 1 && s.nextAt !== firstAt) s.nextAt = firstAt;
          if (step === 2 && s.nextAt < inicioMs - 1000) s.nextAt = inicioMs;
          if (step === 3) s.nextAt = Infinity;
        } else {
          if (s.nextAt === undefined || s.nextAt === Infinity) s.nextAt = now;
        }
      }

      // Si ya terminó hace rato, no volver a notificar
      if (now > finMs + 5 * 60 * 1000) {
        updated[ev.id].nextAt = Infinity;
      }
    });

    // Limpia estados de eventos que ya no existen o no están activos
    Object.keys(updated).forEach(idStr => {
      const id = +idStr;
      const ev = eventos.find(x => x.id === id);
      if (!ev || ev.estado !== 'Activo') delete updated[idStr];
    });

    setNotifState(updated);
    saveJSON(STORAGE_KEY, updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventos]);

  // ==== Ticker de disparo (cada 10s) ====
  useEffect(() => {
    const tick = async () => {
      const now = Date.now();
      let changed = false;
      const nextState = { ...notifState };
      const mutedMap = { ...muted };

      for (const ev of eventos) {
        if (!ev.inicio || ev.estado !== 'Activo') continue;
        const entry = nextState[ev.id];
        if (!entry) continue;
        if (mutedMap[ev.id]) continue;

        const rep = (ev.repetir_cada_min ? +ev.repetir_cada_min : 0) || 0;

        if (now >= entry.nextAt && now <= (entry.finMs + 5 * 60 * 1000)) {
          // Notificar
          try {
            if ('serviceWorker' in navigator) {
              const reg = await navigator.serviceWorker.ready;
              await reg.showNotification('⏰ Evento', {
                body: `${ev.titulo} • ${fmtDateTime(ev.inicio)}${ev.fin ? ' – ' + fmtDateTime(ev.fin) : ''}`,
                icon: '/icono.png',
                badge: '/icono.png',
                tag: `evento-${ev.id}`,
                renotify: true
              });
            } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification('⏰ Evento', {
                body: `${ev.titulo} • ${fmtDateTime(ev.inicio)}${ev.fin ? ' – ' + fmtDateTime(ev.fin) : ''}`,
                icon: '/icono.png',
                tag: `evento-${ev.id}`,
                renotify: true
              });
            }
          } catch {}

          if (bellRef.current) {
            try { bellRef.current.currentTime = 0; await bellRef.current.play(); } catch {}
          }
          if (document.visibilityState === 'visible') {
            showToast(`⏰ ${ev.titulo} • ${fmtDateTime(ev.inicio)}${ev.fin ? ' – ' + fmtDateTime(ev.fin) : ''}`);
          }

          // Siguiente disparo según modo
          if (entry.mode === 'single0') {
            entry.nextAt = Infinity;
          } else if (entry.mode === 'two-step') {
            if ((entry.step ?? 1) === 1) { entry.step = 2; entry.nextAt = entry.inicioMs; }
            else { entry.step = 3; entry.nextAt = Infinity; }
          } else {
            // repeat
            const next = now + rep * 60 * 1000;
            // no repetir más allá del fin + 5min
            entry.nextAt = Math.min(next, entry.finMs + 5 * 60 * 1000);
          }
          entry.last = now;
          changed = true;
        }
      }

      if (changed) { setNotifState(nextState); saveJSON(STORAGE_KEY, nextState); }
    };

    const id = setInterval(() => { tick(); }, 10000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventos, notifState, muted]);

  // ==== Acciones API ====
  const guardar = async () => {
    if (isEmpty(form.titulo) || isEmpty(form.inicio)) return;

    const payload = {
      ...form,
      titulo: form.titulo.trim(),
      descripcion: (form.descripcion || "").trim(),
      ubicacion: (form.ubicacion || "").trim(),
      categoria: (form.categoria || "").trim(),
      color: form.color || null,
      inicio: form.inicio,
      fin: form.fin || null,
      todo_dia: form.todo_dia ? 1 : 0,
      aviso_min: Number(form.aviso_min) || 0,
      repetir_cada_min: Number(form.repetir_cada_min) || 0,
      estado: form.estado || "Activo",
    };

    const url = modoEdicion ? `${API}/eventos/${eventoEditando.id}` : `${API}/eventos`;
    const method = modoEdicion ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    // Si era edición, resetea programación local para ese id
    if (modoEdicion && eventoEditando?.id) {
      setNotifState(prev => { const n = { ...prev }; delete n[eventoEditando.id]; saveJSON(STORAGE_KEY, n); return n; });
      setMuted(prev => { const m = { ...prev }; delete m[eventoEditando.id]; saveJSON(MUTED_KEY, m); return m; });
    }

    setMostrarModal(false);
    setModoEdicion(false);
    setEventoEditando(null);
    cargarEventos();
  };

  const eliminarEvento = async (id) => {
    if (!window.confirm("¿Eliminar este evento?")) return;
    await fetch(`${API}/eventos/${id}`, { method: "DELETE", credentials: "include" });
    setNotifState(prev => { const n = { ...prev }; delete n[id]; saveJSON(STORAGE_KEY, n); return n; });
    setMuted(prev => { const m = { ...prev }; delete m[id]; saveJSON(MUTED_KEY, m); return m; });
    cargarEventos();
  };

  const cambiarEstado = async (ev, estado) => {
    await fetch(`${API}/eventos/${ev.id}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
      credentials: "include",
    });
    // Si se archiva/cancela, silencia y corta programación local
    if (estado !== 'Activo') {
      setMuted(prev => { const m = { ...prev, [ev.id]: true }; saveJSON(MUTED_KEY, m); return m; });
      setNotifState(prev => { const n = { ...prev }; if (n[ev.id]) n[ev.id].nextAt = Infinity; saveJSON(STORAGE_KEY, n); return n; });
    }
    cargarEventos();
  };

  const pararAviso = async (ev) => {
    // silencia local y archiva
    setMuted(prev => { const m = { ...prev, [ev.id]: true }; saveJSON(MUTED_KEY, m); return m; });
    setNotifState(prev => { const n = { ...prev }; if (!n[ev.id]) n[ev.id] = { nextAt: Infinity }; else n[ev.id].nextAt = Infinity; saveJSON(STORAGE_KEY, n); return n; });
    await cambiarEstado(ev, 'Archivado');
  };

  const abrirNuevo = () => {
    setModoEdicion(false);
    setEventoEditando(null);
    setForm({
      titulo: "",
      descripcion: "",
      ubicacion: "",
      categoria: "",
      color: "slate",
      inicio: "",
      fin: "",
      todo_dia: 0,
      aviso_min: 0,
      repetir_cada_min: 0,
      estado: tab === "Archivado" ? "Archivado" : tab === "Cancelado" ? "Cancelado" : "Activo",
    });
    setMostrarModal(true);
  };

  const abrirEditar = (ev) => {
    setModoEdicion(true);
    setEventoEditando(ev);
    setForm({
      titulo: ev.titulo || "",
      descripcion: ev.descripcion || "",
      ubicacion: ev.ubicacion || "",
      categoria: ev.categoria || "",
      color: ev.color || "slate",
      inicio: ev.inicio || "",
      fin: ev.fin || "",
      todo_dia: ev.todo_dia ? 1 : 0,
      aviso_min: ev.aviso_min || 0,
      repetir_cada_min: ev.repetir_cada_min || 0,
      estado: ev.estado || "Activo",
    });
    setMostrarModal(true);
  };

  // ==== Renderizado ====
  return (
    <div className="px-2 py-2">
      <audio ref={bellRef} src="/sonido-alerta.mp3" preload="auto" />
      {toast && (
        <div className="fixed top-4 right-4 z-[9999] bg-black text-white px-4 py-3 rounded shadow-lg">
          {toast}
        </div>
      )}

      {/* Encabezado */}
      <div className="mb-3">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="flex-1 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              📆 Eventos
            </h2>

            <div className="flex gap-2 flex-wrap">
              {["Activo", "Archivado", "Cancelado", "Todos"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors
                    ${
                      tab === t
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Búsqueda + Nuevo */}
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="🔍 Buscar título, lugar, categoría"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full sm:w-80 px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
            <button
              onClick={abrirNuevo}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800
                         transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              ➕ Nuevo
            </button>
          </div>
        </div>
      </div>

      {/* Grilla */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {cargando &&
          [...Array(6)].map((_, i) => (
            <div key={i} className="p-4 rounded-2xl ring-1 ring-black/5 bg-gray-200 dark:bg-gray-800 animate-pulse h-40" />
          ))}

        {!cargando && filtrados.length === 0 && (
          <div className="col-span-full text-center py-10 text-gray-500 dark:text-gray-400">
            No hay eventos para mostrar.
          </div>
        )}

        {!cargando &&
          filtrados.map((ev) => (
            <div
              key={ev.id}
              className={`h-full flex flex-col p-4 rounded-2xl shadow-sm ring-1 ring-inset ring-black/5 ${colorToTailwind(
                ev.color
              )}`}
            >
              {/* Cabecera */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {ev.titulo}
                  </h3>
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    {ev.todo_dia ? "🗓️ Todo el día" : `🕒 ${fmtDateTime(ev.inicio)}${ev.fin ? " – " + fmtDateTime(ev.fin) : ""}`}
                  </p>
                  {(ev.ubicacion || ev.categoria) && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {ev.ubicacion ? `📍 ${ev.ubicacion}` : ""} {ev.categoria ? `• 🏷️ ${ev.categoria}` : ""}
                    </p>
                  )}
                </div>

                {/* Estados rápidos */}
                <div className="flex flex-col gap-1">
                  {ev.estado !== "Archivado" && (
                    <button
                      onClick={() => cambiarEstado(ev, "Archivado")}
                      className="px-2 py-1 text-xs rounded-lg bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800"
                    >
                      Archivar
                    </button>
                  )}
                  {ev.estado !== "Cancelado" && (
                    <button
                      onClick={() => cambiarEstado(ev, "Cancelado")}
                      className="px-2 py-1 text-xs rounded-lg bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800"
                    >
                      Cancelar
                    </button>
                  )}
                  {ev.estado !== "Activo" && (
                    <button
                      onClick={() => cambiarEstado(ev, "Activo")}
                      className="px-2 py-1 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 active:bg-green-800"
                    >
                      Activar
                    </button>
                  )}
                </div>
              </div>

              {ev.descripcion && (
                <p className="mt-2 text-[15px] leading-6 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {ev.descripcion}
                </p>
              )}

              {/* Acciones al pie */}
              <div className="mt-auto pt-3 flex justify-end gap-2 border-t border-black/10">
                {ev.estado === 'Activo' && (
                  <button
                    onClick={() => pararAviso(ev)}
                    className="px-3 py-1 text-xs rounded-lg bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 transition-colors"
                    title="Detener recordatorios (archivar)"
                  >
                    Parar avisos
                  </button>
                )}
                <button
                  onClick={() => abrirEditar(ev)}
                  className="px-3 py-1 text-xs rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => eliminarEvento(ev.id)}
                  className="px-3 py-1 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Modal */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          rounded-2xl p-5 w-full max-w-3xl max-h-[90vh] overflow-y-auto
                          shadow-xl ring-1 ring-black/10">
            <h3 className="text-lg md:text-xl font-bold mb-3">
              {modoEdicion ? "✏️ Editar evento" : "➕ Nuevo evento"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Título */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-medium mb-1">Título <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm((s) => ({ ...s, titulo: e.target.value }))}
                  className={`w-full px-3 py-1.5 rounded-xl border text-sm focus:outline-none focus:ring-2
                    ${isEmpty(form.titulo) ? "border-red-500 focus:ring-red-400" : "border-gray-300 dark:border-gray-700 focus:ring-blue-400"}
                    bg-white dark:bg-gray-900`}
                />
              </div>

              {/* Fechas/Horas */}
              <div>
                <label className="block text-[11px] font-medium mb-1">Inicio <span className="text-red-500">*</span></label>
                <input
                  type="datetime-local"
                  value={form.inicio}
                  onChange={(e) => setForm((s) => ({ ...s, inicio: e.target.value }))}
                  className={`w-full px-3 py-1.5 rounded-xl border text-sm focus:outline-none focus:ring-2
                    ${isEmpty(form.inicio) ? "border-red-500 focus:ring-red-400" : "border-gray-300 dark:border-gray-700 focus:ring-blue-400"}
                    bg-white dark:bg-gray-900`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1">Fin</label>
                <input
                  type="datetime-local"
                  value={form.fin || ""}
                  onChange={(e) => setForm((s) => ({ ...s, fin: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-xl border text-sm focus:outline-none focus:ring-2
                             border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                />
              </div>

              {/* Todo el día + Color */}
              <div className="md:col-span-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!form.todo_dia}
                      onChange={(e) => setForm((s) => ({ ...s, todo_dia: e.target.checked ? 1 : 0 }))}
                    />
                    <span>Evento de todo el día</span>
                  </label>
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setForm((s) => ({ ...s, color: c.key }))}
                        className={`w-7 h-7 rounded-full border ${c.bg} ${
                          form.color === c.key ? `ring-2 ${c.ring}` : ""
                        }`}
                        title={c.key}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Ubicación / Categoría */}
              <div>
                <label className="block text-[11px] font-medium mb-1">Ubicación</label>
                <input
                  type="text"
                  value={form.ubicacion}
                  onChange={(e) => setForm((s) => ({ ...s, ubicacion: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-xl border text-sm focus:outline-none focus:ring-2
                             border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1">Categoría</label>
                <input
                  type="text"
                  value={form.categoria}
                  onChange={(e) => setForm((s) => ({ ...s, categoria: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-xl border text-sm focus:outline-none focus:ring-2
                             border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                />
              </div>

              {/* Aviso / Repetir */}
              <div>
                <label className="block text-[11px] font-medium mb-1">Aviso (min antes)</label>
                <select
                  value={form.aviso_min}
                  onChange={(e) => setForm((s) => ({ ...s, aviso_min: Number(e.target.value) }))}
                  className="w-full px-3 py-1.5 rounded-xl border text-sm focus:outline-none focus:ring-2
                             border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                >
                  {selectMinutes.map(v => (
                    <option key={v} value={v}>
                      {v === 0 ? 'Sin anticipación' : (v % 60 === 0 ? `${v/60} ${v/60===1?'hora':'horas'}` : `${v} min`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1">Repetir cada</label>
                <select
                  value={form.repetir_cada_min}
                  onChange={(e) => setForm((s) => ({ ...s, repetir_cada_min: Number(e.target.value) }))}
                  className="w-full px-3 py-1.5 rounded-xl border text-sm focus:outline-none focus:ring-2
                             border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                >
                  {selectMinutes.map(v => (
                    <option key={v} value={v}>
                      {v === 0 ? 'Sin repetición' : (v % 60 === 0 ? `${v/60} ${v/60===1?'hora':'horas'}` : `${v} min`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Descripción */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-medium mb-1">Descripción</label>
                <textarea
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm((s) => ({ ...s, descripcion: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-xl border text-sm focus:outline-none focus:ring-2
                             border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end gap-3">
              <button
                onClick={() => { setMostrarModal(false); setModoEdicion(false); setEventoEditando(null); }}
                className="px-4 py-1 rounded-xl bg-gray-600 text-white hover:bg-gray-700
                           focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={isEmpty(form.titulo) || isEmpty(form.inicio)}
                className="px-4 py-1 rounded-xl bg-green-600 text-white hover:bg-green-700
                           focus:outline-none focus:ring-2 focus:ring-green-400 text-sm
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {modoEdicion ? "Guardar cambios" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Eventos;
