import { useEffect } from "react";

const PUBLIC_VAPID_KEY =
  "BMCht6yT0qJktTK-G1eFC56nKbrohESdcx3lpXtvsbU4qDABvciqIbFXG4F40r4fP6ilU94Q3L6qADyQH1Cdmj4";

export default function PushSubscriber() {
  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(async (swReg) => {
          const subscription = await swReg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
          });

          console.log(" Push Subscription:", subscription);

          await fetch("http://localhost:5000/api/push/subscribe", {
            method: "POST",
            body: JSON.stringify(subscription),
            headers: {
              "Content-Type": "application/json",
            },
          });
        })
        .catch((err) => console.error(" Push error:", err));
    }
  }, []);

  return null;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
