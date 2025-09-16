import React, { useEffect, useMemo, useRef, useState } from "react";

const API = "http://localhost:3000/api";

// 10 colores vivos (sin grises)
const COLORS = [
  { key: "amber",   bg: "bg-amber-200 dark:bg-amber-800", ring: "ring-amber-400" },
  { key: "orange",  bg: "bg-orange-200 dark:bg-orange-800", ring: "ring-orange-400" },
  { key: "red",     bg: "bg-red-200 dark:bg-red-800", ring: "ring-red-400" },
  { key: "rose",    bg: "bg-rose-200 dark:bg-rose-800", ring: "ring-rose-400" },
  { key: "pink",    bg: "bg-pink-200 dark:bg-pink-800", ring: "ring-pink-400" },
  { key: "violet",  bg: "bg-violet-200 dark:bg-violet-800", ring: "ring-violet-400" },
  { key: "indigo",  bg: "bg-indigo-200 dark:bg-indigo-800", ring: "ring-indigo-400" },
  { key: "blue",    bg: "bg-blue-200 dark:bg-blue-800", ring: "ring-blue-400" },
  { key: "teal",    bg: "bg-teal-200 dark:bg-teal-800", ring: "ring-teal-400" },
  { key: "emerald", bg: "bg-emerald-200 dark:bg-emerald-800", ring: "ring-emerald-400" },
];

const CUMPLE_CAT = "Cumpleaños";
const selectMinutes = [0, 5, 10, 15, 20, 30, 45, 60, 120];

const isEmpty = (v) => v == null || String(v).trim() === "";
const fmtDateTime = (s) =>
  s ? new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";
const colorToTailwind = (key) => COLORS.find((c) => c.key === key)?.bg || "bg-gray-200 dark:bg-gray-800";

