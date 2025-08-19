// frontend/src/components/Tareas.jsx
import React, { useEffect, useMemo, useState } from "react";

/* ================= Config ================= */
const API = "http://localhost:3000/api";

/* ===== helper ÚNICO añadido para sesión (cookies) ===== */
const withCreds = (url, opts = {}) => fetch(url, { credentials: "include", ...opts });

/* ================= Helpers ================= */
const isEmpty = (v) => v == null || String(v).trim() === "";
const fmtDate = (s) => {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
};

/* ================= Componente ================= */
const Tareas = () => {
  const [tareas, setTareas] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Filtros
  const [tab, setTab] = useState("p"); // p: pendientes | c: completadas | t: todas
  const [busqueda, setBusqueda] = useState("");

  // Modal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [tareaEditando, setTareaEditando] = useState(null);

  // Form
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    vencimiento: "",
    completado: 0,
  });

  /* ============ Carga ============ */
  const cargarTareas = async () => {
    setCargando(true);
    try {
      const r = await withCreds(`${API}/tareas`);
      const data = await r.json();
      // Asegurar estructura mínima y normalizar booleanos
      const arr = Array.isArray(data) ? data : [];
      setTareas(
        arr.map((t) => ({
          id: t.id,
          titulo: t.titulo ?? "",
          descripcion: t.descripcion ?? "",
          vencimiento: t.vencimiento ?? "",
          completado: Number(t.completado) ? 1 : 0,
          creado_en: t.creado_en, // por si tu backend lo trae (no se usa pero no molesta)
        }))
      );
    } catch (e) {
      console.error("Error cargando tareas:", e);
      setTareas([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTareas();
  }, []);

  /* ============ Derivados (filtro/orden) ============ */
  const tareasFiltradas = useMemo(() => {
  const t = busqueda.toLowerCase();
  const due = (x) => (x.vencimiento ? new Date(x.vencimiento).getTime() : Infinity);

  // Filtro por tab
  const visible = tareas.filter((ta) =>
    tab === "t" ? true : tab === "p" ? !Number(ta.completado) : Number(ta.completado) === 1
  );

  // Filtro de texto
  const buscadas = visible.filter(
    (ta) =>
      (ta.titulo || "").toLowerCase().includes(t) ||
      (ta.descripcion || "").toLowerCase().includes(t)
  );

  // Orden
  return buscadas.sort((a, b) => {
    const ga = Number(a.completado);
    const gb = Number(b.completado);
    if (tab === "p") return due(a) - due(b);        // pendientes: más próximo primero
    if (tab === "c") return due(b) - due(a);        // completadas: más reciente primero

    // Tab "t": primero pendientes, luego completadas
    if (ga !== gb) return ga - gb;                  // 0 antes que 1
    return ga === 0 ? due(a) - due(b)              // dentro de pendientes: asc
                    : due(b) - due(a);             // dentro de completadas: desc
  });
  }, [tareas, tab, busqueda]);


  /* ============ Acciones API ============ */
  const abrirNueva = () => {
    setModoEdicion(false);
    setTareaEditando(null);
    setForm({
      titulo: "",
      descripcion: "",
      vencimiento: "",
      completado: 0,
    });
    setMostrarModal(true);
  };

  const abrirEditar = (t) => {
    setModoEdicion(true);
    setTareaEditando(t);
    setForm({
      titulo: t.titulo || "",
      descripcion: t.descripcion || "",
      vencimiento: t.vencimiento || "",
      completado: Number(t.completado) ? 1 : 0,
    });
    setMostrarModal(true);
  };

  const guardar = async () => {
    if (isEmpty(form.titulo)) return;

    const payload = {
      titulo: form.titulo.trim(),
      descripcion: (form.descripcion || "").trim(),
      vencimiento: form.vencimiento || null,
      completado: Number(form.completado) ? 1 : 0,
    };

    if (modoEdicion && tareaEditando) {
      await withCreds(`${API}/tareas/${tareaEditando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await withCreds(`${API}/tareas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setMostrarModal(false);
    setModoEdicion(false);
    setTareaEditando(null);
    cargarTareas();
  };

  const eliminarTarea = async (id) => {
    if (!window.confirm("¿Eliminar esta tarea?")) return;
    await withCreds(`${API}/tareas/${id}`, { method: "DELETE" });
    cargarTareas();
  };

  const toggleCompletado = async (t) => {
    const nuevo = Number(t.completado) ? 0 : 1;
    await withCreds(`${API}/tareas/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: t.titulo,
        descripcion: t.descripcion,
        vencimiento: t.vencimiento || null,
        completado: nuevo,
      }),
    });
    cargarTareas();
  };

  /* ============ UI ============ */
  return (
    <div className="px-2 py-2">
      {/* Encabezado */}
      <div className="mb-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          {/* Izq: Título + Tabs */}
          <div className="flex-1 flex flex-wrap items-center gap-4">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              ✅ Tareas
            </h2>

            {/* Tabs estado */}
            <div className="flex gap-2 flex-wrap">
              {[
                { v: "p", label: "Pendientes" },
                { v: "c", label: "Completadas" },
                { v: "t", label: "Todas" },
              ].map((t) => (
                <button
                  key={t.v}
                  onClick={() => setTab(t.v)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors
                    ${
                      tab === t.v
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Der: Búsqueda + Nueva */}
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="🔍 Buscar por título o descripción"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full sm:w-96 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={abrirNueva}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800
                         transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              ➕ Nueva
            </button>
          </div>
        </div>
      </div>

      {/* Grilla de tareas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Skeleton de carga */}
        {cargando &&
          [...Array(6)].map((_, i) => (
            <div
              key={`sk-${i}`}
              className="p-4 rounded-2xl ring-1 ring-black/5 bg-gray-200 dark:bg-gray-800 animate-pulse h-40"
            />
          ))}

        {/* Estado vacío */}
        {!cargando && tareasFiltradas.length === 0 && (
          <div className="col-span-full text-center py-10 text-gray-500 dark:text-gray-400">
            No hay tareas para mostrar.
          </div>
        )}

        {/* Tarjetas */}
        {!cargando &&
          tareasFiltradas.map((t) => {
            const vencida =
              t.vencimiento && new Date(t.vencimiento).getTime() < Date.now() && !t.completado;

            return (
              <div
                key={t.id}
                className={`h-full flex flex-col p-4 rounded-2xl shadow-sm ring-1 ring-inset ring-black/5
                  ${t.completado ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-amber-50 dark:bg-gray-800"}
                  ${vencida ? "ring-red-400" : ""}`}
              >
                {/* Cabecera */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3
                      className={`text-base md:text-lg font-semibold truncate ${
                        t.completado
                          ? "text-emerald-800 dark:text-emerald-200 line-through"
                          : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {t.titulo}
                    </h3>
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      {t.vencimiento ? `📅 ${fmtDate(t.vencimiento)}` : "— sin fecha —"}
                      {vencida ? " • ⚠️ vencida" : ""}
                    </p>
                  </div>

                  {/* Toggle completado */}
                  <button
                    onClick={() => toggleCompletado(t)}
                    className={`px-2 py-1 text-xs rounded-lg transition-colors
                      ${
                        t.completado
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                      }`}
                    title={t.completado ? "Marcar como pendiente" : "Marcar como completada"}
                  >
                    {t.completado ? "✔️ Hecha" : "⏳ Pendiente"}
                  </button>
                </div>

                {/* Descripción */}
                {t.descripcion && (
                  <p className="mt-2 text-[15px] leading-6 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {t.descripcion}
                  </p>
                )}

                {/* Acciones al pie */}
                <div className="mt-auto pt-3 flex justify-end gap-2 border-t border-black/10">
                  <button
                    onClick={() => abrirEditar(t)}
                    className="px-3 py-1 text-xs rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => eliminarTarea(t.id)}
                    className="px-3 py-1 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* Modal crear/editar */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div
            className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto
                          shadow-xl ring-1 ring-black/10"
          >
            <h3 className="text-xl font-bold mb-4">
              {modoEdicion ? "✏️ Editar tarea" : "➕ Nueva tarea"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Título */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm((s) => ({ ...s, titulo: e.target.value }))}
                  required
                  className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2
                    ${
                      isEmpty(form.titulo)
                        ? "border-red-500 focus:ring-red-400"
                        : "border-gray-300 dark:border-gray-700 focus:ring-blue-400"
                    }
                    bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                />
              </div>

              {/* Vencimiento */}
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Vencimiento (opcional)
                </label>
                <input
                  type="date"
                  value={form.vencimiento || ""}
                  onChange={(e) => setForm((s) => ({ ...s, vencimiento: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2
                             border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                />
              </div>

              {/* Estado */}
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!form.completado}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, completado: e.target.checked ? 1 : 0 }))
                    }
                  />
                  <span>Marcar como completada</span>
                </label>
              </div>

              {/* Descripción */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Descripción
                </label>
                <textarea
                  rows={4}
                  value={form.descripcion}
                  onChange={(e) => setForm((s) => ({ ...s, descripcion: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2
                             border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setMostrarModal(false);
                  setModoEdicion(false);
                  setTareaEditando(null);
                }}
                className="px-4 py-1 rounded-xl bg-gray-600 text-white hover:bg-gray-700
                           focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={isEmpty(form.titulo)}
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

export default Tareas;
