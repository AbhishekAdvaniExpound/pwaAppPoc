const subscriptions = [];

const subscribe = (req, res) => {
  const subscription = req.body;

  if (
    !subscription ||
    !subscription.endpoint ||
    !subscription.keys ||
    !subscription.keys.p256dh ||
    !subscription.keys.auth
  ) {
    console.error(`[❌ ${new Date().toISOString()}] Invalid subscription object`);
    return res.status(400).json({ error: "❌ Invalid subscription object" });
  }

  const alreadyExists = subscriptions.some(
    (sub) => sub.endpoint === subscription.endpoint
  );
  if (alreadyExists) {
    console.warn(`[⚠️ ${new Date().toISOString()}] Duplicate subscription ignored`);
    return res.status(200).json({ message: "Already subscribed" });
  }

  subscriptions.push(subscription);

  console.log(`✅ [${new Date().toISOString()}] New Subscription added:`);
  console.log(`📡 Endpoint: ${subscription.endpoint}`);
  console.log(`📦 Total subscriptions: ${subscriptions.length}`);

  res.status(201).json({ message: "Subscribed successfully" });
};

// ✅ New GET handler
const getAllSubscriptions = (req, res) => {
  res.status(200).json({
    count: subscriptions.length,
    subscriptions,
  });
};

module.exports = {
  subscribe,
  subscriptions,
  getAllSubscriptions,
};
