// server/push/sendNotification.js
const store = require("./store");
const webPush = require("../config/vapid");

function isStale(err) {
  const code = err?.statusCode || err?.status;
  // 404/410 => gone; 400 sometimes appears for malformed/rotated keys
  return code === 404 || code === 410;
}

const sendNotification = async (req, res) => {
  const { title, body } = req.body || {};
  const payload = JSON.stringify({
    title: title || "Hello!",
    body: body || "This is a test push 🔔",
  });

  const subs = store.subscriptions || [];
  if (!subs.length)
    return res.json({ success: true, results: [], staleRemoved: 0 });

  const results = await Promise.allSettled(
    subs.map((sub) => webPush.sendNotification(sub, payload))
  );

  // prune stale
  const fresh = [];
  let staleRemoved = 0;
  results.forEach((r, i) => {
    if (r.status === "rejected" && isStale(r.reason)) {
      staleRemoved++;
      // skip adding back
    } else {
      fresh.push(subs[i]);
    }
  });
  store.subscriptions = fresh;
  console.log("Server endpoints (last 20 chars):");
  subs.forEach((s, i) => {
    console.log(`[${i + 1}/${subs.length}] ...${s.endpoint.slice(-20)}`);
  });

  res.json({
    success: true,
    sent: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
    staleRemoved,
    results,
  });
};

module.exports = { sendNotification };
