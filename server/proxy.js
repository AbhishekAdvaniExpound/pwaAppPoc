// proxy.js
const express = require("express");
const axios = require("axios");
const https = require("https");

const app = express();
const UPSTREAM = "https://192.168.3.32:44300";
const UPSTREAM_PATH = "/zinq/getinq";
const SAP_CLIENT = process.env.SAP_CLIENT || "120";
const SAP_USER = process.env.SAP_USER || "your_sap_user";
const SAP_PASS = process.env.SAP_PASS || "your_sap_pass";

const agent = new https.Agent({ rejectUnauthorized: false }); // dev-only

app.get("/api/inquiryRoutes/getInquiries", async (req, res) => {
  try {
    const url = `${UPSTREAM}${UPSTREAM_PATH}?sap-client=${SAP_CLIENT}`;
    const r = await axios.get(url, {
      httpsAgent: agent,
      auth: { username: SAP_USER, password: SAP_PASS },
      responseType: "arraybuffer",
      headers: { Host: "192.168.3.32" },
      timeout: 20000,
    });
    res.status(r.status).set(r.headers).send(r.data);
  } catch (err) {
    if (err.response)
      res.status(err.response.status).send(err.response.data || err.message);
    else res.status(502).send(`Upstream error: ${err.message}`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`proxy listening ${PORT}`));
