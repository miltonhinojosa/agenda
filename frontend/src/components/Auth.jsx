// frontend/src/components/Auth.jsx
import React, { useEffect, useState } from "react";

const API = "http://localhost:3000/api";

export default function Auth({ onAuth }) {
  const [canRegister, setCanRegister] = useState(false);
  const [tab, setTab] = useState("login"); // "login" | "register"
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Register
  const [ruser, setRuser] = useState("");
  const [rpass, setRpass] = useState("");
  const [rshow, setRshow] = useState(false);
  const [rname, setRname] = useState("");
  const [remail, setRemail] = useState("");

  // Foto del usuario
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoUrl, setFotoUrl] = useState("");       // URL final (en servidor)
  const [fotoPreview, setFotoPreview] = useState(""); // preview local

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/auth/availability`, {
          credentials: "include",
          cache: "no-store",
        });
        const j = await r.json();
        setCanRegister(!!j.canRegister);
        if (j.canRegister) setTab("register");
      } catch {
        setCanRegister(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (e) => {
    e.preventDefault();
    setErr("");
    const r = await fetch(`${API}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr(j.mensaje || "No se pudo iniciar sesión");
      return;
    }
    onAuth && onAuth();
  };

  const subirFoto = async () => {
    if (!fotoFile) return;
    const fd = new FormData();
    fd.append("foto", fotoFile);
    const up = await fetch(`${API}/upload`, {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    const data = await up.json().catch(() => ({}));
    if (data?.url) {
      setFotoUrl(data.url);
    } else {
      setErr("No se pudo subir la foto");
    }
  };

  const register = async (e) => {
    e.preventDefault();
    setErr("");

    if (fotoFile && !fotoUrl) {
      await subirFoto();
    }

    const payload = {
      username: ruser,
      password: rpass,
      nombre: rname,
      email: remail,
      foto_url: fotoUrl || "",
    };

    const r = await fetch(`${API}/auth/register`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(j.mensaje || "No se pudo registrar");
      return;
    }
    onAuth && onAuth(); // autologin
  };

  const onPickFoto = (file) => {
    setFotoFile(file || null);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setFotoPreview(String(e.target.result));
      reader.readAsDataURL(file);
    } else {
      setFotoPreview("");
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card principal (glass) */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-3 text-center">
            <h1 className="text-2xl font-bold text-white drop-shadow">Agenda Virtual</h1>
            <p className="text-white/80 text-sm mt-1">
              {canRegister ? "Crea tu cuenta (única) o inicia sesión" : "Inicia sesión para continuar"}
            </p>
          </div>

          {/* Tabs */}
          <div className="px-6">
            <div className="flex items-center justify-center gap-2 bg-white/10 rounded-xl p-1">
              <button
                onClick={() => setTab("login")}
                className={`flex-1 py-2 rounded-lg text-sm transition ${
                  tab === "login" ? "bg-white text-blue-700 shadow" : "text-white/90 hover:text-white"
                }`}
              >
                Iniciar sesión
              </button>
              <button
                disabled={!canRegister}
                onClick={() => canRegister && setTab("register")}
                className={`flex-1 py-2 rounded-lg text-sm transition ${
                  tab === "register" && canRegister
                    ? "bg-white text-blue-700 shadow"
                    : canRegister
                    ? "text-white/90 hover:text-white"
                    : "text-white/40 cursor-not-allowed"
                }`}
              >
                Crear cuenta
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {err && (
              <div className="mb-3 text-sm text-red-200 bg-red-500/20 border border-red-300/40 px-3 py-2 rounded-lg">
                {err}
              </div>
            )}

            {/* ==== LOGIN ==== */}
            {tab === "login" && (
              <form onSubmit={login} className="space-y-3">
                <div>
                  <label className="block text-xs text-white/90 mb-1">Usuario</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/90 text-gray-900 border border-white/60 focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/90 mb-1">Contraseña</label>
                  <div className="flex items-center gap-2">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/90 text-gray-900 border border-white/60 focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="text-white/90 text-sm px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20"
                    >
                      {showPass ? "Ocultar" : "Ver"}
                    </button>
                  </div>
                </div>
                <button className="w-full py-2 rounded-xl bg-white text-blue-700 font-semibold hover:bg-sky-50 active:bg-sky-100 shadow">
                  Entrar
                </button>
              </form>
            )}

            {/* ==== REGISTRO (único) ==== */}
            {tab === "register" && canRegister && (
              <form onSubmit={register} className="space-y-3">
                {/* Foto + Nombre */}
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    <div className="w-16 h-16 rounded-full bg-white/20 border border-white/40 overflow-hidden flex items-center justify-center">
                      {fotoPreview ? (
                        <img src={fotoPreview} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white/80 text-2xl">👤</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-white/90 mb-1">Nombre</label>
                    <input
                      value={rname}
                      onChange={(e) => setRname(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/90 text-gray-900 border border-white/60 focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                  </div>
                </div>

                {/* Subir foto */}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onPickFoto(e.target.files?.[0] || null)}
                    className="text-white/90 text-xs"
                  />
                  <button
                    type="button"
                    onClick={subirFoto}
                    disabled={!fotoFile}
                    className="px-3 py-1.5 rounded-lg text-xs bg-white text-blue-700 font-semibold hover:bg-sky-50 active:bg-sky-100 shadow disabled:opacity-50"
                  >
                    Subir foto
                  </button>
                  {fotoUrl && <span className="text-white/80 text-xs">Foto guardada ✔</span>}
                </div>

                {/* Usuario / Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/90 mb-1">Usuario</label>
                    <input
                      value={ruser}
                      onChange={(e) => setRuser(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/90 text-gray-900 border border-white/60 focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/90 mb-1">Email</label>
                    <input
                      type="email"
                      value={remail}
                      onChange={(e) => setRemail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/90 text-gray-900 border border-white/60 focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                  </div>
                </div>

                {/* Contraseña */}
                <div>
                  <label className="block text-xs text-white/90 mb-1">Contraseña</label>
                  <div className="flex items-center gap-2">
                    <input
                      type={rshow ? "text" : "password"}
                      value={rpass}
                      onChange={(e) => setRpass(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/90 text-gray-900 border border-white/60 focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                    <button
                      type="button"
                      onClick={() => setRshow((v) => !v)}
                      className="text-white/90 text-sm px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20"
                    >
                      {rshow ? "Ocultar" : "Ver"}
                    </button>
                  </div>
                </div>

                <button className="w-full py-2 rounded-xl bg-white text-blue-700 font-semibold hover:bg-sky-50 active:bg-sky-100 shadow">
                  Crear cuenta
                </button>

                <p className="text-[11px] text-white/80 text-center">
                  El registro solo está disponible la primera vez. Luego queda desactivado.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-white/80 text-xs mt-3">
          © {new Date().getFullYear()} Todos los derechos reservados Milton Hinojosa. 
        </div>
      </div>
    </div>
  );
}
