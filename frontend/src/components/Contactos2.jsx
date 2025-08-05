import React, { useEffect, useState } from 'react';
import { FaWhatsapp, FaFacebookF, FaEye } from 'react-icons/fa';

const Contactos = () => {
  const [contactos, setContactos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [contactoDetalle, setContactoDetalle] = useState(null);

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
      let urlFoto = '';

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

      await fetch('http://localhost:3000/api/contactos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactoAEnviar)
      });

      setMostrarModal(false);
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

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">📇 Contactos</h2>
        <button
          onClick={() => setMostrarModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          ➕ Nuevo contacto
        </button>
      </div>
      {/* Tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {contactos.map((c) => (
          <div key={c.id} className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                {c.foto_url ? (
                  <img src={`http://localhost:3000${c.foto_url}`} alt="Foto" className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-xl text-white">👤</div>
                )}
                <button
                  onClick={() => {
                    setContactoDetalle(c);
                    setMostrarDetalle(true);
                  }}
                  className="mt-2 text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
                  title="Ver detalles"
                >
                  <FaEye className="text-xl" />
                </button>
              </div>

              <div className="text-sm text-gray-800 dark:text-gray-100">
                <h3 className="font-semibold text-base">{c.nombre}</h3>
                <p>📱 {c.celular}</p>
                {c.telefono_fijo && <p>☎️ {c.telefono_fijo}</p>}
                {c.email && <p>📧 {c.email}</p>}
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 pl-2 mt-1">
              {c.celular && (
                <a
                  href={`https://wa.me/591${c.celular.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-500 hover:text-green-600 text-3xl"
                >
                  <FaWhatsapp />
                </a>
              )}
              {c.facebook && (
                <a
                  href={c.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-3xl"
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
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">👁️ Detalle del contacto</h3>
            <div className="flex flex-col items-center mb-4">
              {contactoDetalle.foto_url ? (
                <img
                  src={`http://localhost:3000${contactoDetalle.foto_url}`}
                  alt="Foto grande"
                  className="w-48 h-48 rounded-full object-cover mb-2"
                />
              ) : (
                <div className="w-48 h-48 rounded-full bg-gray-400 flex items-center justify-center text-4xl text-white mb-2">👤</div>
              )}
              <h4 className="text-lg font-bold">{contactoDetalle.nombre}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 italic">{obtenerNombreGrupo(contactoDetalle.grupo_id)}</p>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <p><strong>📱 Celular:</strong> {contactoDetalle.celular}</p>
              <p><strong>☎️ Teléfono fijo:</strong> {contactoDetalle.telefono_fijo || '—'}</p>
              <p><strong>📧 Email:</strong> {contactoDetalle.email || '—'}</p>
              <p><strong>🏢 Empresa:</strong> {contactoDetalle.empresa || '—'}</p>
              <p><strong>📍 Dirección:</strong> {contactoDetalle.direccion || '—'}</p>
              <p><strong>🎂 Fecha de nacimiento:</strong> {contactoDetalle.fecha_nacimiento || '—'}</p>
              <p><strong>🔗 Facebook:</strong> {contactoDetalle.facebook ? <a href={contactoDetalle.facebook} target="_blank" className="text-blue-500 underline">Ver perfil</a> : '—'}</p>
              <p><strong>💬 WhatsApp:</strong> {contactoDetalle.celular ? <a href={`https://wa.me/591${contactoDetalle.celular}`} target="_blank" className="text-green-500 underline">Abrir chat</a> : '—'}</p>
            </div>
            <div className="text-right mt-4">
              <button
                onClick={() => setMostrarDetalle(false)}
                className="px-4 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
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
              <div className="md:col-span-2">
                <label>Nombre *</label>
                <input
                  type="text"
                  name="nombre"
                  value={nuevoContacto.nombre}
                  onChange={handleInputChange}
                  required
                  className={`w-full border px-3 py-1 rounded ${!nuevoContacto.nombre && 'border-red-500'}`}
                />
              </div>

              <div>
                <label>Código país</label>
                <select
                  name="codigo_pais"
                  value={nuevoContacto.codigo_pais}
                  onChange={handleInputChange}
                  className="w-full px-2 py-1 rounded border text-sm focus:outline-none focus:ring-2 border-gray-300 dark:border-gray-700 bg-white text-black dark:bg-gray-800 dark:text-white"
                >
                  <option value="+591">🇧🇴 Bolivia (+591)</option>
                  <option value="+54">🇦🇷 Argentina (+54)</option>
                  <option value="+51">🇵🇪 Perú (+51)</option>
                  <option value="+56">🇨🇱 Chile (+56)</option>
                  <option value="+34">🇪🇸 España (+34)</option>
                </select>
              </div>

              <div>
                <label>Celular *</label>
                <input
                  type="text"
                  name="celular"
                  value={nuevoContacto.celular}
                  onChange={handleInputChange}
                  required
                  className={`w-full border px-3 py-1 rounded ${!nuevoContacto.celular && 'border-red-500'}`}
                />
              </div>

              <div>
                <label>Teléfono fijo</label>
                <input
                  type="text"
                  name="telefono_fijo"
                  value={nuevoContacto.telefono_fijo}
                  onChange={handleInputChange}
                  className="w-full border px-3 py-1 rounded"
                />
              </div>

              <div>
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={nuevoContacto.email}
                  onChange={handleInputChange}
                  className="w-full border px-3 py-1 rounded"
                />
              </div>

              <div>
                <label>Dirección</label>
                <input
                  type="text"
                  name="direccion"
                  value={nuevoContacto.direccion}
                  onChange={handleInputChange}
                  className="w-full border px-3 py-1 rounded"
                />
              </div>

              <div>
                <label>Empresa</label>
                <input
                  type="text"
                  name="empresa"
                  value={nuevoContacto.empresa}
                  onChange={handleInputChange}
                  className="w-full border px-3 py-1 rounded"
                />
              </div>

              <div>
                <label>Facebook</label>
                <input
                  type="text"
                  name="facebook"
                  value={nuevoContacto.facebook}
                  onChange={handleInputChange}
                  className="w-full border px-3 py-1 rounded"
                />
              </div>

              <div>
                <label>Fecha de nacimiento</label>
                <input
                  type="date"
                  name="fecha_nacimiento"
                  value={nuevoContacto.fecha_nacimiento}
                  onChange={handleInputChange}
                  className="w-full border px-3 py-1 rounded"
                />
              </div>

              <div>
                <label>Grupo</label>
                <select
                  name="grupo_id"
                  value={nuevoContacto.grupo_id}
                  onChange={handleInputChange}
                  className="w-full border px-3 py-1 rounded"
                >
                  <option value="">-- Seleccionar --</option>
                  {grupos.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label>Foto</label>
                <input
                  type="file"
                  name="archivoFoto"
                  accept="image/*"
                  onChange={handleInputChange}
                  className="w-full border px-3 py-1 rounded"
                />
              </div>
            </div>

            <div className="text-right mt-4">
              <button
                onClick={() => setMostrarModal(false)}
                className="px-4 py-1 mr-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={guardarContacto}
                className="px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contactos;

