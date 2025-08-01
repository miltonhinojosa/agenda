import React, { useEffect, useState } from 'react';
import { FaWhatsapp, FaFacebookF } from 'react-icons/fa';

const Contactos = () => {
  const [contactos, setContactos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
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
              {c.foto_url ? (
                <img src={`http://localhost:3000${c.foto_url}`} alt="Foto" className="w-14 h-14 rounded-full object-cover mt-1" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-xl text-white mt-1">👤</div>
              )}
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
                  title="WhatsApp"
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
                  title="Facebook"
                >
                  <FaFacebookF />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-4 rounded shadow-lg w-full max-w-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold mb-3">➕ Nuevo Contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              {/* Código de país + Celular */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Celular <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    name="codigo_pais"
                    value={nuevoContacto.codigo_pais}
                    onChange={handleInputChange}
                    className="w-24 px-2 py-1 rounded border text-sm border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <option value="+591">🇧🇴 +591</option>
                    <option value="+54">🇦🇷 +54</option>
                    <option value="+52">🇲🇽 +52</option>
                    <option value="+34">🇪🇸 +34</option>
                    <option value="+1">🇺🇸 +1</option>
                  </select>
                  <input
                    type="text"
                    name="celular"
                    value={nuevoContacto.celular}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-2 py-1 rounded border text-sm focus:outline-none focus:ring-2 ${
                      !nuevoContacto.celular.trim()
                        ? 'border-red-500 focus:ring-red-400'
                        : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500 dark:bg-gray-800'
                    }`}
                  />
                </div>
              </div>

              {/* Otros campos */}
              {[
                { label: 'Nombre', name: 'nombre', required: true },
                { label: 'Teléfono fijo', name: 'telefono_fijo' },
                { label: 'Dirección', name: 'direccion' },
                { label: 'Email', name: 'email' },
                { label: 'Facebook', name: 'facebook' },
                { label: 'Fecha de nacimiento', name: 'fecha_nacimiento', type: 'date' },
                { label: 'Empresa', name: 'empresa' }
              ].map(({ label, name, required = false, type = 'text' }) => {
                const vacio = required && !nuevoContacto[name].trim();
                return (
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
                        vacio
                          ? 'border-red-500 focus:ring-red-400'
                          : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500 dark:bg-gray-800'
                      }`}
                    />
                  </div>
                );
              })}

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
                  className={`w-full px-2 py-1 rounded border text-sm focus:outline-none focus:ring-2 ${
                    !nuevoContacto.grupo_id
                      ? 'border-red-500 focus:ring-red-400'
                      : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500 dark:bg-gray-800'
                  }`}
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

            {/* Botones */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setMostrarModal(false)}
                className="px-4 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={guardarContacto}
                className="px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                disabled={
                  !nuevoContacto.nombre.trim() ||
                  !nuevoContacto.celular.trim() ||
                  !nuevoContacto.grupo_id
                }
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
