import React, { useState, useEffect } from "react";

const PUBLIC_VAPID_KEY =
  "BMCht6yT0qJktTK-G1eFC56nKbrohESdcx3lpXtvsbU4qDABvciqIbFXG4F40r4fP6ilU94Q3L6qADyQH1Cdmj4";

// ✅ Set API base from environment variable (fallback to localhost)
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

function App() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [log, setLog] = useState("");

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(async (reg) => {
          const sub = await reg.pushManager.getSubscription();
          if (sub) setIsSubscribed(true);
        })
        .catch((err) => console.error("Service Worker Error:", err));
    }
  }, []);

  const subscribeUser = async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
      });

      const res = await fetch(`${API_BASE}/api/push/subscribe`, {
        method: "POST",
        body: JSON.stringify(subscription),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Subscribe failed: ${res.status} - ${text}`);
      }

      setLog("✅ Subscription sent to server");
      setIsSubscribed(true);
    } catch (err) {
      console.error(err);
      setLog("❌ Subscription failed");
    }
  };

  const sendNotification = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/push/notify`, {
        method: "POST",
        body: JSON.stringify({
          title: "Hello!",
          body: "This is a test push 🔔",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server responded with ${res.status}: ${text}`);
      }

      const result = await res.json();
      console.log(result);

      if (result.success) {
        setLog("📤 Push sent successfully!");
      } else {
        setLog("⚠️ Push failed on server side");
      }
    } catch (err) {
      console.error("❌ Push Error:", err.message || err);
      setLog("❌ Push send failed");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2>🔔 PWA Push Notification Demo</h2>

      <button onClick={subscribeUser} disabled={isSubscribed}>
        {isSubscribed ? "✅ Subscribed" : "Subscribe to Push"}
      </button>

      <br />
      <br />

      <button onClick={sendNotification} disabled={!isSubscribed}>
        Send Test Notification
      </button>

      <p>{log}</p>
    </div>
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default App;
