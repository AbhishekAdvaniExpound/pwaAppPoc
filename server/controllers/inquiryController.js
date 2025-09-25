// server/controllers/inquiryController.js

const { default: axios } = require("axios");
const { BaseUrlBackend } = require("./baseUrls");
const https = require("https");
const { notifyAll } = require("../push/notifyHelper");

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

// getInquiries.hardened.js

// Tunables (via env)
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || "3", 10);
const PER_TRY_TIMEOUT_MS = parseInt(
  process.env.PER_TRY_TIMEOUT_MS || "150000",
  10
);
const OVERALL_TIMEOUT_MS = parseInt(
  process.env.OVERALL_TIMEOUT_MS || "150000",
  10
);
const BACKOFF_BASE_MS = parseInt(process.env.BACKOFF_BASE_MS || "300", 10);
const BACKOFF_MULT = parseFloat(process.env.BACKOFF_MULT || "2");
const CACHE_TTL_MS = parseInt(
  process.env.CACHE_TTL_MS || `${5 * 60 * 1000}`,
  10
); // 5 minutes
const VERIFY_SSL = (process.env.VERIFY_SSL || "false").toLowerCase() === "true";

// Module-level cache to return stale data on upstream failure
let lastInquiriesCache = { ts: 0, data: null };

// Shared keepAlive agent
const sharedHttpsAgent = new https.Agent({
  keepAlive: true,
  rejectUnauthorized: VERIFY_SSL, // default false for dev; set true in prod
});

// Utility: sleep with jitter
const sleep = (ms) =>
  new Promise((r) =>
    setTimeout(r, ms + Math.floor(Math.random() * Math.min(200, ms)))
  );

// Decide if error is retryable
function isRetryable(err) {
  if (!err) return false;
  if (err.code) {
    const codes = [
      "ECONNRESET",
      "ETIMEDOUT",
      "EAI_AGAIN",
      "ENOTFOUND",
      "ECONNREFUSED",
      "ECONNABORTED",
    ];
    if (codes.includes(err.code)) return true;
  }
  if (!err.response) return true; // network / TLS issues
  const status = err.response.status;
  if (status >= 500 || status === 429) return true;
  return false;
}

// Perform request with retries, per-try timeout and overall timeout.
async function axiosGetWithRetries(url, axiosOptions = {}) {
  const overallController = new AbortController();
  const overallTimer = setTimeout(
    () => overallController.abort(),
    OVERALL_TIMEOUT_MS
  );

  try {
    let attempt = 0;
    let backoff = BACKOFF_BASE_MS;

    while (attempt < MAX_RETRIES) {
      attempt += 1;

      // Per-try controller
      const tryController = new AbortController();
      // if overall aborts, abort this try
      overallController.signal.addEventListener(
        "abort",
        () => tryController.abort(),
        { once: true }
      );

      try {
        const resp = await axios.get(url, {
          httpsAgent: sharedHttpsAgent,
          timeout: PER_TRY_TIMEOUT_MS, // secondary guard
          signal: tryController.signal,
          ...axiosOptions,
        });
        clearTimeout(overallTimer);
        return resp;
      } catch (err) {
        // if overall aborted, convert to deterministic error
        if (overallController.signal.aborted) {
          const e = new Error("Overall timeout exceeded");
          e.code = "OVERALL_TIMEOUT";
          throw e;
        }

        // not retryable or last attempt -> rethrow
        if (!isRetryable(err) || attempt >= MAX_RETRIES) {
          throw err;
        }

        // wait backoff then retry
        await sleep(backoff);
        backoff = Math.floor(backoff * BACKOFF_MULT);
      }
    }

    throw new Error("Retries exhausted");
  } finally {
    clearTimeout(overallTimer);
  }
}

