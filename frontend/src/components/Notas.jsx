import React, { useEffect, useMemo, useState } from "react";
import { MdArchive, MdUnarchive } from "react-icons/md";
import { BsPinFill, BsPinAngleFill } from "react-icons/bs";

/* ================= Config ================= */
const API = "http://localhost:3000/api";
const COLORS = [
  { key: "slate",   bg: "bg-slate-200 dark:bg-slate-800", ring: "ring-slate-400" },
  { key: "amber",   bg: "bg-amber-200 dark:bg-amber-800", ring: "ring-amber-400" },
  { key: "emerald", bg: "bg-emerald-200 dark:bg-emerald-800", ring: "ring-emerald-400" },
  { key: "sky",     bg: "bg-sky-200 dark:bg-sky-800", ring: "ring-sky-400" },
  { key: "violet",  bg: "bg-violet-200 dark:bg-violet-800", ring: "ring-violet-400" },
  { key: "rose",    bg: "bg-rose-200 dark:bg-rose-800", ring: "ring-rose-400" },
  { key: "orange",  bg: "bg-orange-200 dark:bg-orange-800", ring: "ring-orange-400" },
  { key: "teal",    bg: "bg-teal-200 dark:bg-teal-800", ring: "ring-teal-400" },
  { key: "pink",    bg: "bg-pink-200 dark:bg-pink-800", ring: "ring-pink-400" },
];

/* ================= Helpers ================= */
const fmtDateTime = (s) => {
  if (!s) return "";
  const d = new Date(s);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};
const colorToTailwind = (key) =>
  COLORS.find((c) => c.key === key)?.bg || "bg-gray-200 dark:bg-gray-800";
const isEmpty = (v) => v == null || String(v).trim() === "";

