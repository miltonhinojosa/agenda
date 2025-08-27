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

  // ===== Tema claro/oscuro (auto + toggle) =====
  const [isDark, setIsDark] = useState(() => {
    const root = document.documentElement;
    if (root.classList.contains("dark")) return true;
    return window.matchMedia?.matches?.("(prefers-color-scheme: dark)") ?? false;
  });
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [isDark]);

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
    <div
      className="
        min-h-screen w-full
        bg-gradient-to-br from-slate-100 via-sky-100 to-emerald-100
        dark:from-slate-950 dark:via-slate-900 dark:to-slate-950
        flex items-center justify-center p-4
      "
    >
      <div className="w-full max-w-md">
        {/* Card principal (glass) */}
        <div
          className="
            backdrop-blur-xl
            bg-white/90 dark:bg-gray-900/90
            border border-black/10 dark:border-white/10
            rounded-3xl shadow-2xl overflow-hidden
          "
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-3">
            <div className="flex items-start justify-between">
              <div className="text-center w-full">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white drop-shadow">
                  Agenda Virtual
                </h1>
                <p className="text-gray-700/70 dark:text-gray-300/80 text-sm mt-1">
                  {canRegister
                    ? "Crea tu cuenta (única) o inicia sesión"
                    : "Inicia sesión para continuar"}
                </p>
              </div>

              {/* Toggle tema (discreto, esquina) */}
              <button
                onClick={() => setIsDark((v) => !v)}
                className="
                  ml-2 -mt-2 shrink-0 px-2 py-1.5 rounded-lg text-sm
                  bg-white/70 dark:bg-gray-800/70
                  border border-black/10 dark:border-white/10
                  text-gray-800 dark:text-gray-100
                  hover:bg-white/90 dark:hover:bg-gray-800/90
                "
                title={isDark ? "Cambiar a claro" : "Cambiar a oscuro"}
              >
                {isDark ? "🌙" : "🌞"}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6">
            <div className="flex items-center justify-center gap-2 bg-gray-900/5 dark:bg-white/5 rounded-xl p-1">
              <button
                onClick={() => setTab("login")}
                className={`flex-1 py-2 rounded-lg text-sm transition ${
                  tab === "login"
                    ? "bg-white text-blue-700 shadow dark:bg-gray-800 dark:text-blue-300"
                    : "text-gray-900/80 hover:text-gray-900 dark:text-white/90 dark:hover:text-white"
                }`}
              >
                Iniciar sesión
              </button>
              <button
                disabled={!canRegister}
                onClick={() => canRegister && setTab("register")}
                className={`flex-1 py-2 rounded-lg text-sm transition ${
                  tab === "register" && canRegister
                    ? "bg-white text-blue-700 shadow dark:bg-gray-800 dark:text-blue-300"
                    : canRegister
                    ? "text-gray-900/80 hover:text-gray-900 dark:text-white/90 dark:hover:text-white"
                    : "text-gray-400 cursor-not-allowed dark:text-gray-500"
                }`}
              >
                Crear cuenta
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {err && (
              <div className="mb-3 text-sm text-red-800 dark:text-red-200 bg-red-100/90 dark:bg-red-900/40 border border-red-300/70 dark:border-red-800/40 px-3 py-2 rounded-lg">
                {err}
              </div>
            )}

            {/* ==== LOGIN ==== */}
            {tab === "login" && (
              <form onSubmit={login} className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-800 dark:text-gray-300 mb-1">
                    Usuario
                  </label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="
                      w-full px-3 py-2 rounded-xl
                      bg-white dark:bg-gray-800
                      text-gray-900 dark:text-white
                      border border-gray-300 dark:border-gray-700
                      focus:outline-none focus:ring-2 focus:ring-sky-300
                    "
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-800 dark:text-gray-300 mb-1">
                    Contraseña
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="
                        w-full px-3 py-2 rounded-xl
                        bg-white dark:bg-gray-800
                        text-gray-900 dark:text-white
                        border border-gray-300 dark:border-gray-700
                        focus:outline-none focus:ring-2 focus:ring-sky-300
                      "
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="
                        text-gray-800 dark:text-gray-100 text-sm px-2 py-1 rounded-lg
                        bg-gray-900/5 dark:bg-white/10 hover:bg-gray-900/10 dark:hover:bg-white/20
                      "
                    >
                      {showPass ? "Ocultar" : "Ver"}
                    </button>
                  </div>
                </div>
                <button
                  className="
                    w-full py-2 rounded-xl font-semibold shadow
                    bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800
                  "
                >
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
                    <div className="
                      w-16 h-16 rounded-full overflow-hidden flex items-center justify-center
                      bg-gray-900/5 dark:bg-white/10
                      border border-gray-300/60 dark:border-white/20
                    ">
                      {fotoPreview ? (
                        <img src={fotoPreview} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl text-gray-700 dark:text-gray-200">👤</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-800 dark:text-gray-300 mb-1">Nombre</label>
                    <input
                      value={rname}
                      onChange={(e) => setRname(e.target.value)}
                      className="
                        w-full px-3 py-2 rounded-xl
                        bg-white dark:bg-gray-800
                        text-gray-900 dark:text-white
                        border border-gray-300 dark:border-gray-700
                        focus:outline-none focus:ring-2 focus:ring-sky-300
                      "
                    />
                  </div>
                </div>

                {/* Subir foto */}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onPickFoto(e.target.files?.[0] || null)}
                    className="text-xs text-gray-800 dark:text-gray-200"
                  />
                  <button
                    type="button"
                    onClick={subirFoto}
                    disabled={!fotoFile}
                    className="
                      px-3 py-1.5 rounded-lg text-xs font-semibold shadow
                      bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800
                      disabled:opacity-50
                    "
                  >
                    Subir foto
                  </button>
                  {fotoUrl && <span className="text-xs text-gray-700 dark:text-gray-300">Foto guardada ✔</span>}
                </div>

                {/* Usuario / Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-800 dark:text-gray-300 mb-1">Usuario</label>
                    <input
                      value={ruser}
                      onChange={(e) => setRuser(e.target.value)}
                      className="
                        w-full px-3 py-2 rounded-xl
                        bg-white dark:bg-gray-800
                        text-gray-900 dark:text-white
                        border border-gray-300 dark:border-gray-700
                        focus:outline-none focus:ring-2 focus:ring-sky-300
                      "
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-800 dark:text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={remail}
                      onChange={(e) => setRemail(e.target.value)}
                      className="
                        w-full px-3 py-2 rounded-xl
                        bg-white dark:bg-gray-800
                        text-gray-900 dark:text-white
                        border border-gray-300 dark:border-gray-700
                        focus:outline-none focus:ring-2 focus:ring-sky-300
                      "
                    />
                  </div>
                </div>

                {/* Contraseña */}
                <div>
                  <label className="block text-xs text-gray-800 dark:text-gray-300 mb-1">Contraseña</label>
                  <div className="flex items-center gap-2">
                    <input
                      type={rshow ? "text" : "password"}
                      value={rpass}
                      onChange={(e) => setRpass(e.target.value)}
                      className="
                        w-full px-3 py-2 rounded-xl
                        bg-white dark:bg-gray-800
                        text-gray-900 dark:text-white
                        border border-gray-300 dark:border-gray-700
                        focus:outline-none focus:ring-2 focus:ring-sky-300
                      "
                    />
                    <button
                      type="button"
                      onClick={() => setRshow((v) => !v)}
                      className="
                        text-gray-800 dark:text-gray-100 text-sm px-2 py-1 rounded-lg
                        bg-gray-900/5 dark:bg-white/10 hover:bg-gray-900/10 dark:hover:bg-white/20
                      "
                    >
                      {rshow ? "Ocultar" : "Ver"}
                    </button>
                  </div>
                </div>

                <button
                  className="
                    w-full py-2 rounded-xl font-semibold shadow
                    bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800
                  "
                >
                  Crear cuenta
                </button>

                <p className="text-[11px] text-center text-gray-700/80 dark:text-gray-300/80">
                  El registro solo está disponible la primera vez. Luego queda desactivado.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-700/80 dark:text-gray-300/80 text-xs mt-3">
          © {new Date().getFullYear()} Todos los derechos reservados Milton Hinojosa.
        </div>
      </div>
    </div>
  );
}
