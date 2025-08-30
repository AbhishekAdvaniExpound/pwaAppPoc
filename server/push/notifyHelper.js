// server/push/notifyHelper.js
const store = require("./store");
const webPush = require("../config/vapid");

function isStale(err) {
  const code = err?.statusCode || err?.status;
  return code === 404 || code === 410;
}

async function notifyAll({ title, body }) {
  const payload = JSON.stringify({ title, body });

  const subs = store.subscriptions || [];
  if (!subs.length) return { sent: 0, failed: 0, staleRemoved: 0 };

  const results = await Promise.allSettled(
    subs.map((sub) => webPush.sendNotification(sub, payload))
  );

  const fresh = [];
  let staleRemoved = 0;
  results.forEach((r, i) => {
    if (r.status === "rejected" && isStale(r.reason)) {
      staleRemoved++;
    } else {
      fresh.push(subs[i]);
    }
  });
  store.subscriptions = fresh;

  return {
    sent: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
    staleRemoved,
  };
}

module.exports = { notifyAll };
