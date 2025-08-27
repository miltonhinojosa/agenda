// frontend/src/components/Contactos.jsx
import React, { useEffect, useMemo, useState } from "react";
import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import { FaTiktok } from "react-icons/fa6";

const API = "http://localhost:3000/api";

/* ============================================================
   Helper para ENVIAR la cookie de sesión en TODAS las peticiones
   ============================================================ */
const withCreds = (url, opts = {}) => fetch(url, { credentials: "include", ...opts });

/* ================= Helpers ================= */
const onlyDigits = (s = "") => String(s).replace(/\D/g, "");
const buildWa = (codigo = "+591", cel = "") => {
  const cc = onlyDigits(codigo);
  const c = onlyDigits(cel);
  return cc && c ? `https://wa.me/${cc}${c}` : "";
};
const isEmpty = (v) => v == null || String(v).trim() === "";

// Gmail compose y normalización de redes
const gmailCompose = (email = "") =>
  email ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}` : "";

const igUrl = (v = "") => {
  if (!v) return "";
  return v.startsWith("http")
    ? v
    : `https://instagram.com/${String(v).replace(/^@/, "")}`;
};

const tkUrl = (v = "") => {
  if (!v) return "";
  return v.startsWith("http")
    ? v
    : `https://www.tiktok.com/@${String(v).replace(/^@/, "")}`;
};

// ¿Hoy es el cumpleaños?
const isBirthdayToday = (yyyy_mm_dd = "") => {
  if (!yyyy_mm_dd) return false;
  const [Y, M, D] = yyyy_mm_dd.split("-").map(Number);
  if (!M || !D) return false;
  const now = new Date();
  const mm = now.getMonth() + 1;
  const dd = now.getDate();
  return mm === M && dd === D;
};

