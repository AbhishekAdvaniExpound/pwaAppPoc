// sw.js

// --- Lifecycle ---
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// --- Push Handler ---
self.addEventListener("push", (event) => {
  console.log("[SW] push received", event?.data ? "(with data)" : "(no data)");

  let data = {};
  try {
    data = event.data?.json?.() ?? {};
  } catch (e) {
    try {
      data = JSON.parse(event.data?.text?.() ?? "{}");
    } catch {
      data = {};
    }
  }

  const title = data.title || "Notification";
  const options = {
    body: data.body || "You have a new message",
    icon: "/logo192.png",
    badge: "/logo192.png",
    tag: "pwa-push",
    renotify: true,
    requireInteraction: true, // stays visible until dismissed (if supported)
    data: { url: "/", ts: Date.now() },
  };

  event.waitUntil(
    (async () => {
      try {
        // 1) Show native notification
        await self.registration.showNotification(title, options);
        console.log("[SW] notification shown");

        // 2) Broadcast to all open clients (React tabs/windows)
        const allClients = await clients.matchAll({
          includeUncontrolled: true,
        });
        allClients.forEach((client) => {
          client.postMessage({
            type: "PUSH_RECEIVED",
            payload: { title, body: options.body, ts: Date.now() },
          });
        });
      } catch (err) {
        console.error("[SW] showNotification error", err);
      }
    })()
  );
});

// --- Notification Click ---
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((wins) => {
        const existing = wins.find((w) =>
          w.url.startsWith(self.location.origin)
        );
        return existing ? existing.focus() : clients.openWindow(url);
      })
  );
});

// --- Notification Close ---
self.addEventListener("notificationclose", (event) => {
  console.log("[SW] notification closed", event.notification?.tag);
});
