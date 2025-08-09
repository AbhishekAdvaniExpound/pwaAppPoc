const Subscription = require('../models/Subscription');

const store = require('./store'); // <-- shared store

const subscribe = (req, res) => {
  const subscription = req.body;

  if (
    !subscription ||
    !subscription.endpoint ||
    !subscription.keys?.p256dh ||
    !subscription.keys?.auth
  ) {
    console.error(`[❌ ${new Date().toISOString()}] Invalid subscription object`);
    return res.status(400).json({ error: "❌ Invalid subscription object" });
  }

  const alreadyExists = store.subscriptions.some(
    (sub) => sub.endpoint === subscription.endpoint
  );
  if (alreadyExists) {
    console.warn(`[⚠️ ${new Date().toISOString()}] Duplicate subscription ignored`);
    return res.status(200).json({ message: "Already subscribed" });
  }

  store.subscriptions.push(subscription);

  console.log(`✅ [${new Date().toISOString()}] New subscription saved: ${subscription.endpoint}`);
  console.log(`📦 Total subscriptions: ${store.subscriptions.length}`);

  res.status(201).json({ message: "Subscribed successfully" });
};

const getAllSubscriptions = (req, res) => {
  res.status(200).json({
    count: store.subscriptions.length,
    subscriptions: store.subscriptions,
  });
};

module.exports = { subscribe, getAllSubscriptions };