/* ================= Componente ================= */
const Contactos = () => {
  const [contactos, setContactos] = useState([]);
  const [grupos, setGrupos] = useState([]);

  // Tabs: "favoritos" | "todos" | <id de grupo>
  const [tab, setTab] = useState("favoritos"); // por defecto Favoritos
  const [busqueda, setBusqueda] = useState("");

  // Modales
  const [mostrarModal, setMostrarModal] = useState(false); // crear/editar
  const [modoEdicion, setModoEdicion] = useState(false);
  const [contactoEditando, setContactoEditando] = useState(null);

  const [mostrarDetalle, setMostrarDetalle] = useState(false); // ver detalle
  const [contactoDetalle, setContactoDetalle] = useState(null);

  // Form (compacto)
  const [form, setForm] = useState({
    nombre: "",
    telefono_fijo: "",
    celular: "",
    codigo_pais: "+591",
    whatsapp: "",
    direccion: "",
    email: "",
    fecha_nacimiento: "",
    empresa: "",
    grupo_id: "",
    favorito: 0,
    instagram: "",
    tiktok: "",
    foto_url: "",       // url que devuelve tu backend al subir
    archivoFoto: null,  // file para subir
  });

  /* ============ Cargas ============ */
  const cargarGrupos = async () => {
    try {
      const r = await withCreds(`${API}/grupos`);
      const data = await r.json();
      setGrupos(Array.isArray(data) ? data : []);
    } catch {
      setGrupos([]);
    }
  };
  const cargarContactos = async () => {
    try {
      const r = await withCreds(`${API}/contactos`);
      const data = await r.json();
      setContactos(Array.isArray(data) ? data : []);
    } catch {
      setContactos([]);
    }
  };
  useEffect(() => {
    cargarGrupos();
    cargarContactos();
  }, []);

  /* ============ Conteos para tabs ============ */
  const conteos = useMemo(() => {
    const counts = { todos: contactos.length, favoritos: 0 };
    for (const g of grupos) counts[g.id] = 0;
    for (const c of contactos) {
      if (c.favorito) counts.favoritos += 1;
      if (c.grupo_id != null && counts[c.grupo_id] != null) counts[c.grupo_id] += 1;
    }
    return counts;
  }, [contactos, grupos]);

  /* ============ Lista filtrada/ordenada ============ */
  const lista = useMemo(() => {
    const t = busqueda.toLowerCase();
    return contactos
      .filter((c) => {
        if (tab === "favoritos" && !c.favorito) return false;
        if (tab !== "favoritos" && tab !== "todos") {
          if (String(c.grupo_id) !== String(tab)) return false;
        }
        if (!isEmpty(t)) {
          const grupoNombre =
            grupos.find((g) => String(g.id) === String(c.grupo_id))?.nombre || "";
          return (
            (c.nombre || "").toLowerCase().includes(t) ||
            (c.celular || "").toLowerCase().includes(t) ||
            (c.telefono_fijo || "").toLowerCase().includes(t) ||
            (c.email || "").toLowerCase().includes(t) ||
            (c.empresa || "").toLowerCase().includes(t) ||
            grupoNombre.toLowerCase().includes(t) ||
            (c.instagram || "").toLowerCase().includes(t) ||
            (c.tiktok || "").toLowerCase().includes(t)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (b.favorito !== a.favorito) return b.favorito - a.favorito;
        return String(a.nombre || "").localeCompare(String(b.nombre || ""), undefined, {
          sensitivity: "base",
        });
      });
  }, [contactos, grupos, tab, busqueda]);

  /* ============ Acciones ============ */
  const abrirNuevo = () => {
    setModoEdicion(false);
    setContactoEditando(null);
    setForm({
      nombre: "",
      telefono_fijo: "",
      celular: "",
      codigo_pais: "+591",
      whatsapp: "",
      direccion: "",
      email: "",
      fecha_nacimiento: "",
      empresa: "",
      grupo_id: tab !== "favoritos" && tab !== "todos" ? Number(tab) : "",
      favorito: 0,
      instagram: "",
      tiktok: "",
      foto_url: "",
      archivoFoto: null,
    });
    setMostrarModal(true);
  };
  const abrirEditar = (c) => {
    setModoEdicion(true);
    setContactoEditando(c);
    setForm({
      nombre: c.nombre || "",
      telefono_fijo: c.telefono_fijo || "",
      celular: c.celular || "",
      codigo_pais: c.codigo_pais || "+591",
      whatsapp: c.whatsapp || "",
      direccion: c.direccion || "",
      email: c.email || "",
      fecha_nacimiento: c.fecha_nacimiento || "",
      empresa: c.empresa || "",
      grupo_id: c.grupo_id ?? "",
      favorito: c.favorito ? 1 : 0,
      instagram: c.instagram || "",
      tiktok: c.tiktok || "",
      foto_url: c.foto_url || "",
      archivoFoto: null,
    });
    setMostrarModal(true);
  };
  const subirFoto = async () => {
    if (!form.archivoFoto) return;
    const fd = new FormData();
    fd.append("foto", form.archivoFoto);
    const up = await withCreds(`${API}/upload`, { method: "POST", body: fd });
    const data = await up.json();
    if (data?.url) setForm((s) => ({ ...s, foto_url: data.url, archivoFoto: null }));
  };
  const guardar = async () => {
    if (isEmpty(form.nombre) || isEmpty(form.celular)) return;
    const payload = {
      ...form,
      nombre: form.nombre.trim(),
      telefono_fijo: form.telefono_fijo || "",
      celular: form.celular || "",
      codigo_pais: form.codigo_pais || "+591",
      whatsapp: buildWa(form.codigo_pais, form.celular),
      direccion: form.direccion || "",
      email: form.email || "",
      fecha_nacimiento: form.fecha_nacimiento || "",
      empresa: form.empresa || "",
      grupo_id: form.grupo_id === "" ? null : Number(form.grupo_id),
      favorito: form.favorito ? 1 : 0,
      archivoFoto: undefined, // no se envía
    };
    const url = modoEdicion ? `${API}/contactos/${contactoEditando.id}` : `${API}/contactos`;
    const method = modoEdicion ? "PUT" : "POST";
    await withCreds(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setMostrarModal(false);
    setModoEdicion(false);
    setContactoEditando(null);
    cargarContactos(); // el backend crea/actualiza el evento automáticamente
  };
  const eliminar = async (id) => {
    if (!window.confirm("¿Eliminar este contacto?")) return;
    await withCreds(`${API}/contactos/${id}`, { method: "DELETE" });
    setMostrarDetalle(false);
    cargarContactos();
  };

  // Toggle favorito (optimista + PATCH)
  const toggleFavorito = async (c) => {
    const nuevo = c.favorito ? 0 : 1;
    setContactos((prev) => prev.map((x) => (x.id === c.id ? { ...x, favorito: nuevo } : x))); // optimista
    try {
      const res = await withCreds(`${API}/contactos/${c.id}/favorito`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor: nuevo }),
      });
      if (!res.ok) throw new Error("PATCH favorito falló");
    } catch (e) {
      // rollback
      setContactos((prev) => prev.map((x) => (x.id === c.id ? { ...x, favorito: c.favorito } : x)));
      alert("No se pudo actualizar favorito.");
    }
  };

  const nombreGrupo = (id) => grupos.find((g) => String(g.id) === String(id))?.nombre || "";

  /* ================= UI ================= */
  return (
    <div className="px-2 py-2">
      {/* Encabezado */}
      <div className="mb-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          {/* Izquierda: título + pestañas */}
          <div className="flex-1 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">📇 Contactos</h2>
            
            {/* Botón export CSV */}
            <a
              href={
                import.meta.env.DEV
                  ? "http://localhost:3000/api/contactos/export/csv"
                  : "/api/contactos/export/csv"
              }
              className="text-xs px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700
                        hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Exportar contactos a CSV"
            >
              Exportar CSV
            </a>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setTab("favoritos")}
                className={`px-3 py-1.5 rounded-full text-sm border flex items-center gap-2
                ${tab === "favoritos" ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700"}`}
              >
                <span>★ Favoritos</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${tab === "favoritos" ? "bg-blue-700 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-100"}`}>
                  {conteos.favoritos ?? 0}
                </span>
              </button>
              <button
                onClick={() => setTab("todos")}
                className={`px-3 py-1.5 rounded-full text-sm border flex items-center gap-2
                ${tab === "todos" ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700"}`}
              >
                <span>Todos</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${tab === "todos" ? "bg-blue-700 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-100"}`}>
                  {conteos.todos ?? 0}
                </span>
              </button>
              {grupos.map((g) => {
                const active = String(tab) === String(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => setTab(String(g.id))}
                    className={`px-3 py-1.5 rounded-full text-sm border flex items-center gap-2
                      ${active ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700"}`}
                  >
                    <span>{g.nombre}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${active ? "bg-blue-700 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-100"}`}>
                      {conteos[g.id] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Derecha: buscador + nuevo */}
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="🔍 Buscar por nombre, teléfono, email, empresa, Instagram"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700
                        bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                        focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <button
              onClick={abrirNuevo}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              ➕ Nuevo
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {lista.length === 0 && (
          <div className="col-span-full text-center py-10 text-gray-500 dark:text-gray-400">
            No hay contactos para mostrar.
          </div>
        )}

        {lista.map((c) => {
          const wa = buildWa(c.codigo_pais, c.celular);
          const esFav = !!c.favorito;
          const urlIg = igUrl(c.instagram || "");
          const urlTk = tkUrl(c.tiktok || "");
          const hoyCumple = isBirthdayToday(c.fecha_nacimiento);

          return (
            <div
              key={c.id}
              className="flex items-start gap-3 p-3 rounded-2xl bg-gray-200 dark:bg-gray-800 ring-1 ring-black/5 shadow-sm"
            >
              {/* Columna foto + ojo debajo (abre detalle) */}
              <div className="flex flex-col items-center shrink-0">
                <button
                  onClick={() => {
                    setContactoDetalle(c);
                    setMostrarDetalle(true);
                  }}
                  className="mt-2 text-gray-500 dark:text-gray-300 hover:text-black dark:hover:text-white text-lg"
                  title="Ver detalles"
                >
                  {c.foto_url ? (
                    <img
                      src={`http://localhost:3000${c.foto_url}`}
                      alt="Foto"
                      className="w-20 h-20 object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white text-lg">
                      👤
                    </div>
                  )}
                </button>
              </div>

              {/* Columna datos + estrella + accesos */}
              <div className="flex-1 min-w-0">
                {/* Nombre + estrella (+ 🎂 si hoy) */}
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
                    {c.nombre} {hoyCumple ? "🎂" : ""}
                  </h3>
                  <button
                    onClick={() => toggleFavorito(c)}
                    className={`text-2xl ${esFav ? "text-yellow-500 hover:text-yellow-600" : "text-gray-400 hover:text-gray-500"}`}
                    title={esFav ? "Quitar de favoritos" : "Marcar favorito"}
                  >
                    {esFav ? "★" : "☆"}
                  </button>
                </div>

                {/* Datos breves */}
                <div className="mt-0.5 text-[13px] leading-5 text-gray-900 dark:text-gray-100">
                  <div className="truncate">📱 {c.celular || "—"}</div>
                  {c.email && (
                    <div className="truncate">
                      ✉️{" "}
                      <a
                        href={gmailCompose(c.email)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:no-underline"
                        title="Escribir con Gmail"
                      >
                        {c.email}
                      </a>
                    </div>
                  )}
                </div>

                {/* Accesos rápidos */}
                <div className="mt-2 flex items-center gap-2">
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white"
                      title="WhatsApp"
                    >
                      <FaWhatsapp />
                    </a>
                  )}

                  {urlIg && (
                    <a
                      href={urlIg}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white"
                      title="Instagram"
                    >
                      <FaInstagram />
                    </a>
                  )}

                  {urlTk && (
                    <a
                      href={urlTk}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-black text-white"
                      title="TikTok"
                    >
                      <FaTiktok />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal detalle */}
      {mostrarDetalle && contactoDetalle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl ring-1 ring-black/10">
            <h3 className="text-xl font-bold mb-4 text-center">👁️ Detalle del contacto</h3>

            <div className="flex flex-col items-center mb-4">
              {contactoDetalle.foto_url ? (
                <img
                  src={`http://localhost:3000${contactoDetalle.foto_url}`}
                  alt="Foto"
                  className="w-40 h-40 rounded-full object-cover shadow-lg border-4 border-white dark:border-gray-700"
                />
              ) : (
                <div className="w-40 h-40 rounded-full bg-gray-400 flex items-center justify-center text-5xl text-white">
                  👤
                </div>
              )}
              <h4 className="text-2xl font-bold mt-2">{contactoDetalle.nombre}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                {nombreGrupo(contactoDetalle.grupo_id) || ""}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm px-2">
              <p><strong>📱 Celular:</strong> {contactoDetalle.celular || "—"}</p>
              <p><strong>☎️ Fijo:</strong> {contactoDetalle.telefono_fijo || "—"}</p>

              {/* Email con Gmail compose */}
              <p>
                <strong>✉️ Email:</strong>{" "}
                {contactoDetalle.email ? (
                  <a
                    href={gmailCompose(contactoDetalle.email)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                    title="Escribir con Gmail"
                  >
                    {contactoDetalle.email}
                  </a>
                ) : "—"}
              </p>

              <p><strong>🏢 Empresa:</strong> {contactoDetalle.empresa || "—"}</p>
              <p><strong>📍 Dirección:</strong> {contactoDetalle.direccion || "—"}</p>
              <p><strong>🎂 Nacimiento:</strong> {contactoDetalle.fecha_nacimiento || "—"}</p>

              {/* Instagram */}
              <p>
                <strong>📷 Instagram:</strong>{" "}
                {contactoDetalle.instagram ? (
                  <a
                    href={igUrl(contactoDetalle.instagram)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                  >
                    {contactoDetalle.instagram}
                  </a>
                ) : "—"}
              </p>

              {/* TikTok */}
              <p>
                <strong>🎵 TikTok:</strong>{" "}
                {contactoDetalle.tiktok ? (
                  <a
                    href={tkUrl(contactoDetalle.tiktok)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                  >
                    {contactoDetalle.tiktok}
                  </a>
                ) : "—"}
              </p>

              {/* WhatsApp (si existe link) */}
              <p>
                <strong>💬 WhatsApp:</strong>{" "}
                {contactoDetalle.whatsapp ? (
                  <a
                    href={contactoDetalle.whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                  >
                    Abrir conversación
                  </a>
                ) : "—"}
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setMostrarDetalle(false); abrirEditar(contactoDetalle); }}
                className="px-3 py-1 text-xs rounded-lg bg-amber-500 text-white hover:bg-amber-600"
              >
                Editar
              </button>
              <button
                onClick={() => eliminar(contactoDetalle.id)}
                className="px-3 py-1 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Eliminar
              </button>
              <button
                onClick={() => setMostrarDetalle(false)}
                className="px-3 py-1 text-xs rounded-lg bg-gray-600 text-white hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear/editar (compacto) */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-2xl p-5 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl ring-1 ring-black/10">
            <h3 className="text-lg md:text-xl font-bold mb-3">
              {modoEdicion ? "✏️ Editar contacto" : "➕ Nuevo contacto"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Nombre */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2
                  ${isEmpty(form.nombre) ? "border-red-500 focus:ring-red-400" : "border-gray-300 dark:border-gray-700 focus:ring-blue-400"} bg-white dark:bg-gray-900`}
                />
              </div>

              {/* === Fila teléfonos: Celular (select + input) a la izq / Fijo a la der === */}
              <div>
                <label className="block text-xs font-medium mb-1">
                  Celular <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-[6.5rem,1fr] gap-2">
                  <select
                    value={form.codigo_pais}
                    onChange={(e) => setForm(s => ({ ...s, codigo_pais: e.target.value }))}
                    className="w-full h-10 px-2 rounded-xl border border-gray-300 dark:border-gray-700
                              bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="+591">BO +591</option>
                    <option value="+54">AR +54</option>
                    <option value="+55">BR +55</option>
                    <option value="+56">CL +56</option>
                    <option value="+57">CO +57</option>
                    <option value="+593">EC +593</option>
                    <option value="+52">MX +52</option>
                    <option value="+51">PE +51</option>
                    <option value="+598">UY +598</option>
                    <option value="+58">VE +58</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Celular"
                    value={form.celular}
                    onChange={(e) => setForm(s => ({ ...s, celular: e.target.value }))}
                    className={`w-full h-10 px-3 rounded-xl border text-sm focus:outline-none focus:ring-2
                      ${!form.celular?.trim() ? "border-red-500 focus:ring-red-400" : "border-gray-300 dark:border-gray-700 focus:ring-blue-400"}
                      bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Teléfono fijo</label>
                <input
                  type="text"
                  placeholder="Teléfono fijo"
                  value={form.telefono_fijo}
                  onChange={(e) => setForm(s => ({ ...s, telefono_fijo: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border text-sm focus:outline-none focus:ring-2
                            border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              {/* Dirección / Email / Cumpleaños en la misma fila */}
              <div className=" md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Dirección</label>
                  <input
                    type="text"
                    value={form.direccion}
                    onChange={(e) => setForm((s) => ({ ...s, direccion: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Cumpleaños</label>
                  <input
                    type="date"
                    value={form.fecha_nacimiento || ""}
                    onChange={(e) => setForm((s) => ({ ...s, fecha_nacimiento: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                  />
                </div>
              </div>

              {/* Instagram / TikTok */}
              <div>
                <label className="block text-xs font-medium mb-1">Instagram</label>
                <input
                  type="text"
                  value={form.instagram}
                  onChange={(e) => setForm((s) => ({ ...s, instagram: e.target.value }))}
                  placeholder="@usuario o url"
                  className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">TikTok</label>
                <input
                  type="text"
                  value={form.tiktok}
                  onChange={(e) => setForm((s) => ({ ...s, tiktok: e.target.value }))}
                  placeholder="@usuario o url"
                  className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                />
              </div>

              {/* Empresa / Grupo */}
              <div>
                <label className="block text-xs font-medium mb-1">Empresa</label>
                <input
                  type="text"
                  value={form.empresa}
                  onChange={(e) => setForm((s) => ({ ...s, empresa: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Grupo</label>
                <select
                  value={form.grupo_id === null ? "" : form.grupo_id}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      grupo_id: e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                >
                  <option value="">-- Selecciona grupo --</option>
                  {grupos.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Foto: archivo + subir + checkbox favorito */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1">Foto (subir archivo)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setForm((s) => ({ ...s, archivoFoto: e.target.files?.[0] || null }))
                    }
                    className="text-sm"
                  />
                  <button
                    type="button"
                    onClick={subirFoto}
                    disabled={!form.archivoFoto}
                    className="px-3 py-1 text-xs rounded-lg bg-blue-600 text-white disabled:opacity-50"
                  >
                    Subir foto
                  </button>
                  {form.foto_url && (
                    <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
                      Guardada ✔
                    </span>
                  )}

                  <div className="md:col-span-2 px-8">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!form.favorito}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, favorito: e.target.checked ? 1 : 0 }))
                        }
                      />
                      <span>Marcar como favorito</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex justify-end gap-3">
              <button
                onClick={() => {
                  setMostrarModal(false);
                  setModoEdicion(false);
                  setContactoEditando(null);
                }}
                className="px-4 py-1 rounded-xl bg-gray-600 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={isEmpty(form.nombre) || isEmpty(form.celular)}
                className="px-4 py-1 rounded-xl bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
export default Contactos;
