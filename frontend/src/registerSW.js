// src/registerSW.js
export async function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    // Asegura que el SW quede activo para poder mostrar notificaciones
    await navigator.serviceWorker.ready;
    return reg;
  } catch (e) {
    console.error("SW registration failed:", e);
    return null;
  }
}
