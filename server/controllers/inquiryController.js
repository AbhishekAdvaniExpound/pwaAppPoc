// server/controllers/inquiryController.js

const { default: axios } = require("axios");
const { BaseUrlBackend } = require("./baseUrls");
const https = require("https");

// Mock inquiries array
const inquiries = Array.from({ length: 42 }, (_, i) => ({
  id: `Inq-${i + 1}`,
  qty: 10 + i, // just to vary a bit
  customer: `Customer Name with longer text that may overflow (${i + 1})`,
  broker: i % 2 === 0 ? `Broker Name with longer text too (${i + 1})` : null,
  sales: `Sales Person (${i + 1})`,
  status: i % 3 === 0 ? "High Priority" : i % 3 === 1 ? "Pending" : "Normal",

  items: [
    {
      id: 1,
      name: `Item A${i + 1}`,
      qty: 20 + i,
      rate: 100 + i,
      grade: (i % 5) + 1,
      winding: 10 + (i % 3) * 5,
      pq: i % 2 === 0 ? "Yes" : "No",
      clq: i % 2 === 1 ? "Yes" : "No",
      lastRate: 95 + i,
    },
    {
      id: 2,
      name: `Item B${i + 1}`,
      qty: 15 + i,
      rate: 120 + i,
      grade: (i % 5) + 1,
      winding: 15 + (i % 3) * 5,
      pq: i % 2 === 0 ? "Yes" : "No",
      clq: i % 2 === 1 ? "Yes" : "No",
      lastRate: 110 + i,
    },
  ],
}));

exports.getInquiries = async (req, res) => {
  try {
    const response = await axios.get(
      `${BaseUrlBackend}/zinq/getinq?sap-client=120`,
      {
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        auth: {
          username: process.env.SAP_USERNAME, // store in .env
          password: process.env.SAP_PASSWORD, // store in .env
        },
      }
    );

    const inquiries = response.data;
    console.log({ inquiries });

    res.status(200).json({
      success: true,
      total: Array.isArray(inquiries) ? inquiries.length : 1,
      data: inquiries,
    });
  } catch (error) {
    console.error("Error fetching inquiries:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch inquiries",
      error: error.message,
    });
  }
};

/**
 * GET /api/inquiries/:inqno
 * Query params: sapClient (optional) - falls back to process.env.SAP_CLIENT
 */
exports.getInquiryDetail = async (req, res) => {
  try {
    const inqno = (req.params.inqno || req.query.inqno || "").toString().trim();
    if (!inqno) {
      return res
        .status(400)
        .json({ error: "Missing inquiry number (inqno) param" });
    }

    const sapClient = req.query.sapClient || process.env.SAP_CLIENT || "120";
    const sapHost = (
      process.env.SAP_BASE_URL || "https://192.168.3.32:44300"
    ).replace(/\/+$/, "");
    const path = `/zinq/getinqdetail`;
    const url = `${sapHost}${path}?sap-client=${encodeURIComponent(
      sapClient
    )}&inqno=${encodeURIComponent(inqno)}`;

    // Build headers first (prefer explicit Basic header to match working sample)
    const headers = {
      Accept: "application/json",
    };

    // If you have a precomputed Basic token in env: use it (matches your working snippet)
    if (process.env.SAP_AUTH_BASIC) {
      headers.Authorization = `Basic ${process.env.SAP_AUTH_BASIC}`; // value should be BASE64(username:password)
    }

    // optionally include cookie if needed (your working snippet had SAP_SESSIONID_DS4_120 and sap-usercontext)
    if (process.env.SAP_COOKIE) {
      headers.Cookie = process.env.SAP_COOKIE;
    }

    // Top-level axios options
    const axiosOptions = {
      headers,
      timeout: Number(process.env.SAP_REQUEST_TIMEOUT_MS || 15000),
      // If you want axios to not throw on non-2xx and handle response manually:
      // validateStatus: () => true
    };

    // If Basic token not provided, but username/password are set, use axios 'auth' (top-level)
    if (
      !process.env.SAP_AUTH_BASIC &&
      process.env.SAP_USERNAME &&
      process.env.SAP_PASSWORD
    ) {
      axiosOptions.auth = {
        username: process.env.SAP_USERNAME,
        password: process.env.SAP_PASSWORD,
      };
      // Note: axios will set an Authorization header for you automatically when auth is supplied
    }

    // DEV: allow ignoring self-signed certs when SAP_IGNORE_SSL=true
    const ignoreSSL =
      String(process.env.SAP_IGNORE_SSL || "false").toLowerCase() === "true";
    if (ignoreSSL) {
      axiosOptions.httpsAgent = new https.Agent({ rejectUnauthorized: false });
    }

    console.log({
      url,
      axiosOptions: {
        headers: Object.keys(headers),
        timeout: axiosOptions.timeout,
        hasAuth: !!axiosOptions.auth,
        ignoreSSL,
      },
    });

    const resp = await axios.get(url, axiosOptions);

    if (resp.status >= 200 && resp.status < 300) {
      // normalize response data if needed
      const contentType = (resp.headers["content-type"] || "").toLowerCase();
      let data = resp.data;
      if (
        typeof data === "string" &&
        contentType.includes("application/json")
      ) {
        try {
          data = JSON.parse(data);
        } catch (e) {
          // keep as string
        }
      }
      return res.json({ status: "ok", source: url, data });
    }

    // non-2xx
    return res.status(resp.status).json({
      status: "error",
      source: url,
      statusCode: resp.status,
      message: resp.data || resp.statusText || "SAP returned non-OK status",
    });
  } catch (err) {
    console.error(
      "getInquiryDetail error:",
      err?.response?.status,
      err?.message || err
    );
    // If running with ignoreSSL=false you might see 'self-signed certificate' here
    return res
      .status(500)
      .json({ error: "Internal server error", details: err?.message });
  }
};
