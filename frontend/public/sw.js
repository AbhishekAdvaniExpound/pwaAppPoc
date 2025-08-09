self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("push", (event) => {
  console.log("[SW] push received", event?.data ? "(with data)" : "(no data)");

  let data = {};
  try {
    data = event.data?.json?.() ?? {};
  } catch (e) {
    try {
      data = JSON.parse(event.data?.text?.() ?? "{}");
    } catch {}
  }

  const title = data.title || "Notification";
  const options = {
    body: data.body || "You have a new message",
    icon: "/logo192.png",
    badge: "/logo192.png",
    tag: "pwa-push",
    renotify: true,
    requireInteraction: true, // some platforms ignore this
    data: { url: "/", ts: Date.now() },
  };

  event.waitUntil(
    (async () => {
      try {
        await self.registration.showNotification(title, options);
        console.log("[SW] notification shown");
      } catch (err) {
        console.error("[SW] showNotification error", err);
      }
    })()
  );
});

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

self.addEventListener("notificationclose", (event) => {
  console.log("[SW] notification closed", event.notification?.tag);
});
