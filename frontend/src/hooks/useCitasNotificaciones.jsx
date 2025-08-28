// src/hooks/useCitasNotificaciones.jsx
import React, { useEffect, useRef, useState } from "react";

const API = "http://localhost:3000/api";

// === Ajustes visibles para debug ===
const TEST_LOGS = true;               // pon en false cuando verifiques
const BACKFILL_MS = 24 * 60 * 60 * 1000; // si ya pasó hace <24h, aún notificamos

// === Utiles ===
const isEstadoNotificable = (e) => e === "Pendiente" || e === "Activo";
const floorDate = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const todayKey = () => floorDate(new Date()).toISOString().slice(0, 10);

// anti-duplicados por día
function useDeduper() {
  const [key] = useState(todayKey);
  const notifiedRef = useRef(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`citas_notified_${key}`);
      if (raw) notifiedRef.current = new Set(JSON.parse(raw));
    } catch {}
  }, [key]);

  const seen = (id) => notifiedRef.current.has(String(id));
  const mark = (id) => {
    notifiedRef.current.add(String(id));
    try {
      localStorage.setItem(`citas_notified_${key}`, JSON.stringify([...notifiedRef.current]));
    } catch {}
  };
  return { seen, mark };
}

export default function CitasNotifier() {
  const audioRef = useRef(null);
  const { seen, mark } = useDeduper();

  // 1) pide permiso 1 vez
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") return;
    Notification.requestPermission().catch(() => {});
  }, []);

  // 2) ticker global independiente de la vista
  useEffect(() => {
    let stop = false;

    async function notifyNow(cita) {
      const cuerpo = `${cita.titulo || cita.asunto || cita.descripcion || "Cita"} • ${cita.fecha}${cita.hora ? ` ${cita.hora}` : ""}`;
      try {
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification("⏰ Cita", {
            body: cuerpo,
            icon: "/icono.png",
            badge: "/icono.png",
            tag: `cita-${cita.id}`,   // colapsa duplicadas
            renotify: false,
            requireInteraction: false,
          });
          if (TEST_LOGS) console.log("[Notif] SW OK:", cuerpo);
        } else if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("⏰ Cita", { body: cuerpo, icon: "/icono.png", tag: `cita-${cita.id}`, renotify: false });
          if (TEST_LOGS) console.log("[Notif] Fallback Notification:", cuerpo);
        }
      } catch (e) {
        if (TEST_LOGS) console.warn("[Notif] falló:", e);
      }

      if (audioRef.current) {
        try { audioRef.current.currentTime = 0; await audioRef.current.play(); } catch {}
      }
    }

    async function tick() {
      try {
        const r = await fetch(`${API}/citas`, { credentials: "include", cache: "no-store" });
        if (!r.ok) throw new Error("fetch /citas failed");
        const list = await r.json();
        const now = Date.now();

        for (const c of list) {
          if (!c.fecha) continue;
          if (!isEstadoNotificable(String(c.estado || ""))) continue;

          // Si tiene hora, usar fecha+hora; si no, a las 00:00 del día
          const when = new Date(c.hora ? `${c.fecha}T${c.hora}` : c.fecha);
          const ms = when.getTime();
          if (!Number.isFinite(ms)) continue;

          // NUEVA LÓGICA: notificar si ya llegó (ms <= now) y no lo hemos visto hoy.
          // Para evitar avalanchas, solo backfill de las últimas 24h.
          const due = ms <= now && ms >= (now - BACKFILL_MS);
          if (due && !seen(c.id)) {
            if (TEST_LOGS) console.log("[Notif] disparando:", c.id, c.fecha, c.hora, c.estado);
            await notifyNow(c);
            mark(c.id);
          }
        }
      } catch (e) {
        if (TEST_LOGS) console.warn("[Tick] error:", e);
      } finally {
        if (!stop) setTimeout(tick, 15000);
      }
    }

    tick();

    // también dispara cuando vuelves a la pestaña (por si te perdiste el tick)
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);

    return () => { stop = true; document.removeEventListener("visibilitychange", onVis); };
  }, [seen, mark]);

  // 3) desbloqueo de audio al primer click/tecla
  useEffect(() => {
    const unlock = () => {
      if (audioRef.current) {
        audioRef.current.play()
          .then(() => { audioRef.current.pause(); audioRef.current.currentTime = 0; })
          .catch(() => {});
      }
    };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // sin UI, solo audio
  return <audio ref={audioRef} src="/sonido-alerta.mp3" preload="auto" />;
}
