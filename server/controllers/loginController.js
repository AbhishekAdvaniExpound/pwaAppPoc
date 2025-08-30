// server/controllers/loginController.js
const axios = require("axios");
const { notifyAll } = require("../push/notifyHelper");

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const url = `https://192.168.3.32:44300/zinq/getlogin?sap-client=120&Username=${username}&Password=${password}`;

    const config = {
      method: "get",
      maxBodyLength: Infinity,
      url,
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
      },
      httpsAgent: new (require("https").Agent)({ rejectUnauthorized: false }),
    };

    const response = await axios.request(config);

    // ✅ Send push notification (async fire-and-forget, don’t block response)
    notifyAll({
      title: "Login Successful 🎉",
      body: `User ${username} logged in successfully.`,
    }).catch((err) => console.error("Push send error:", err));

    return res.status(200).json({
      success: true,
      message: response.data,
      data: response.data,
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};
