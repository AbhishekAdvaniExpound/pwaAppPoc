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
    return res.status(400).json({ error: "❌ Invalid subscription object" });
  }

  console.log("✅ New Subscription received:");
  console.log("Endpoint:", subscription.endpoint);
  console.log("p256dh:", subscription.keys.p256dh);
  console.log("auth:", subscription.keys.auth);

  subscriptions.push(subscription);
  res.status(201).json({ message: "Subscribed successfully" });
};

module.exports = { subscribe, subscriptions };
