// /sw.js at SITE ROOT

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const title = data.title || 'Notification';
  const body  = data.body  || 'You have a new message';
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/logo192.png',    // or /icons/icon-192.png if you have them
    badge: '/logo192.png',
    data: { url: '/', ts: Date.now() },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((all) => {
      const existing = all.find(w => w.url.startsWith(self.location.origin));
      return existing ? existing.focus() : clients.openWindow(url);
    })
  );
});
