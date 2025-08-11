// sw.js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Opcional: al hacer click en la notificación, enfocar/abrir tu app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Intenta enfocar una ventana abierta del mismo origen
    for (const client of allClients) {
      if ('focus' in client) {
        client.focus();
        return;
      }
    }
    // Si no hay, abre una nueva (ajusta la ruta si tu app usa subrutas)
    if (self.clients.openWindow) {
      await self.clients.openWindow('/');
    }
  })());
});