// ======= Persistencia local de notificaciones =======
const STORAGE_KEY = "eventosNotifState";
const MUTED_KEY = "eventosMuted";
const loadJSON = (k, fb) => {
  try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : fb; } catch { return fb; }
};
const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ======= Helpers para normalizar "Todo el día" =======
const toLocalISO = (date) => {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!(d instanceof Date) || isNaN(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${y}-${m}-${dd}T${hh}:${mm}`;
};
const startOfDayISO = (src) => { const d = new Date(src); d.setHours(0,0,0,0); return toLocalISO(d); };
const endOfDayISO = (src) => { const d = new Date(src); d.setHours(23,59,0,0); return toLocalISO(d); };

// Cálculo de primer disparo: inicio - (aviso_min)
const firstTriggerMs = (inicioMs, avisoMin) => inicioMs - (Math.max(0, +avisoMin || 0) * 60 * 1000);

// Ventana de actividad (para parpadeo)
const isActiveWindow = (ev, now = Date.now()) => {
  if (!ev?.inicio) return false;
  if (ev.estado === "Cancelado" || ev.estado === "Archivado") return false;
  const inicioMs = new Date(ev.inicio).getTime();
  const finMs = ev.fin ? new Date(ev.fin).getTime() : inicioMs + 2 * 60 * 60 * 1000;
  const aviso = Number(ev.aviso_min) || 0;
  const firstAt = firstTriggerMs(inicioMs, aviso);
  return now >= firstAt && now <= finMs + 5 * 60 * 1000;
};

const Eventos = () => {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(false);

  // “Pendientes” = Pendiente ∪ Activo
  const [tab, setTab] = useState("Pendientes"); // Pendientes | Archivado | Cancelado | Todos | Cumpleaños
  const [busqueda, setBusqueda] = useState("");

  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [eventoEditando, setEventoEditando] = useState(null);

  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    ubicacion: "",
    categoria: "",
    color: "emerald",
    inicio: "",
    fin: "",
    todo_dia: 0,
    aviso_min: 0,
    repetir_cada_min: 0,
    estado: "Pendiente",
  });

  // ======= Notificaciones (estado local + mute) =======
  const [notifState, setNotifState] = useState({});
  const [muted, setMuted] = useState({});
  const bellRef = useRef(null);
  const [audioReady, setAudioReady] = useState(false);

  // Toast simple (centrado abajo)
  const [toast, setToast] = useState(null);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  // ==== Cargar datos ====
  const cargarEventos = async () => {
    setCargando(true);
    try {
      // Para Pendientes y Cumpleaños pedimos "Todos" y filtramos en front
      const estadoParam = ["Archivado", "Cancelado", "Todos"].includes(tab) ? tab : "Todos";
      const params = new URLSearchParams({ estado: estadoParam });
      const r = await fetch(`${API}/eventos?${params.toString()}`, { credentials: "include" });
      const data = await r.json();
      setEventos(Array.isArray(data) ? data : []);
    } catch {
      setEventos([]);
    } finally { setCargando(false); }
  };
  useEffect(() => { cargarEventos(); }, [tab]);

  // ==== Filtro y orden ====
  const filtrados = useMemo(() => {
    const t = busqueda.toLowerCase();
    let base = eventos.filter(
      (e) =>
        (e.titulo || "").toLowerCase().includes(t) ||
        (e.descripcion || "").toLowerCase().includes(t) ||
        (e.ubicacion || "").toLowerCase().includes(t) ||
        (e.categoria || "").toLowerCase().includes(t)
    );

    if (tab === "Cumpleaños") base = base.filter((e) => (e.categoria || "") === CUMPLE_CAT);
    else base = base.filter((e) => (e.categoria || "") !== CUMPLE_CAT);

    // Pendientes = estados Pendiente ∪ Activo
    if (tab === "Pendientes") base = base.filter((e) => e.estado === "Pendiente" || e.estado === "Activo");
    if (tab === "Archivado") base = base.filter((e) => e.estado === "Archivado");
    if (tab === "Cancelado") base = base.filter((e) => e.estado === "Cancelado");
    // "Todos": no filtra por estado

    return base.sort((a, b) => {
      const da = a.inicio ? new Date(a.inicio).getTime() : Infinity;
      const db = b.inicio ? new Date(b.inicio).getTime() : Infinity;
      return da - db;
    });
  }, [eventos, busqueda, tab]);

  // ==== Permiso notificaciones ====
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
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
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [audioReady]);

  // ==== Cargar estado local persistente ====
  useEffect(() => {
    setNotifState(loadJSON(STORAGE_KEY, {}));
    setMuted(loadJSON(MUTED_KEY, {}));
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setNotifState(loadJSON(STORAGE_KEY, {}));
      if (e.key === MUTED_KEY) setMuted(loadJSON(MUTED_KEY, {}));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ==== Inicializar programación por evento (agenda de notificaciones para Pendiente y Activo) ====
  useEffect(() => {
    if (!Array.isArray(eventos) || eventos.length === 0) return;
    const now = Date.now();
    const updated = { ...notifState };

    eventos.forEach((ev) => {
      if (!ev?.inicio) return;
      if (ev.estado === "Cancelado" || ev.estado === "Archivado") return;

      const inicioMs = new Date(ev.inicio).getTime();
      const finMs = ev.fin ? new Date(ev.fin).getTime() : inicioMs + 2 * 60 * 60 * 1000;
      const aviso = Number.isFinite(+ev.aviso_min) ? +ev.aviso_min : 0;
      const rep = (ev.repetir_cada_min ? +ev.repetir_cada_min : 0) || 0;
      const firstAt = firstTriggerMs(inicioMs, aviso);

      // Modos según reglas del usuario
      let mode = rep > 0 ? "repeat" : (aviso > 0 ? "twoStep" : "singleOnce");

      const existed = updated[ev.id];
      if (!existed) {
        if (mode === "singleOnce") {
          // 1 vez: al inicio (si aviso=0)
          updated[ev.id] = { nextAt: inicioMs, last: null, mode, inicioMs, finMs };
        } else if (mode === "twoStep") {
          // 2 veces: preaviso y luego inicio
          const nextAt = (now <= firstAt) ? firstAt : Math.max(inicioMs, now);
          updated[ev.id] = { nextAt, last: null, mode, step: (now <= firstAt ? 1 : 2), inicioMs, finMs };
        } else {
          // repeat: muchas veces desde firstAt
          const base = Math.max(firstAt, now);
          updated[ev.id] = { nextAt: base, last: null, mode, inicioMs, finMs };
        }
      } else {
        const s = existed;
        s.mode = mode; s.inicioMs = inicioMs; s.finMs = finMs;
        if (mode === "singleOnce") {
          s.nextAt = inicioMs;
        } else if (mode === "twoStep") {
          const step = s.step ?? (now <= firstAt ? 1 : 2);
          s.step = step;
          s.nextAt = (step === 1) ? firstAt : Math.max(inicioMs, now);
        } else {
          if (s.nextAt === undefined || s.nextAt === Infinity) s.nextAt = Math.max(firstAt, now);
        }
      }

      // Si ya pasó mucho tiempo del fin, desactivar
      if (now > finMs + 5 * 60 * 1000) {
        updated[ev.id].nextAt = Infinity;
      }
    });

    // Limpiar entradas que ya no correspondan a eventos activos (o existentes)
    Object.keys(updated).forEach((idStr) => {
      const id = +idStr;
      const ev = eventos.find((x) => x.id === id);
      if (!ev || ev.estado === "Cancelado" || ev.estado === "Archivado") delete updated[idStr];
    });

    setNotifState(updated);
    saveJSON(STORAGE_KEY, updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventos]);

  // ==== Activación automática: Pendiente → Activo al llegar preaviso (o inicio si aviso=0) ====
  useEffect(() => {
    const id = setInterval(async () => {
      const now = Date.now();
      for (const ev of eventos) {
        if (!ev?.inicio) continue;
        if (ev.estado !== "Pendiente") continue;
        const inicioMs = new Date(ev.inicio).getTime();
        const aviso = Number(ev.aviso_min) || 0;
        const firstAt = firstTriggerMs(inicioMs, aviso);
        if (now >= firstAt) {
          try { await cambiarEstado(ev, "Activo"); } catch {}
        }
      }
    }, 10000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventos]);

  // ==== Ticker de disparo (cada 10s) para NOTIFICACIONES ====
  useEffect(() => {
    const tick = async () => {
      const now = Date.now();
      let changed = false;
      const nextState = { ...notifState };
      const mutedMap = { ...muted };

      for (const ev of eventos) {
        if (!ev?.inicio) continue;
        if (ev.estado === "Cancelado" || ev.estado === "Archivado") continue;

        const entry = nextState[ev.id];
        if (!entry) continue;
        if (mutedMap[ev.id]) continue;

        const rep = (ev.repetir_cada_min ? +ev.repetir_cada_min : 0) || 0;

        if (now >= entry.nextAt && now <= entry.finMs + 5 * 60 * 1000) {
          try {
            if ("serviceWorker" in navigator) {
              const reg = await navigator.serviceWorker.ready;
              await reg.showNotification("⏰ Evento", {
                body: `${ev.titulo} • ${fmtDateTime(ev.inicio)}${ev.fin ? " – " + fmtDateTime(ev.fin) : ""}`,
                icon: "/icono.png",
                badge: "/icono.png",
                tag: `evento-${ev.id}`,
                renotify: true,
              });
            } else if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification("⏰ Evento", {
                body: `${ev.titulo} • ${fmtDateTime(ev.inicio)}${ev.fin ? " – " + fmtDateTime(ev.fin) : ""}`,
                icon: "/icono.png",
                tag: `evento-${ev.id}`,
                renotify: true,
              });
            }
          } catch {}

          if (bellRef.current) {
            try { bellRef.current.currentTime = 0; await bellRef.current.play(); } catch {}
          }
          if (document.visibilityState === "visible") {
            showToast(`⏰ ${ev.titulo} • ${fmtDateTime(ev.inicio)}${ev.fin ? " – " + fmtDateTime(ev.fin) : ""}`);
          }

          // Reprogramación según modo
          if (entry.mode === "singleOnce") {
            entry.nextAt = Infinity; // 1 sola vez
          } else if (entry.mode === "twoStep") {
            if ((entry.step ?? 1) === 1) {
              entry.step = 2;
              entry.nextAt = entry.inicioMs; // ahora programar el inicio
            } else {
              entry.nextAt = Infinity; // ya sonó el inicio
            }
          } else { // repeat
            const next = now + rep * 60 * 1000;
            entry.nextAt = Math.min(next, entry.finMs + 5 * 60 * 1000);
          }
          entry.last = now;
          changed = true;
        }
      }

      if (changed) {
        setNotifState(nextState);
        saveJSON(STORAGE_KEY, nextState);
      }
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
      estado: form.estado || "Pendiente",
    };

    // Normalización para "Todo el día"
    if (payload.todo_dia && payload.inicio) {
      const startISO = startOfDayISO(payload.inicio);
      payload.inicio = startISO;
      payload.fin = endOfDayISO(startISO); // rango explícito para mostrar horas
    }

    const url = modoEdicion ? `${API}/eventos/${eventoEditando.id}` : `${API}/eventos`;
    const method = modoEdicion ? "PUT" : "POST";

    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), credentials: "include" });

    if (modoEdicion && eventoEditando?.id) {
      setNotifState((prev) => {
        const n = { ...prev };
        delete n[eventoEditando.id];
        saveJSON(STORAGE_KEY, n);
        return n;
      });
      setMuted((prev) => {
        const m = { ...prev };
        delete m[eventoEditando.id];
        saveJSON(MUTED_KEY, m);
        return m;
      });
    }

    setMostrarModal(false);
    setModoEdicion(false);
    setEventoEditando(null);
    cargarEventos();
  };

  const eliminarEvento = async (id) => {
    if (!window.confirm("¿Eliminar este evento?")) return;
    await fetch(`${API}/eventos/${id}`, { method: "DELETE", credentials: "include" });
    setNotifState((prev) => { const n = { ...prev }; delete n[id]; saveJSON(STORAGE_KEY, n); return n; });
    setMuted((prev) => { const m = { ...prev }; delete m[id]; saveJSON(MUTED_KEY, m); return m; });
    cargarEventos();
  };

  const cambiarEstado = async (ev, estado) => {
    await fetch(`${API}/eventos/${ev.id}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
      credentials: "include",
    });
    if (estado !== "Activo") {
      setMuted((prev) => { const m = { ...prev, [ev.id]: true }; saveJSON(MUTED_KEY, m); return m; });
      setNotifState((prev) => { const n = { ...prev }; if (n[ev.id]) n[ev.id].nextAt = Infinity; saveJSON(STORAGE_KEY, n); return n; });
    }
    cargarEventos();
  };

  const pararAviso = async (ev) => {
    setMuted((prev) => { const m = { ...prev, [ev.id]: true }; saveJSON(MUTED_KEY, m); return m; });
    setNotifState((prev) => { const n = { ...prev }; if (!n[ev.id]) n[ev.id] = { nextAt: Infinity }; else n[ev.id].nextAt = Infinity; saveJSON(STORAGE_KEY, n); return n; });
    await cambiarEstado(ev, "Archivado");
  };

  const abrirNuevo = () => {
    setModoEdicion(false);
    setEventoEditando(null);
    setForm({
      titulo: "",
      descripcion: "",
      ubicacion: "",
      categoria: "",
      color: "emerald",
      inicio: "",
      fin: "",
      todo_dia: 0,
      aviso_min: 0,
      repetir_cada_min: 0,
      estado: "Pendiente",
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
      color: ev.color || "emerald",
      inicio: ev.inicio || "",
      fin: ev.fin || "",
      todo_dia: ev.todo_dia ? 1 : 0,
      aviso_min: ev.aviso_min || 0,
      repetir_cada_min: ev.repetir_cada_min || 0,
      estado: ev.estado || "Pendiente",
    });
    setMostrarModal(true);
  };

  // ==== Render ====
  return (
    <div className="px-2 py-2">
      <audio ref={bellRef} src="/sonido-alerta.mp3" preload="auto" />
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]
                     bg-black text-white px-4 py-3 rounded-xl shadow-lg text-center
                     w-[calc(100%-2rem)] max-w-md">
          {toast}
        </div>
      )}

      {/* Encabezado */}
      <div className="mb-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="flex-1 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">📆 Eventos</h2>

            {/* Export eventos ICS */}
            {(() => {
              const qs =
                tab === "Cumpleaños"
                  ? "?categoria=Cumpleaños"
                  : tab === "Archivado" || tab === "Cancelado"
                  ? `?estado=${encodeURIComponent(tab)}`
                  : "";
              const href = import.meta.env.DEV
                ? `http://localhost:3000/api/eventos/export/ics${qs}`
                : `/api/eventos/export/ics${qs}`;
              return (
                <a
                  href={href}
                  className="text-xs px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700
                             hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Exportar eventos a .ics">
                  Exportar ICS
                </a>
              );
            })()}

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
              {["Pendientes", "Archivado", "Cancelado", "Todos", "Cumpleaños"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    tab === t
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}>
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
                         transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
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
          filtrados.map((ev) => {
            const activeNow = isActiveWindow(ev);
            return (
              <div
                key={ev.id}
                className={`h-full flex flex-col p-4 rounded-2xl shadow-sm ring-1 ring-inset ring-black/5 ${colorToTailwind(ev.color)} ${
                  activeNow ? "animate-pulse ring-2 ring-blue-500" : ""
                }`}>
                {/* Cabecera */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {ev.titulo}
                    </h3>
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      {ev.todo_dia ? (
                        <>🗓️ Todo el día • {" "}{`🕒 ${fmtDateTime(ev.inicio)}${ev.fin ? " – " + fmtDateTime(ev.fin) : ""}`}</>
                      ) : (
                        `🕒 ${fmtDateTime(ev.inicio)}${ev.fin ? " – " + fmtDateTime(ev.fin) : ""}`
                      )}
                    </p>
                    {(ev.ubicacion || ev.categoria) && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {ev.ubicacion ? `📍 ${ev.ubicacion}` : ""} {ev.categoria ? `• 🏷️ ${ev.categoria}` : ""}
                      </p>
                    )}
                  </div>

                  {/* Estados rápidos (sin 'Activar') */}
                  <div className="flex flex-col gap-1">
                    {ev.estado !== "Archivado" && (
                      <button
                        onClick={() => cambiarEstado(ev, "Archivado")}
                        className="px-2 py-1 text-xs rounded-lg bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800">
                        Archivar
                      </button>
                    )}
                    {ev.estado !== "Cancelado" && (
                      <button
                        onClick={() => cambiarEstado(ev, "Cancelado")}
                        className="px-2 py-1 text-xs rounded-lg bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800">
                        Cancelar
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
                  {ev.estado === "Activo" && (
                    <button
                      onClick={() => pararAviso(ev)}
                      className="px-3 py-1 text-xs rounded-lg bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 transition-colors"
                      title="Detener recordatorios (archivar)">
                      Parar avisos
                    </button>
                  )}
                  <button
                    onClick={() => abrirEditar(ev)}
                    className="px-3 py-1 text-xs rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 transition-colors">
                    Editar
                  </button>
                  <button
                    onClick={() => eliminarEvento(ev.id)}
                    className="px-3 py-1 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-colors">
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
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
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm((s) => {
                          if (!s.inicio) return { ...s, todo_dia: checked ? 1 : 0 };
                          const normalizedStart = startOfDayISO(s.inicio);
                          const normalizedEnd = endOfDayISO(s.inicio);
                          return {
                            ...s,
                            todo_dia: checked ? 1 : 0,
                            inicio: checked ? normalizedStart : s.inicio,
                            fin: checked ? normalizedEnd : s.fin,
                          };
                        });
                      }}
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
                        className={`w-7 h-7 rounded-full border ${c.bg} ${form.color === c.key ? `ring-2 ${c.ring}` : ""}`}
                        title={c.key}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Ubicación*/}
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

              {/* Categoría*/}
              <div>
                <label className="block text-[11px] font-medium mb-1">Categoría</label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm((s) => ({ ...s, categoria: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-xl border text-sm focus:outline-none focus:ring-2
                             border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                >
                  <option value="">Selecciona…</option>
                  <option value="Cumpleaños">Cumpleaños</option>
                  <option value="Personal">Personal</option>
                  <option value="Trabajo">Trabajo</option>
                  <option value="Estudio">Estudio</option>
                  <option value="Salud">Salud</option>
                  <option value="Viaje">Viaje</option>
                  <option value="Reunión">Reunión</option>
                  <option value="Recordatorio">Recordatorio</option>
                </select>
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
                  {selectMinutes.map((v) => (
                    <option key={v} value={v}>
                      {v === 0 ? "Sin anticipación" : v % 60 === 0 ? `${v / 60} ${v / 60 === 1 ? "hora" : "horas"}` : `${v} min`}
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
                  {selectMinutes.map((v) => (
                    <option key={v} value={v}>
                      {v === 0 ? "Sin repetición" : v % 60 === 0 ? `${v / 60} ${v / 60 === 1 ? "hora" : "horas"}` : `${v} min`}
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
                           focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm">
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={isEmpty(form.titulo) || isEmpty(form.inicio)}
                className="px-4 py-1 rounded-xl bg-green-600 text-white hover:bg-green-700
                           focus:outline-none focus:ring-2 focus:ring-green-400 text-sm
                           disabled:opacity-50 disabled:cursor-not-allowed">
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