/* ================= Componente ================= */
const Notas = () => {
  const [notas, setNotas] = useState([]);
  const [contactos, setContactos] = useState([]);

  // Estados UI
  const [cargandoNotas, setCargandoNotas] = useState(false);

  // Filtros
  const [tabEstado, setTabEstado] = useState("p"); // p: pendientes | a: archivadas | t: todas
  const [busqueda, setBusqueda] = useState("");
  const [filtroContacto, setFiltroContacto] = useState("todos");

  // Modal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [notaEditando, setNotaEditando] = useState(null);

  // Form
  const [form, setForm] = useState({
    titulo: "",
    contenido: "",
    color: "slate",
    fijada: 0,
    archivada: 0,
    recordatorio_en: "",
    contactosIds: [],
  });

  // Checkbox para mostrar/ocultar el selector de contactos en el modal
  const [incluirContactos, setIncluirContactos] = useState(false);

  // Preferencia persistente para "nueva nota"
  const PREFER_KEY = "preferIncluirContactos";

  /* ============ Carga ============ */
  const cargarNotas = async () => {
    setCargandoNotas(true);
    try {
      const params = new URLSearchParams({
        estado: tabEstado,
        ordenar: "reciente",
        limit: 200,
      });
      const r = await fetch(`${API}/notas?${params.toString()}`);
      const data = await r.json();
      setNotas(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando notas:", e);
      setNotas([]);
    } finally {
      setCargandoNotas(false);
    }
  };

  const cargarContactos = async () => {
    try {
      const r = await fetch(`${API}/contactos`);
      const data = await r.json();
      setContactos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando contactos:", e);
      setContactos([]);
    }
  };

  useEffect(() => {
    cargarContactos();
  }, []);
  useEffect(() => {
    cargarNotas();
  }, [tabEstado]);

  // Cargar preferencia al montar
  useEffect(() => {
    const raw = localStorage.getItem(PREFER_KEY);
    if (raw === "1") setIncluirContactos(true);
    if (raw === "0") setIncluirContactos(false);
  }, []);

  /* ============ Filtrado ============ */
  const notasFiltradas = useMemo(() => {
    const t = busqueda.toLowerCase();
    return notas.filter((n) => {
      const pasaContacto =
        filtroContacto === "todos" ||
        (n.contactos || []).some((c) => String(c.id) === String(filtroContacto));

      const contactosTexto = (n.contactos || [])
        .map((c) => c.nombre || "")
        .join(" ")
        .toLowerCase();

      const pasaTexto =
        (n.titulo || "").toLowerCase().includes(t) ||
        (n.contenido || "").toLowerCase().includes(t) ||
        contactosTexto.includes(t);

      return pasaContacto && pasaTexto;
    });
  }, [notas, busqueda, filtroContacto]);

  /* ============ Acciones API ============ */
  const toggleFijada = async (id, valor) => {
    await fetch(`${API}/notas/${id}/fijar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(typeof valor === "number" ? { valor } : {}),
    });
    cargarNotas();
  };

  const toggleArchivada = async (id, valor) => {
    await fetch(`${API}/notas/${id}/archivar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(typeof valor === "number" ? { valor } : {}),
    });
    cargarNotas();
  };

  const eliminarNota = async (id) => {
    if (!window.confirm("¿Eliminar esta nota?")) return;
    await fetch(`${API}/notas/${id}`, { method: "DELETE" });
    cargarNotas();
  };

  const abrirNueva = () => {
    setModoEdicion(false);
    setNotaEditando(null);
    setForm({
      titulo: "",
      contenido: "",
      color: "slate",
      fijada: 0,
      archivada: tabEstado === "a" ? 1 : 0,
      recordatorio_en: "",
      contactosIds: [], // limpio en nueva
    });

    // Leer preferencia guardada para nueva nota
    const raw = localStorage.getItem(PREFER_KEY);
    const prefer = raw === "1";
    setIncluirContactos(prefer);

    setMostrarModal(true);
  };

  const abrirEditar = (n) => {
    setModoEdicion(true);
    setNotaEditando(n);

    const contactosIds = (n.contactos || []).map((c) => c.id);
    setForm({
      titulo: n.titulo || "",
      contenido: n.contenido || "",
      color: n.color || "slate",
      fijada: Number(n.fijada) ? 1 : 0,
      archivada: Number(n.archivada) ? 1 : 0,
      recordatorio_en: n.recordatorio_en || "",
      contactosIds, // los que ya tiene
    });

    // En edición: ON solo si ya tiene contactos
    setIncluirContactos(contactosIds.length > 0);

    setMostrarModal(true);
  };

  const guardar = async () => {
    if (isEmpty(form.titulo) || isEmpty(form.contenido)) return;

    const payload = {
      titulo: form.titulo.trim(),
      contenido: form.contenido.trim(),
      color: form.color || null,
      fijada: Number(form.fijada) ? 1 : 0,
      archivada: Number(form.archivada) ? 1 : 0,
      recordatorio_en: form.recordatorio_en || null,
      // Si el checkbox está apagado, no se envían contactos
      contactosIds: incluirContactos ? form.contactosIds : [],
    };

    if (modoEdicion && notaEditando) {
      await fetch(`${API}/notas/${notaEditando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`${API}/notas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setMostrarModal(false);
    setModoEdicion(false);
    setNotaEditando(null);
    cargarNotas();
  };

  /* ============ Handlers ============ */
  const handleToggleIncluirContactos = (checked) => {
    setIncluirContactos(checked);
    if (!checked) {
      // si se apaga, limpiamos los contactos seleccionados
      setForm((s) => ({ ...s, contactosIds: [] }));
    }
    // Guardar preferencia SOLO cuando sea "nueva nota" (no edición)
    if (!modoEdicion) {
      localStorage.setItem(PREFER_KEY, checked ? "1" : "0");
    }
  };

  /* ============ UI ============ */
  return (
    <div className="px-2 py-2">
      {/* Encabezado */}
      <div className="mb-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          {/* Izq: Título + Tabs + Filtro contacto */}
          <div className="flex-1 flex flex-wrap items-center gap-4">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">
              📝 Notas
            </h2>

            {/* Tabs estado */}
            <div className="flex gap-2 flex-wrap">
              {[
                { v: "p", label: "Pendientes" },
                { v: "a", label: "Archivadas" },
                { v: "t", label: "Todas" },
              ].map((t) => (
                <button
                  key={t.v}
                  onClick={() => setTabEstado(t.v)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors
                    ${
                      tabEstado === t.v
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Filtro contacto */}
            <select
              value={filtroContacto}
              onChange={(e) => setFiltroContacto(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="todos">Todos los contactos</option>
              {contactos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Der: Búsqueda + Nueva */}
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="🔍 Buscar por título, contenido o contacto"
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

      {/* Grilla de notas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Skeleton de carga */}
        {cargandoNotas &&
          [...Array(6)].map((_, i) => (
            <div
              key={`sk-${i}`}
              className="p-4 rounded-2xl ring-1 ring-black/5 bg-gray-200 dark:bg-gray-800 animate-pulse h-40"
            />
          ))}

        {/* Estado vacío */}
        {!cargandoNotas && notasFiltradas.length === 0 && (
          <div className="col-span-full text-center py-10 text-gray-500 dark:text-gray-400">
            No hay notas para mostrar.
          </div>
        )}

        {/* Tarjetas */}
        {!cargandoNotas &&
          notasFiltradas.map((n) => (
            <div
              key={n.id}
              className={`h-full flex flex-col p-4 rounded-2xl shadow-sm ring-1 ring-inset ring-black/5 ${colorToTailwind(
                n.color
              )}`}
            >
              {/* Cabecera */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {n.titulo}
                  </h3>
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    {n.fijada ? "Fijada • " : ""}
                    {n.archivada ? "Archivada • " : ""}
                    {n.recordatorio_en ? `⏰ ${fmtDateTime(n.recordatorio_en)}` : ""}
                  </p>
                </div>

                {/* Acciones con ICONOS */}
                <div className="flex gap-1">
                  {/* Fijar / Desfijar */}
                  <button
                    onClick={() => toggleFijada(n.id)}
                    className="px-2 py-1 text-lg rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    aria-label={n.fijada ? "Desfijar" : "Fijar"}
                    title={n.fijada ? "Desfijar" : "Fijar"}
                  >
                    {n.fijada ? <BsPinFill /> : <BsPinAngleFill />}
                  </button>

                  {/* Archivar / Desarchivar */}
                  <button
                    onClick={() => toggleArchivada(n.id)}
                    className="px-2 py-1 text-lg rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    aria-label={n.archivada ? "Desarchivar" : "Archivar"}
                    title={n.archivada ? "Desarchivar" : "Archivar"}
                  >
                    {n.archivada ? <MdUnarchive /> : <MdArchive />}
                  </button>
                </div>
              </div>

              {/* Contenido + chips ocupan el espacio flexible */}
              <div className="mt-2 flex-1">
                <p className="text-[15px] leading-6 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {n.contenido}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(n.contactos || []).map((c) => (
                    <span
                      key={`c-${n.id}-${c.id}`}
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full
                                 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                    >
                      <span>👤</span>
                      {c.nombre}
                    </span>
                  ))}
                </div>
              </div>

              {/* Acciones SIEMPRE abajo a la derecha */}
              <div className="mt-auto pt-3 flex justify-end gap-2 border-t border-black/10">
                <button
                  onClick={() => abrirEditar(n)}
                  className="px-3 py-1 text-xs rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => eliminarNota(n.id)}
                  className="px-3 py-1 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Modal crear/editar */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto
                          shadow-xl ring-1 ring-black/10">
            <h3 className="text-xl font-bold mb-4">
              {modoEdicion ? "✏️ Editar nota" : "➕ Nueva nota"}
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

              {/* Contenido */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Contenido <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={6}
                  value={form.contenido}
                  onChange={(e) => setForm((s) => ({ ...s, contenido: e.target.value }))}
                  required
                  className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2
                    ${
                      isEmpty(form.contenido)
                        ? "border-red-500 focus:ring-red-400"
                        : "border-gray-300 dark:border-gray-700 focus:ring-blue-400"
                    }
                    bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                />
              </div>

              {/* Colores + Checkboxes en una sola fila */}
              <div className="md:col-span-2 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Colores */}
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setForm((s) => ({ ...s, color: c.key }))}
                        className={`w-8 h-8 rounded-full border ${c.bg} ${
                          form.color === c.key ? `ring-2 ${c.ring}` : ""
                        }`}
                        title={c.key}
                      />
                    ))}
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="flex items-center gap-6">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!form.fijada}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, fijada: e.target.checked ? 1 : 0 }))
                      }
                    />
                    <span>Fijar</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!form.archivada}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, archivada: e.target.checked ? 1 : 0 }))
                      }
                    />
                    <span>Archivar</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={incluirContactos}
                      onChange={(e) => handleToggleIncluirContactos(e.target.checked)}
                    />
                    <span>Vincular contactos</span>
                  </label>
                </div>
              </div>

              {/* Aviso en edición si apagaste contactos y la nota tenía vínculos */}
              {modoEdicion && !incluirContactos && form.contactosIds.length > 0 && (
                <p className="md:col-span-2 -mt-2 text-xs text-red-600">
                  Al guardar se eliminarán los contactos vinculados a esta nota.
                </p>
              )}

              {/* Fila compacta: Recordatorio (izq) + Contactos (der) */}
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Recordatorio (fecha y hora)
                </label>
                <input
                  type="datetime-local"
                  value={form.recordatorio_en || ""}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, recordatorio_en: e.target.value }))
                  }
                  className="w-full px-2 py-1 rounded border text-sm dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700"
                />
              </div>

              {/* Select de contactos (mismo nivel que recordatorio, a la derecha) */}
              <div>
                {incluirContactos && (
                  <>
                    <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Seleccionar contactos
                    </label>
                    <select
                      multiple
                      value={form.contactosIds.map(String)}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          contactosIds: Array.from(e.target.selectedOptions).map((o) =>
                            Number(o.value)
                          ),
                        }))
                      }
                      className="w-full px-2 py-2 rounded border text-sm dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700 h-28"
                    >
                      {contactos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setMostrarModal(false);
                  setModoEdicion(false);
                  setNotaEditando(null);
                }}
                className="px-4 py-1 rounded-xl bg-gray-600 text-white hover:bg-gray-700
                           focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={isEmpty(form.titulo) || isEmpty(form.contenido)}
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

export default Notas;
