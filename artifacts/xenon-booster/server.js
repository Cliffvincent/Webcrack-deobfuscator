const express = require("express");
const axios = require("axios");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const API_URL = process.env.API_URL || "https://nikoxsmm.site/api/v2";
const API_KEY = process.env.API_KEY;

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function splitIds(value) {
  return clean(value).split(",").map((item) => item.trim()).filter(Boolean).slice(0, 100);
}

async function provider(data) {
  if (!API_KEY) {
    const error = new Error("API key is not configured. Add API_KEY to the app secrets.");
    error.status = 503;
    throw error;
  }

  const payload = new URLSearchParams({ key: API_KEY });
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null && value !== "") {
      payload.append(key, String(value));
    }
  }

  const response = await axios.post(API_URL, payload.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    timeout: 30000,
    validateStatus: () => true,
  });

  if (response.status < 200 || response.status >= 300) {
    const error = new Error(`Provider returned HTTP ${response.status}`);
    error.status = 502;
    error.provider = response.data;
    throw error;
  }

  return response.data;
}

function sendError(res, error) {
  const status = Number(error.status) || 500;
  res.status(status).json({
    error: error.message || "Request failed",
    provider: error.provider ?? null,
  });
}

app.get("/booster-api/health", (_req, res) => {
  res.json({
    ok: true,
    configured: Boolean(API_KEY),
    provider: API_URL,
  });
});

app.get("/booster-api/services", async (_req, res) => {
  try {
    res.json(await provider({ action: "services" }));
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/booster-api/balance", async (_req, res) => {
  try {
    res.json(await provider({ action: "balance" }));
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/booster-api/order", async (req, res) => {
  try {
    const service = clean(req.body.service);
    const link = clean(req.body.link);
    const quantity = clean(req.body.quantity);
    if (!service || !link || !quantity) {
      return res.status(400).json({ error: "service, link and quantity are required" });
    }
    res.json(await provider({ action: "add", service, link, quantity }));
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/booster-api/status/:order", async (req, res) => {
  try {
    const order = clean(req.params.order);
    if (!order) return res.status(400).json({ error: "order is required" });
    res.json(await provider({ action: "status", order }));
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/booster-api/status", async (req, res) => {
  try {
    const orders = splitIds(req.body.orders);
    if (!orders.length) return res.status(400).json({ error: "No valid order IDs supplied" });
    res.json(await provider({ action: "status", orders: orders.join(",") }));
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/booster-api/refill", async (req, res) => {
  try {
    const order = clean(req.body.order);
    if (!order) return res.status(400).json({ error: "order is required" });
    res.json(await provider({ action: "refill", order }));
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/booster-api/refill-multiple", async (req, res) => {
  try {
    const orders = splitIds(req.body.orders);
    if (!orders.length) return res.status(400).json({ error: "No valid order IDs supplied" });
    res.json(await provider({ action: "refill", orders: orders.join(",") }));
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/booster-api/refill-status/:refill", async (req, res) => {
  try {
    const refill = clean(req.params.refill);
    if (!refill) return res.status(400).json({ error: "refill is required" });
    res.json(await provider({ action: "refill_status", refill }));
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/booster-api/refill-status", async (req, res) => {
  try {
    const refills = splitIds(req.body.refills);
    if (!refills.length) return res.status(400).json({ error: "No valid refill IDs supplied" });
    res.json(await provider({ action: "refill_status", refills: refills.join(",") }));
  } catch (error) {
    sendError(res, error);
  }
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Xenon Booster running on port ${PORT}`);
});