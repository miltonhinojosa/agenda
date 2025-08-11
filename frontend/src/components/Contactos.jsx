import React, { useEffect, useState } from 'react';
import { FaWhatsapp, FaFacebookF, FaEye } from 'react-icons/fa';

const Contactos = () => {
  const [contactos, setContactos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [contactoDetalle, setContactoDetalle] = useState(null);
  const [busqueda, setBusqueda] = useState('');


  const [modoEdicion, setModoEdicion] = useState(false);
  const [contactoEditandoId, setContactoEditandoId] = useState(null);


  const [nuevoContacto, setNuevoContacto] = useState({
    nombre: '',
    telefono_fijo: '',
    celular: '',
    direccion: '',
    email: '',
    facebook: '',
    fecha_nacimiento: '',
    empresa: '',
    grupo_id: '',
    foto_url: '',
    archivoFoto: null,
    codigo_pais: '+591'
  });

  const cargarContactos = () => {
    fetch('http://localhost:3000/api/contactos')
      .then(res => res.json())
      .then(setContactos)
      .catch(console.error);
  };

  const cargarGrupos = () => {
    fetch('http://localhost:3000/api/grupos')
      .then(res => res.json())
      .then(setGrupos)
      .catch(console.error);
  };

  useEffect(() => {
    cargarContactos();
    cargarGrupos();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'archivoFoto') {
      setNuevoContacto({ ...nuevoContacto, archivoFoto: files[0] });
    } else {
      setNuevoContacto({ ...nuevoContacto, [name]: value });
    }
  };

  const guardarContacto = async () => {
    try {
      let urlFoto = nuevoContacto.foto_url;

      // Si se sube una nueva foto
      if (nuevoContacto.archivoFoto) {
        const formData = new FormData();
        formData.append('foto', nuevoContacto.archivoFoto);
        const res = await fetch('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        urlFoto = data.url;
      }

      const contactoAEnviar = {
        ...nuevoContacto,
        foto_url: urlFoto,
        archivoFoto: undefined
      };

      const method = modoEdicion ? 'PUT' : 'POST';
      const endpoint = modoEdicion
        ? `http://localhost:3000/api/contactos/${contactoEditandoId}`
        : 'http://localhost:3000/api/contactos';

      await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactoAEnviar)
      });

      // Reset
      setMostrarModal(false);
      setModoEdicion(false);
      setContactoEditandoId(null);
      setNuevoContacto({
        nombre: '',
        telefono_fijo: '',
        celular: '',
        direccion: '',
        email: '',
        facebook: '',
        fecha_nacimiento: '',
        empresa: '',
        grupo_id: '',
        foto_url: '',
        archivoFoto: null,
        codigo_pais: '+591'
      });
      cargarContactos();
    } catch (error) {
      console.error('Error al guardar contacto:', error);
    }
  };


  const obtenerNombreGrupo = (id) => {
    const grupo = grupos.find((g) => g.id === id);
    return grupo ? grupo.nombre : '';
  };

  const eliminarContacto = async (id) => {
  const confirmar = window.confirm("¿Estás seguro de que deseas eliminar este contacto?");
  if (!confirmar) return;

    try {
      await fetch(`http://localhost:3000/api/contactos/${id}`, {
        method: 'DELETE'
      });
      setMostrarDetalle(false);
      cargarContactos();
    } catch (error) {
      console.error("Error al eliminar contacto:", error);
      alert("No se pudo eliminar el contacto.");
    }
  };

  return (
    <div className="px-2 py-2">
      {/* Encabezado barra de titulos, buscador y botón nueva cita  */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">📇 Contactos</h2>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="🔍 Buscar (nombre, celular, empresa, grupo)"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full sm:w-80 px-3 py-2 border rounded dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700"
          />
          
          {/* Botón para abrir modal de nuevo contacto */}
          <button
            onClick={() => {
              setMostrarModal(true);
              setModoEdicion(false);
              setContactoEditandoId(null);
              setNuevoContacto({
                nombre: '',
                telefono_fijo: '',
                celular: '',
                direccion: '',
                email: '',
                facebook: '',
                fecha_nacimiento: '',
                empresa: '',
                grupo_id: '',
                foto_url: '',
                archivoFoto: null,
                codigo_pais: '+591'
              });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            ➕ Nuevo contacto
          </button>
        </div>
      </div>

      {/* Tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {contactos
          .filter((c) => {
            const texto = busqueda.toLowerCase();
            return (
              c.nombre?.toLowerCase().includes(texto) ||
              c.celular?.toLowerCase().includes(texto) ||
              c.empresa?.toLowerCase().includes(texto) ||
              obtenerNombreGrupo(c.grupo_id)?.toLowerCase().includes(texto)
            );
          })
          .map((c) => (
            <div
              key={c.id}
              className="flex p-3 bg-gray-200 dark:bg-gray-800 rounded-lg shadow-md items-start gap-3"
            >
              {/* Foto + Ver */}
              <div className="flex flex-col items-center shrink-0">
                {c.foto_url ? (
                  <img
                    src={`http://localhost:3000${c.foto_url}`}
                    alt="Foto"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white text-lg">
                    👤
                  </div>
                )}
                <button
                  onClick={() => {
                    setContactoDetalle(c);
                    setMostrarDetalle(true);
                  }}
                  className="mt-2 text-gray-500 dark:text-gray-300 hover:text-black dark:hover:text-white text-lg"
                  title="Ver detalles"
                >
                  <FaEye />
                </button>
              </div>

              {/* Datos */}
              <div className="flex-1 text-sm text-gray-800 dark:text-gray-100">
                <h3 className="font-semibold text-base mb-1">{c.nombre}</h3>
                <p>📱 {c.celular}</p>
                {c.telefono_fijo && <p>☎️ {c.telefono_fijo}</p>}
                {c.email && (
                  <p>
                    📧{' '}
                    <a
                      href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(c.email)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800"
                    >
                      {c.email}
                    </a>
                  </p>
                )}
              </div>

              {/* Íconos */}
              <div className="flex flex-col items-center justify-start gap-2 pl-2 mt-1">
                {c.celular && (
                  <a
                    href={`https://wa.me/591${c.celular.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-500 hover:text-green-600 text-2xl"
                  >
                    <FaWhatsapp />
                  </a>
                )}
                {c.facebook && (
                  <a
                    href={c.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-2xl"
                  >
                    <FaFacebookF />
                  </a>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* 🔍 Modal de vista de contacto */}
      {mostrarDetalle && contactoDetalle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-center">👁️ Detalle del contacto</h3>

            <div className="flex flex-col items-center mb-4">
              {contactoDetalle.foto_url ? (
                <img
                  src={`http://localhost:3000${contactoDetalle.foto_url}`}
                  alt="Foto grande"
                  className="w-40 h-40 rounded-full object-cover shadow-lg border-4 border-white dark:border-gray-700"
                />
              ) : (
                <div className="w-40 h-40 rounded-full bg-gray-400 flex items-center justify-center text-5xl text-white mb-2">
                  👤
                </div>
              )}
              <h4 className="text-2xl font-bold mt-2">{contactoDetalle.nombre}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                {obtenerNombreGrupo(contactoDetalle.grupo_id)}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm px-2">
              <p><strong>📱 Celular:</strong> {contactoDetalle.celular}</p>
              <p><strong>☎️ Teléfono fijo:</strong> {contactoDetalle.telefono_fijo || '—'}</p>
              <p>
                <strong>📧 Email:</strong>{' '}
                {contactoDetalle.email ? (
                  <a
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contactoDetalle.email)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800"
                  >
                    {contactoDetalle.email}
                  </a>
                ) : '—'}
              </p>
              <p><strong>🏢 Empresa:</strong> {contactoDetalle.empresa || '—'}</p>
              <p><strong>📍 Dirección:</strong> {contactoDetalle.direccion || '—'}</p>
              <p><strong>🎂 Fecha de nacimiento:</strong> {contactoDetalle.fecha_nacimiento || '—'}</p>
              <p>
                <strong>🔗 Facebook:</strong>{' '}
                {contactoDetalle.facebook ? (
                  <a
                    href={contactoDetalle.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800"
                  >
                    Ver perfil
                  </a>
                ) : '—'}
              </p>
              <p>
                <strong>💬 WhatsApp:</strong>{' '}
                {contactoDetalle.celular ? (
                  <a
                    href={`https://wa.me/591${contactoDetalle.celular.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 dark:text-green-400 underline hover:text-green-800"
                  >
                    Abrir chat
                  </a>
                ) : '—'}
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setMostrarDetalle(false);
                  setNuevoContacto({
                    ...contactoDetalle,
                    archivoFoto: null,
                    codigo_pais: '+591'
                  });
                  setModoEdicion(true);
                  setContactoEditandoId(contactoDetalle.id);
                  setMostrarModal(true);
                }}
                className="px-4 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
              >
                Editar
              </button>
              <button
                onClick={() => eliminarContacto(contactoDetalle.id)}
                className="px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Eliminar
              </button>
              <button
                onClick={() => setMostrarDetalle(false)}
                className="px-4 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ➕ Modal de nuevo contacto */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">➕ Nuevo contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* NOMBRE */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={nuevoContacto.nombre}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-2 py-1 rounded border text-sm focus:outline-none focus:ring-2
                    ${!nuevoContacto.nombre.trim()
                      ? 'border-red-500 focus:ring-red-400'
                      : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500'}
                    dark:bg-gray-800 dark:text-white`}
                />
              </div>

              {/* CELULAR + CÓDIGO */}
              <div className="">
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Celular <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    name="codigo_pais"
                    value={nuevoContacto.codigo_pais}
                    onChange={handleInputChange}
                    className="w-24 px-2 py-1 rounded border text-sm border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="+591">🇧🇴 +591</option>
                    <option value="+54">🇦🇷 +54</option>
                    <option value="+56">🇨🇱 +56</option>
                    <option value="+57">🇨🇴 +57</option>
                    <option value="+593">🇪🇨 +593</option>
                    <option value="+502">🇬🇹 +502</option>
                    <option value="+504">🇭🇳 +504</option>
                    <option value="+52">🇲🇽 +52</option>
                    <option value="+505">🇳🇮 +505</option>
                    <option value="+507">🇵🇦 +507</option>
                    <option value="+595">🇵🇾 +595</option>
                    <option value="+51">🇵🇪 +51</option>
                    <option value="+1">🇩🇴 +1</option>
                    <option value="+598">🇺🇾 +598</option>
                    <option value="+58">🇻🇪 +58</option>
                  </select>
                  <input
                    type="text"
                    name="celular"
                    value={nuevoContacto.celular}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-2 py-1 rounded border text-sm focus:outline-none focus:ring-2
                      ${!nuevoContacto.celular.trim()
                        ? 'border-red-500 focus:ring-red-400'
                        : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500'}
                      dark:bg-gray-800 dark:text-white`}
                  />
                </div>
              </div>

              {/* RESTO DE CAMPOS */}
              {[
                { label: 'Teléfono fijo', name: 'telefono_fijo' },
                { label: 'Dirección', name: 'direccion' },
                { label: 'Email', name: 'email' },
                { label: 'Facebook', name: 'facebook' },
                { label: 'Fecha de nacimiento', name: 'fecha_nacimiento', type: 'date' },
                { label: 'Empresa', name: 'empresa' }
              ].map(({ label, name, required = false, type = 'text' }) => (
                <div key={name}>
                  <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    {label}{required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={type}
                    name={name}
                    value={nuevoContacto[name]}
                    onChange={handleInputChange}
                    required={required}
                    className={`w-full px-2 py-1 rounded border text-sm focus:outline-none focus:ring-2 ${
                      required && !nuevoContacto[name]?.trim()
                        ? 'border-red-500 focus:ring-red-400'
                        : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500 dark:bg-gray-800'
                    }`}
                  />
                </div>
              ))}

              {/* Grupo */}
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Grupo <span className="text-red-500">*</span>
                </label>
                <select
                  name="grupo_id"
                  value={nuevoContacto.grupo_id}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-2 py-1 rounded border text-sm focus:outline-none focus:ring-2
                    ${!nuevoContacto.grupo_id
                      ? 'border-red-500 focus:ring-red-400'
                      : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500'}
                    bg-white text-black dark:bg-gray-800 dark:text-white`}
                >
                  <option value="">-- Selecciona grupo --</option>
                  {grupos.map((g) => (
                    <option key={g.id} value={g.id}>{g.nombre}</option>
                  ))}
                </select>
              </div>


              {/* Foto */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Foto
                </label>
                <input
                  type="file"
                  name="archivoFoto"
                  accept="image/*"
                  onChange={handleInputChange}
                  className="w-full text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
            </div>

            <div className="text-right mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setMostrarModal(false);
                  setModoEdicion(false);
                  setContactoEditandoId(null);
                }}
                className="px-4 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={guardarContacto}
                disabled={
                  !nuevoContacto.nombre.trim() ||
                  !nuevoContacto.celular.trim() ||
                  !nuevoContacto.grupo_id
                }
                className="px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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

export default Contactos;