// Handler (drop-in replacement)
exports.getInquiries = async (req, res) => {
  try {
    // BaseUrlBackend should be set (no trailing port; ngrok host or SAP host)
    const base =
      typeof BaseUrlBackend !== "undefined"
        ? BaseUrlBackend
        : process.env.BASE_URL_BACKEND;

    console.log({ base });

    if (!base) {
      return res
        .status(500)
        .json({ success: false, message: "BaseUrlBackend not configured" });
    }

    const sapClient = process.env.SAP_CLIENT || "120";
    console.log({ sapClient });
    const url = `${base.replace(
      /\/$/,
      ""
    )}/zinq/getinq?sap-client=${encodeURIComponent(sapClient)}`;

    console.log({ url });

    const auth = {
      username: process.env.SAP_USERNAME || "",
      password: process.env.SAP_PASSWORD || "",
    };

    console.log({ auth });

    // explicit host header to help SNI/virtual-hosted services
    const parsedHost = (() => {
      try {
        return new URL(url).host.split(":")[0];
      } catch {
        return undefined;
      }
    })();

    console.log({ parsedHost });

    const resp = await axiosGetWithRetries(url, {
      auth,
      headers: {
        Host: parsedHost,
        Accept: "application/json, text/plain, */*",
      },
      responseType: "json",
    });

    console.log({ resp });

    const remoteInquiries = resp?.data ?? [];
    console.log({ remoteInquiries });
    const inquiriesLength = Array.isArray(remoteInquiries)
      ? remoteInquiries.length
      : 1;

    // update cache on success
    lastInquiriesCache = { ts: Date.now(), data: remoteInquiries };

    // fire-and-forget notify (non-blocking, errors logged)
    (async () => {
      try {
        const payload = {
          title: "Latest Inquiries successfully fetched.",
          body: `Latest ${inquiriesLength} Inquiries successfully fetched.`,
          meta: { source: "getInquiries", count: inquiriesLength },
        };
        console.log("getInquiries: notify payload:", payload);
        await notifyAll(payload);
        console.log("getInquiries: notifyAll completed");
      } catch (err) {
        console.error(
          "getInquiries: notifyAll error (non-fatal):",
          err && err.stack ? err.stack : err
        );
      }
    })();

    return res.status(200).json({
      success: true,
      total: Array.isArray(remoteInquiries) ? remoteInquiries.length : 1,
      data: remoteInquiries,
    });
  } catch (error) {
    console.error(
      "Error fetching inquiries:",
      error && error.stack ? error.stack : error
    );

    // serve cached data if fresh enough
    const age = Date.now() - (lastInquiriesCache.ts || 0);
    if (lastInquiriesCache.data && age <= CACHE_TTL_MS) {
      console.warn(
        "Serving cached inquiries due to upstream failure (age ms):",
        age
      );
      return res.status(200).json({
        success: true,
        total: Array.isArray(lastInquiriesCache.data)
          ? lastInquiriesCache.data.length
          : 1,
        data: lastInquiriesCache.data,
        warning: "served-from-cache",
      });
    }

    const code = error && error.code ? error.code : "UPSTREAM_ERROR";
    console.log({ code });
    return res.status(502).json({
      success: false,
      message: "Failed to fetch inquiries from upstream",
      error: error?.message || String(error),
      code,
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
    const sapHost = (process.env.SAP_BASE_URL || "").replace(/\/+$/, "");
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
      timeout: Number(process.env.SAP_REQUEST_TIMEOUT_MS || 5000),
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

/**
 * GET /api/negotiation?inqno=0010015633&inqitem=000010
 * or  GET /api/negotiation/:inqno/:inqitem
 */
exports.getNegotiation = async (req, res) => {
  try {
    // accept params from path or query
    const inqno = (req.params.inqno || req.query.inqno || "").toString().trim();
    const inqitem = (req.params.inqitem || req.query.inqitem || "")
      .toString()
      .trim();

    if (!inqno) {
      return res
        .status(400)
        .json({ error: "Missing inquiry number (inqno) param" });
    }

    // sap client and base host
    const sapClient = (
      req.query.sapClient ||
      process.env.SAP_CLIENT ||
      "120"
    ).toString();
    const sapHost = (process.env.SAP_BASE_URL || "").replace(/\/+$/, "");
    const path = `/zinq/negotiation`;

    // pad inqitem to 6 digits if numeric (POSNR style)
    const padPosnr = (raw) => {
      if (!raw) return "";
      if (/^\d+$/.test(raw)) return raw.padStart(6, "0");
      return raw;
    };

    const inqitemParam = padPosnr(inqitem);

    // build URL and query string
    const url = `${sapHost}${path}?sap-client=${encodeURIComponent(
      sapClient
    )}&inqno=${encodeURIComponent(inqno)}${
      inqitemParam ? `&inqitem=${encodeURIComponent(inqitemParam)}` : ""
    }`;

    // build headers
    const headers = {
      Accept: "application/json",
    };

    // prefer explicit Basic auth header if provided (BASE64 username:password)
    if (process.env.SAP_AUTH_BASIC) {
      headers.Authorization = `Basic ${process.env.SAP_AUTH_BASIC}`;
    }

    // allow client to pass cookie if required
    const cookie =
      req.headers["sap-cookie"] ||
      req.query.sapCookie ||
      process.env.SAP_COOKIE;
    if (cookie) headers.Cookie = cookie;

    // axios options
    const axiosOptions = {
      headers,
      timeout: Number(process.env.SAP_REQUEST_TIMEOUT_MS || 5000),
      maxBodyLength: Infinity,
    };

    // fallback to auth object if basic token not present but username/password are configured
    if (
      !process.env.SAP_AUTH_BASIC &&
      process.env.SAP_USERNAME &&
      process.env.SAP_PASSWORD
    ) {
      axiosOptions.auth = {
        username: process.env.SAP_USERNAME,
        password: process.env.SAP_PASSWORD,
      };
    }

    // optionally ignore self-signed certs (DEV ONLY)
    const ignoreSSL =
      String(process.env.SAP_IGNORE_SSL || "false").toLowerCase() === "true";
    if (ignoreSSL) {
      axiosOptions.httpsAgent = new https.Agent({ rejectUnauthorized: false });
    }

    // perform request
    const resp = await axios.get(url, axiosOptions);

    // handle success (2xx)
    if (resp.status >= 200 && resp.status < 300) {
      // Normalize response type: if string but content-type is json, try parse.
      let data = resp.data;
      const contentType = (resp.headers["content-type"] || "").toLowerCase();
      if (
        typeof data === "string" &&
        contentType.includes("application/json")
      ) {
        try {
          data = JSON.parse(data);
        } catch (e) {
          // leave as string
        }
      }

      return res.json({
        status: "ok",
        source: url,
        data,
      });
    }
    // ✅ Send push notification (async fire-and-forget, don’t block response)
    notifyAll({
      title: "getNegotiation 🎉",
      body: `User getNegotiation.`,
    }).catch((err) => console.error("Push send error:", err));

    // non 2xx
    return res.status(resp.status).json({
      status: "error",
      source: url,
      statusCode: resp.status,
      message: resp.data || resp.statusText || "SAP returned non-OK status",
    });
  } catch (err) {
    // log helpful diagnostics
    console.error(
      "getNegotiation error:",
      err?.response?.status,
      err?.message || err
    );
    const statusCode = err?.response?.status || 500;
    const sapBody = err?.response?.data;

    return res.status(statusCode).json({
      error: "Failed to fetch negotiation from SAP",
      details: err?.message,
      sapStatus: statusCode,
      sapBody,
    });
  }
};

// POST Negotiation controller
exports.postNegotiation = async (req, res) => {
  try {
    const body = req.body;

    if (!body || !body.VBELN || !body.POSNR) {
      return res.status(400).json({
        error: "Missing required fields (VBELN, POSNR, etc.)",
      });
    }

    const sapClient = process.env.SAP_CLIENT || "120";
    const sapHost = (process.env.SAP_BASE_URL || "").replace(/\/+$/, "");
    const url = `${sapHost}/zinq/negotiation?sap-client=${sapClient}`;

    // headers
    const headers = {
      "Content-Type": "application/json",
    };

    if (process.env.SAP_AUTH_BASIC) {
      headers.Authorization = `Basic ${process.env.SAP_AUTH_BASIC}`;
    } else {
      // fallback (hardcoded for now, but recommend env variable!)
      headers.Authorization = "Basic QWJhcDpFeHBvdW5kQDEyMzQ1Njc4OQ==";
    }

    if (process.env.SAP_COOKIE) {
      headers.Cookie = process.env.SAP_COOKIE;
    }

    const axiosOptions = {
      method: "post",
      url,
      headers,
      data: body,
      timeout: Number(process.env.SAP_REQUEST_TIMEOUT_MS || 5000),
    };

    // allow self-signed certs in DEV
    if ((process.env.SAP_IGNORE_SSL || "false").toLowerCase() === "true") {
      axiosOptions.httpsAgent = new https.Agent({ rejectUnauthorized: false });
    }

    const resp = await axios.request(axiosOptions);

    return res.json({
      status: "ok",
      source: url,
      data: resp.data,
    });
  } catch (err) {
    // console.error("postNegotiation error:", err.message || err);
    console.error("SAP fetch error", {
      code: err.code,
      errno: err.errno,
      syscall: err.syscall,
      address: err.address,
      port: err.port,
      url: err?.config?.url,
      hostHeader: err?.config?.headers?.Host,
      respStatus: err?.response?.status,
      respData: err?.response?.data,
      stack: err.stack?.split("\n").slice(0, 3).join("\n"),
    });

    return res.status(500).json({
      error: "Failed to save negotiation",
      details: err.message,
    });
  }
};
