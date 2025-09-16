
import { useEffect, useRef, useState } from "react";

const API = import.meta.env.DEV ? "http://localhost:3000/api" : "/api";

// Claves de persistencia (igual estilo que Citas)
const STORAGE_KEY = "eventosNotifState";
const MUTED_KEY = "eventosMuted";
const loadJSON = (k, fb) => { try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : fb; } catch { return fb; } };
const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const firstTriggerMs = (inicioMs, avisoMin) => inicioMs - (Math.max(0, +avisoMin || 0) * 60 * 1000);
const fmtDateTime = (s) => (s ? new Date(s).toLocaleString() : "");

// Evitar duplicado si la pantalla Eventos ya monta su propio ticker
const GLOBAL_FLAG = "__eventosTickerGlobal";

export default function useEventosNotificaciones() {
  const [eventos, setEventos] = useState([]);
  const [notifState, setNotifState] = useState({});
  const [muted, setMuted] = useState({});

  const bellRef = useRef(null);
  const [audioReady, setAudioReady] = useState(false);

  // Marcar flag global (para que Eventos.jsx pueda checarlo y no duplicar)
  useEffect(() => {
    if (typeof window !== "undefined") window[GLOBAL_FLAG] = true;
    return () => { if (typeof window !== "undefined") delete window[GLOBAL_FLAG]; };
  }, []);

  // Permiso de notificaciones
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Desbloquear audio al primer click/tecla
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
    return () => { window.removeEventListener("click", unlock); window.removeEventListener("keydown", unlock); };
  }, [audioReady]);

  // Cargar estado local
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

  // Poll de eventos Activos cada 60s
  useEffect(() => {
    let stop = false;
    const fetchActivos = async () => {
      try {
        const r = await fetch(`${API}/eventos?estado=Activo`, { credentials: "include" });
        const data = await r.json();
        if (!stop) setEventos(Array.isArray(data) ? data : []);
      } catch {
        if (!stop) setEventos([]);
      }
    };
    fetchActivos();
    const id = setInterval(fetchActivos, 60000);
    return () => { stop = true; clearInterval(id); };
  }, []);

  // Inicializar/actualizar programación por evento
  useEffect(() => {
    if (!Array.isArray(eventos) || eventos.length === 0) return;

    const now = Date.now();
    const updated = { ...notifState };

    eventos.forEach(ev => {
      if (!ev.inicio || ev.estado !== "Activo") return;

      const inicioMs = new Date(ev.inicio).getTime();
      const finMs = ev.fin ? new Date(ev.fin).getTime() : (inicioMs + 2 * 60 * 60 * 1000);
      const aviso = Number.isFinite(+ev.aviso_min) ? +ev.aviso_min : 0;
      const rep = (ev.repetir_cada_min ? +ev.repetir_cada_min : 0) || 0;
      const firstAt = firstTriggerMs(inicioMs, aviso);

      let mode = "single0";
      if (rep > 0) mode = "repeat";
      else if (aviso > 0) mode = "two-step";

      const existed = updated[ev.id];
      if (!existed) {
        if (mode === "single0") {
          updated[ev.id] = { nextAt: inicioMs, last: null, mode, inicioMs, finMs };
          if (now > finMs + 5 * 60 * 1000) updated[ev.id].nextAt = Infinity;
        } else if (mode === "two-step") {
          const step = now <= firstAt ? 1 : (now <= inicioMs ? 2 : 3);
          const nextAt = step === 1 ? firstAt : (step === 2 ? inicioMs : Infinity);
          updated[ev.id] = { nextAt, last: null, mode, step: step === 3 ? 2 : step, inicioMs, finMs };
        } else {
          const base = now <= firstAt ? firstAt : now;
          updated[ev.id] = { nextAt: base, last: null, mode, inicioMs, finMs };
        }
      } else {
        const s = existed;
        s.mode = mode; s.inicioMs = inicioMs; s.finMs = finMs;
        if (mode === "single0") {
          if (s.nextAt < inicioMs - 1000 || s.nextAt === undefined) s.nextAt = inicioMs;
          if (now > finMs + 5 * 60 * 1000) s.nextAt = Infinity;
        } else if (mode === "two-step") {
          const step = s.step ?? (now <= firstAt ? 1 : (now <= inicioMs ? 2 : 3));
          s.step = step;
          if (step === 1 && s.nextAt !== firstAt) s.nextAt = firstAt;
          if (step === 2 && s.nextAt < inicioMs - 1000) s.nextAt = inicioMs;
          if (step === 3) s.nextAt = Infinity;
        } else {
          if (s.nextAt === undefined || s.nextAt === Infinity) s.nextAt = now;
        }
      }

      if (now > finMs + 5 * 60 * 1000) {
        updated[ev.id].nextAt = Infinity;
      }
    });

    Object.keys(updated).forEach(idStr => {
      const id = +idStr;
      const ev = eventos.find(x => x.id === id);
      if (!ev || ev.estado !== "Activo") delete updated[idStr];
    });

    setNotifState(updated);
    saveJSON(STORAGE_KEY, updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventos]);

  // Ticker cada 10s
  useEffect(() => {
    const id = setInterval(async () => {
      const now = Date.now();
      let changed = false;
      const nextState = { ...notifState };
      const mutedMap = { ...muted };

      for (const ev of eventos) {
        if (!ev.inicio || ev.estado !== "Activo") continue;
        const entry = nextState[ev.id];
        if (!entry) continue;
        if (mutedMap[ev.id]) continue;

        const rep = (ev.repetir_cada_min ? +ev.repetir_cada_min : 0) || 0;

        if (now >= entry.nextAt && now <= (entry.finMs + 5 * 60 * 1000)) {
          try {
            if ("serviceWorker" in navigator) {
              const reg = await navigator.serviceWorker.ready;
              await reg.showNotification("⏰ Evento", {
                body: `${ev.titulo} • ${fmtDateTime(ev.inicio)}${ev.fin ? " – " + fmtDateTime(ev.fin) : ""}`,
                icon: "/icono.png",
                badge: "/icono.png",
                tag: `evento-${ev.id}`,
                renotify: true
              });
            } else if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification("⏰ Evento", {
                body: `${ev.titulo} • ${fmtDateTime(ev.inicio)}${ev.fin ? " – " + fmtDateTime(ev.fin) : ""}`,
                icon: "/icono.png",
                tag: `evento-${ev.id}`,
                renotify: true
              });
            }
          } catch {}

          if (bellRef.current) {
            try { bellRef.current.currentTime = 0; await bellRef.current.play(); } catch {}
          }

          // Programar siguiente
          if (entry.mode === "single0") {
            entry.nextAt = Infinity;
          } else if (entry.mode === "two-step") {
            if ((entry.step ?? 1) === 1) { entry.step = 2; entry.nextAt = entry.inicioMs; }
            else { entry.step = 3; entry.nextAt = Infinity; }
          } else {
            const next = now + rep * 60 * 1000;
            entry.nextAt = Math.min(next, entry.finMs + 5 * 60 * 1000);
          }
          entry.last = now;
          changed = true;
        }
      }

      if (changed) { setNotifState(nextState); saveJSON(STORAGE_KEY, nextState); }
    }, 10000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventos, notifState, muted]);

  return (
    <audio ref={bellRef} src="/sonido-alerta.mp3" preload="auto" />
  );
}
