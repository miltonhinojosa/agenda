import React, { useEffect, useMemo, useState } from "react";

const API = "http://localhost:3000/api";
const ORIGIN = "http://localhost:3000"; // donde sirve archivos el backend

/* ===== Helpers ===== */
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDate = (s) =>
  s ? new Date(s).toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" }) : "";
const fmtDateTime = (s) =>
  s ? new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const isOverdue = (iso) => (iso ? new Date(iso).getTime() < Date.now() : false);

// Normaliza url de foto (absoluta o servida por backend)
const photoURL = (u) => {
  if (!u) return "";
  const trimmed = String(u).trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return trimmed.startsWith("/") ? `${ORIGIN}${trimmed}` : `${ORIGIN}/${trimmed}`;
};

export default function Home() {
  const [cargando, setCargando] = useState(true);
  const [err, setErr] = useState("");

  const [eventos, setEventos] = useState([]);
  const [citas, setCitas] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [notas, setNotas] = useState([]);
  const [contactos, setContactos] = useState([]);

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const today = new Date();

  // Modal del día
  const [modalFecha, setModalFecha] = useState(null); // YYYY-MM-DD

  const fetchAll = async () => {
    try {
      setErr("");
      setCargando(true);
      const [re, rc, rt, rn, rco] = await Promise.all([
        fetch(`${API}/eventos`, { credentials: "include", cache: "no-store" }),
        fetch(`${API}/citas`, { credentials: "include", cache: "no-store" }),
        fetch(`${API}/tareas`, { credentials: "include", cache: "no-store" }),
        fetch(`${API}/notas?estado=t`, { credentials: "include", cache: "no-store" }),
        fetch(`${API}/contactos`, { credentials: "include", cache: "no-store" }),
      ]);
      if (!re.ok || !rc.ok || !rt.ok || !rn.ok || !rco.ok) throw new Error("No se pudo cargar toda la información");
      const [je, jc, jt, jn, jco] = await Promise.all([re.json(), rc.json(), rt.json(), rn.json(), rco.json()]);
      setEventos(Array.isArray(je) ? je : []);
      setCitas(Array.isArray(jc) ? jc : []);
      setTareas(Array.isArray(jt) ? jt : []);
      setNotas(Array.isArray(jn) ? jn : []);
      setContactos(Array.isArray(jco) ? jco : []);
    } catch (e) {
      setErr(e.message || "Error cargando datos");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchAll(); // solo al montar
  }, []);

  /* ===== Derivados ===== */

  // Calendario del mes visible (ultra compacto)
  const daysInMonth = useMemo(() => {
    const first = startOfMonth(month);
    const last = endOfMonth(month);
    const startIndex = (first.getDay() + 6) % 7; // 0 = lunes
    const totalDays = last.getDate();
    const cells = [];
    for (let i = 0; i < startIndex; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  // Eventos por día del mes visible
  const eventosPorDia = useMemo(() => {
    const map = {};
    const m0 = startOfMonth(month);
    const m1 = endOfMonth(month);
    (eventos || []).forEach((e) => {
      if (!e.inicio) return;
      const d = new Date(e.inicio);
      if (d >= new Date(m0.getFullYear(), m0.getMonth(), 1) && d <= new Date(m1.getFullYear(), m1.getDate(), 23, 59, 59)) {
        const k = ymd(d);
        if (!map[k]) map[k] = [];
        map[k].push(e);
      }
    });
    return map;
  }, [eventos, month]);

  // Próximos 7 días
  const in7 = new Date(today.getTime() + 7 * 86400000);
  const eventosProximos = useMemo(
    () =>
      (eventos || [])
        .filter((e) => e.inicio && new Date(e.inicio) >= today && new Date(e.inicio) <= in7)
        .sort((a, b) => new Date(a.inicio) - new Date(b.inicio))
        .slice(0, 6),
    [eventos]
  );
  const citasProximas = useMemo(
    () =>
      (citas || [])
        .map((c) => ({ ...c, _when: c.fecha ? new Date(c.hora ? `${c.fecha}T${c.hora}` : c.fecha) : null }))
        .filter((c) => c._when && c._when >= today && c._when <= in7)
        .sort((a, b) => a._when - b._when)
        .slice(0, 6),
    [citas]
  );

  // Tareas pendientes
  const tareasPendientes = useMemo(() => {
    const pend = (tareas || []).filter((t) => Number(t.completada) === 0);
    return pend
      .sort((a, b) => {
        const ta = a.vencimiento ? new Date(a.vencimiento).getTime() : Infinity;
        const tb = b.vencimiento ? new Date(b.vencimiento).getTime() : Infinity;
        return ta - tb;
      })
      .slice(0, 8);
  }, [tareas]);

  const notasFijadas = useMemo(
    () => (notas || []).filter((n) => Number(n.fijada) && !Number(n.archivada)).slice(0, 5),
    [notas]
  );
  const contactosFavoritos = useMemo(
    () => (contactos || []).filter((c) => Number(c.favorito) === 1).slice(0, 6),
    [contactos]
  );

  // Datos para modal de día
  const modalData = useMemo(() => {
    if (!modalFecha) return { ev: [], ci: [], ta: [] };
    const ev = (eventosPorDia[modalFecha] || []).sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
    const ci = (citas || []).filter((c) => (c.fecha || "") === modalFecha);
    const ta = (tareas || []).filter((t) => (t.vencimiento || "") === modalFecha);
    return { ev, ci, ta };
  }, [modalFecha, eventosPorDia, citas, tareas]);

  /* ===== UI ===== */
  const chip = (txt) => (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100">
      {txt}
    </span>
  );

  // Badge de tipo con fondo de color SIN redondeado
  const Rect = ({ kind, children }) => {
    // kind: 'cumple', 'evento', 'cita', 'tarea'
    const base =
      "inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-[1px] leading-4 rounded-none";
    const styles = {
      cumple: "", // 🎂 sin fondo de color
      evento: "bg-blue-600 text-white",
      cita: "bg-violet-600 text-white",
      tarea: "bg-emerald-600 text-white",
    };
    return <span className={`${base} ${styles[kind] || ""}`}>{children}</span>;
  };

  return (
    <div className="px-3 py-3">
      {/* Título + acciones */}
      <div className="mb-3 flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">🏠 Inicio</h2>
        <button
          onClick={fetchAll}
          className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
          title="Actualizar"
        >
          🔄 Actualizar
        </button>
      </div>

      {err && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">
          {err}
        </div>
      )}

      {/* Skeleton */}
      {cargando && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      )}

      {!cargando && (
        <>
          {/* FILA 1: Calendario + Próximos 7 días */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Calendario mensual*/}
            <div className="lg:col-span-2 rounded-2xl ring-1 ring-black/10 dark:ring-white/10 bg-white dark:bg-gray-900 p-2.5">
              {/* Header calendario */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">📅 Calendario</h3>
                  <div className="text-[11px] text-gray-600 dark:text-gray-300">
                    {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setMonth((m) => addMonths(m, -1))}
                    className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Mes anterior"
                  >
                    ◀
                  </button>
                  <button
                    onClick={() => setMonth(startOfMonth(today))}
                    className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Hoy"
                  >
                    Hoy
                  </button>
                  <button
                    onClick={() => setMonth((m) => addMonths(m, 1))}
                    className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Mes siguiente"
                  >
                    ▶
                  </button>
                </div>
              </div>

              {/* Días de la semana */}
              <div className="mt-1.5 grid grid-cols-7 text-[10px] text-gray-600 dark:text-gray-300">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                  <div key={d} className="px-1 py-0.5 text-center font-medium">
                    {d}
                  </div>
                ))}
              </div>

              {/* Grilla */}
              <div className="grid grid-cols-7 gap-1">
                {daysInMonth.map((d, idx) => {
                  if (!d) return <div key={`empty-${idx}`} className="h-10 sm:h-12 rounded-lg bg-transparent" />;
                  const k = ymd(d);
                  const list = eventosPorDia[k] || [];

                  // Tipos presentes ese día
                  const hasCumple = list.some((e) => (e.categoria || "").toLowerCase() === "cumpleaños");
                  const hasEvento = list.some((e) => (e.categoria || "").toLowerCase() !== "cumpleaños"); // cualquier evento no-cumple
                  const hasCita = (citas || []).some((c) => (c.fecha || "") === k);
                  const hasTarea = (tareas || []).some((t) => Number(t.completada) === 0 && (t.vencimiento || "") === k);

                  const isToday = isSameDay(d, today);

                  return (
                    <button
                      type="button"
                      onClick={() => setModalFecha(k)}
                      key={k}
                      className={`h-10 sm:h-12 rounded-lg px-1.5 py-1 border text-left
                        ${isToday ? "border-blue-500" : "border-gray-200 dark:border-gray-800"}
                        bg-gray-50/70 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800 transition`}
                      title={
                        list.length
                          ? list
                              .slice(0, 5)
                              .map((e) => `${e.titulo}${e.inicio ? " • " + fmtDateTime(e.inicio) : ""}`)
                              .join("\n")
                          : undefined
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className={`leading-none ${
                            isToday ? "text-blue-700 dark:text-blue-300" : "text-gray-800 dark:text-gray-100"
                          } text-base sm:text-lg font-extrabold`}
                        >
                          {d.getDate()}
                        </div>

                        {/* Badges a la derecha */}
                        <div className="flex items-center gap-1">
                          {hasCumple && <Rect kind="cumple">🎂</Rect>}
                          {hasEvento && <Rect kind="evento">E</Rect>}
                          {hasCita && <Rect kind="cita">C</Rect>}
                          {hasTarea && <Rect kind="tarea">T</Rect>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Próximos 7 días */}
            <div className="rounded-2xl ring-1 ring-black/10 dark:ring-white/10 bg-white dark:bg-gray-900 p-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">⏭️ Próximos 7 días</h3>
                {chip(`${eventosProximos.length + citasProximas.length}`)}
              </div>
              <div className="mt-2 space-y-2">
                {eventosProximos.length === 0 && citasProximas.length === 0 && (
                  <div className="text-sm text-gray-600 dark:text-gray-300">Sin elementos próximos.</div>
                )}

                {eventosProximos.map((e) => (
                  <div key={`e-${e.id}`} className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{e.titulo}</div>
                      <div className="text-[11px] text-gray-600 dark:text-gray-300">{fmtDateTime(e.inicio)}</div>
                    </div>
                    <div className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5">
                      {(e.categoria || "").toLowerCase() === "cumpleaños" ? "🎂 Cumpleaños" : e.categoria || ""}
                      {e.todo_dia ? " • Todo el día" : ""}
                    </div>
                  </div>
                ))}

                {citasProximas.map((c) => (
                  <div key={`c-${c.id}`} className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.titulo || c.asunto || "Cita"}</div>
                      <div className="text-[11px] text-gray-600 dark:text-gray-300">
                        {c.fecha}
                        {c.hora ? ` • ${c.hora}` : ""}
                      </div>
                    </div>
                    {c.lugar && <div className="text-[11px] text-gray-600 dark:text-gray-300">{c.lugar}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FILA 2: Tareas pendientes + Notas fijadas + Favoritos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Tareas pendientes */}
            <div className="rounded-2xl ring-1 ring-black/10 dark:ring-white/10 bg-white dark:bg-gray-900 p-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">✅ Tareas pendientes</h3>
                {chip(`${tareasPendientes.length}`)}
              </div>
              <div className="mt-2 space-y-2">
                {tareasPendientes.length === 0 && (
                  <div className="text-sm text-gray-600 dark:text-gray-300">No hay tareas pendientes.</div>
                )}
                {tareasPendientes.map((t) => (
                  <div
                    key={t.id}
                    className={`p-2 rounded-xl ${
                      isOverdue(t.vencimiento) ? "bg-rose-100 dark:bg-rose-900/30" : "bg-gray-50 dark:bg-gray-800/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.titulo}</div>
                      <div className="text-[11px] text-gray-600 dark:text-gray-300">
                        {t.vencimiento ? fmtDate(t.vencimiento) : "—"}
                      </div>
                    </div>
                    {t.descripcion && (
                      <div className="text-[11px] text-gray-700 dark:text-gray-300 mt-0.5 line-clamp-2">
                        {t.descripcion}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Notas fijadas */}
            <div className="rounded-2xl ring-1 ring-black/10 dark:ring-white/10 bg-white dark:bg-gray-900 p-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">📌 Notas fijadas</h3>
                {chip(`${notasFijadas.length}`)}
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2.5">
                {notasFijadas.length === 0 && <div className="text-sm text-gray-600 dark:text-gray-300">No hay notas fijadas.</div>}
                {notasFijadas.map((n) => (
                  <div key={n.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{n.titulo}</div>
                    <div className="text-[11px] text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap line-clamp-3">
                      {n.contenido}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contactos favoritos */}
            <div className="rounded-2xl ring-1 ring-black/10 dark:ring-white/10 bg-white dark:bg-gray-900 p-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">⭐ Contactos favoritos</h3>
                {chip(`${contactosFavoritos.length}`)}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {contactosFavoritos.length === 0 && <div className="text-sm text-gray-600 dark:text-gray-300">Sin favoritos.</div>}
                {contactosFavoritos.map((c) => (
                  <div key={c.id} className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full overflow-hidden ring-1 ring-black/10 dark:ring-white/10 bg-gray-200 dark:bg-gray-700">
                      {c.foto_url ? (
                        <img
                          src={photoURL(c.foto_url)}
                          alt={c.nombre || "Contacto"}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src =
                              "data:image/svg+xml;utf8," +
                              encodeURIComponent(
                                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#e5e7eb"/><text x="50" y="55" font-size="42" text-anchor="middle" fill="#9ca3af">👤</text></svg>'
                              );
                          }}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-900 dark:text-gray-100 line-clamp-2">{c.nombre}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MODAL de día */}
          {modalFecha && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3">
              <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white w-full max-w-2xl rounded-2xl p-4 ring-1 ring-black/10 dark:ring-white/10">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold">📌 {modalFecha}</h4>
                  <button
                    onClick={() => setModalFecha(null)}
                    className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Cerrar
                  </button>
                </div>

                <ModalDia fecha={modalFecha} eventosPorDia={eventosPorDia} citas={citas} tareas={tareas} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* === Subcomponente: contenido del modal por día === */
function ModalDia({ fecha, eventosPorDia, citas, tareas }) {
  const ev = (eventosPorDia[fecha] || []).sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
  const ci = (citas || []).filter((c) => (c.fecha || "") === fecha);
  const ta = (tareas || []).filter((t) => (t.vencimiento || "") === fecha);

  const chip = (txt) => (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100">
      {txt}
    </span>
  );

  const fmtDateTime = (s) =>
    s ? new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";

  return (
    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* Eventos */}
      <div className="rounded-xl p-3 bg-gray-50 dark:bg-gray-800/60">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Eventos</div>
          {chip(String(ev.length))}
        </div>
        <div className="space-y-2">
          {ev.length === 0 && <div className="text-sm text-gray-600 dark:text-gray-300">Sin eventos.</div>}
          {ev.map((e) => (
            <div key={`ev-${e.id}`} className="text-sm">
              <div className="font-medium">{e.titulo}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">
                {e.inicio ? fmtDateTime(e.inicio) : ""} {e.todo_dia ? "• Todo el día" : ""}
                {e.categoria ? ` • ${e.categoria}` : ""}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Citas */}
      <div className="rounded-xl p-3 bg-gray-50 dark:bg-gray-800/60">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Citas</div>
          {chip(String(ci.length))}
        </div>
        <div className="space-y-2">
          {ci.length === 0 && <div className="text-sm text-gray-600 dark:text-gray-300">Sin citas.</div>}
          {ci.map((c) => (
            <div key={`ci-${c.id}`} className="text-sm">
              <div className="font-medium">{c.titulo || c.asunto || "Cita"}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">
                {c.fecha}
                {c.hora ? ` • ${c.hora}` : ""}
                {c.lugar ? ` • ${c.lugar}` : ""}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tareas */}
      <div className="rounded-xl p-3 bg-gray-50 dark:bg-gray-800/60">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Tareas</div>
          {chip(String(ta.length))}
        </div>
        <div className="space-y-2">
          {ta.length === 0 && <div className="text-sm text-gray-600 dark:text-gray-300">Sin tareas.</div>}
          {ta.map((t) => (
            <div key={`ta-${t.id}`} className="text-sm">
              <div className="font-medium">{t.titulo}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">
                {t.descripcion ? `${t.descripcion.substring(0, 60)}${t.descripcion.length > 60 ? "…" : ""}` : ""}
                {Number(t.completada) ? " • Completada" : ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
