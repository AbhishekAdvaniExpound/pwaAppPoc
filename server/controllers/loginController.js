// server/controllers/loginController.js
const axios = require("axios");
const { notifyAll } = require("../push/notifyHelper");
const { BaseUrlBackend } = require("./baseUrls");

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const url = `${BaseUrlBackend}/zinq/getlogin?sap-client=120&Username=${username}&Password=${password}`;

    const config = {
      method: "get",
      maxBodyLength: Infinity,
      url,
      timeout: 15000, // optional: fail fast if backend doesn't respond
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
      },
      httpsAgent: new (require("https").Agent)({ rejectUnauthorized: false }),
    };

    const response = await axios.request(config);

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
    console.error("Login Error:", error && (error.stack || error.message));

    const isTimeout =
      error?.code === "ETIMEDOUT" ||
      /connect ETIMEDOUT/i.test(error?.message || "") ||
      error?.message?.includes("timeout");

    if (isTimeout) {
      // Tell the client explicitly that it's a VPN / network timeout
      return res.status(504).json({
        success: false,
        message: "VPN not connected!",
        error: error.message,
      });
    }

    // other errors
    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};
