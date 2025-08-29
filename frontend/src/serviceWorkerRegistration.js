// Based on CRA (Create React App) defaults

const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
    // [::1] is IPv6 localhost.
    window.location.hostname === "[::1]" ||
    // 127.0.0.0/8 is considered localhost for IPv4.
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4]\d|1?\d{1,2})){3}$/
    )
);

export function register(config) {
  if ("serviceWorker" in navigator) {
    const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

    if (isLocalhost) {
      // Localhost — check if service worker exists
      checkValidServiceWorker(swUrl, config);
      navigator.serviceWorker.ready.then(() => {
        console.log(" PWA is being served from cache by a service worker.");
      });
    } else {
      // Register service worker in production
      registerValidSW(swUrl, config);
    }
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log("🎉 Service worker registered:", registration);

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          if (installingWorker.state === "installed") {
            if (navigator.serviceWorker.controller) {
              console.log(
                "🔁 New content available; will be used after reload."
              );
              if (config && config.onUpdate) config.onUpdate(registration);
            } else {
              console.log("📦 Content cached for offline use.");
              if (config && config.onSuccess) config.onSuccess(registration);
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error(" Error during service worker registration:", error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl)
    .then((response) => {
      if (
        response.status === 404 ||
        response.headers.get("content-type")?.indexOf("javascript") === -1
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => window.location.reload());
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log("⚠️ No internet connection. App is running in offline mode.");
    });
}

export function unregister() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}
