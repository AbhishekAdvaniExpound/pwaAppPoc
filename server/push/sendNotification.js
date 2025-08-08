const { subscriptions } = require("./subscribe");
const webPush = require("../config/vapid");

const sendNotification = async (req, res) => {
  const { title, body } = req.body;

  const payload = JSON.stringify({
    title: title || "Hello!",
    body: body || "This is a push notification from server 🎉",
  });

  console.log("📨 Sending push notification with payload:", payload);
  console.log(`🔔 Subscriptions count: ${subscriptions.length}`);

  try {
    const results = await Promise.allSettled(
      subscriptions.map((sub, index) => {
        console.log(`➡️ Sending to subscriber ${index + 1}`);
        return webPush.sendNotification(sub, payload);
      })
    );

    console.log("✅ Push Results:", results);

    res.status(200).json({ success: true, results });
  } catch (error) {
    console.error("❌ Push Error:", error);
    res.status(500).json({ error: "Failed to send push notifications" });
  }
};

module.exports = { sendNotification };
