#!/usr/bin/env node
/**
 * HTTP → RAW TCP bridge for Wi-Fi receipt printers (ESC/POS, port 9100).
 * Browser sends POST /print with { ip, port, data (base64) }; bridge forwards bytes to printer.
 */
import http from "node:http";
import net from "node:net";

const HOST = process.env.PRINTER_BRIDGE_HOST || "127.0.0.1";
const PORT = Number(process.env.PRINTER_BRIDGE_PORT || 5179);
const DEFAULT_PRINTER_PORT = 9100;
const DEFAULT_TIMEOUT_MS = 2000;
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

function resolveAllowOrigin(req) {
  const origin = req?.headers?.origin || "";
  if (!origin) return "http://localhost:3000";
  if (
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin.endsWith(".nurcrm.kg") ||
    origin === "https://nurcrm.kg" ||
    origin === "https://app.nurcrm.kg" ||
    origin === "https://stage.nurcrm.kg"
  ) {
    return origin;
  }
  return null;
}

function sendJson(res, status, body, req) {
  const allowOrigin = resolveAllowOrigin(req);
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
  if (allowOrigin) {
    headers["Access-Control-Allow-Origin"] = allowOrigin;
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function isBlockedPrinterIp(ip) {
  // Block metadata / link-local ranges commonly abused for SSRF
  return (
    ip.startsWith("169.254.") ||
    ip === "0.0.0.0" ||
    ip === "255.255.255.255"
  );
}

function sendRawToPrinter(ip, port, data, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (err) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (err) reject(err);
      else resolve();
    };

    socket.setTimeout(timeoutMs, () => {
      finish(new Error(`Printer connection timeout (${timeoutMs}ms)`));
    });

    socket.once("error", finish);
    socket.connect(port, ip, () => {
      socket.write(data, (writeErr) => {
        if (writeErr) {
          finish(writeErr);
          return;
        }
        socket.end(() => finish());
      });
    });
  });
}

async function handlePrint(req, res) {
  let raw;
  try {
    raw = await readBody(req);
  } catch (err) {
    return sendJson(res, 400, { ok: false, error: err.message }, req);
  }

  let body;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    return sendJson(res, 400, { ok: false, error: "Invalid JSON body" }, req);
  }

  const ip = String(body.ip || "").trim();
  const port = Number(body.port || DEFAULT_PRINTER_PORT);
  const timeoutMs = Number(body.timeoutMs || DEFAULT_TIMEOUT_MS);
  const dataBase64 = body.data;

  if (!IPV4_RE.test(ip) || isBlockedPrinterIp(ip)) {
    return sendJson(
      res,
      400,
      { ok: false, error: "Invalid printer IP address" },
      req,
    );
  }
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    return sendJson(
      res,
      400,
      { ok: false, error: "Invalid printer port" },
      req,
    );
  }
  if (typeof dataBase64 !== "string" || !dataBase64.trim()) {
    return sendJson(
      res,
      400,
      { ok: false, error: "Missing base64 data" },
      req,
    );
  }

  let bytes;
  try {
    bytes = Buffer.from(dataBase64, "base64");
  } catch {
    return sendJson(
      res,
      400,
      { ok: false, error: "Invalid base64 data" },
      req,
    );
  }

  if (!bytes.length) {
    return sendJson(
      res,
      400,
      { ok: false, error: "Empty print payload" },
      req,
    );
  }

  try {
    await sendRawToPrinter(ip, port, bytes, timeoutMs);
    return sendJson(res, 200, { ok: true }, req);
  } catch (err) {
    return sendJson(
      res,
      502,
      {
        ok: false,
        error: err?.message || "Failed to send data to printer",
      },
      req,
    );
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    const allowOrigin = resolveAllowOrigin(req);
    const headers = {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    };
    if (allowOrigin) {
      headers["Access-Control-Allow-Origin"] = allowOrigin;
    }
    res.writeHead(allowOrigin ? 204 : 403, headers);
    return res.end();
  }

  if (req.method === "GET" && req.url === "/health") {
    return sendJson(res, 200, { ok: true, service: "printer-bridge" }, req);
  }

  if (req.method === "POST" && (req.url === "/print" || req.url === "/print/")) {
    return handlePrint(req, res);
  }

  sendJson(res, 404, { ok: false, error: "Not found" }, req);
});

server.listen(PORT, HOST, () => {
  console.log(`printer-bridge listening on http://${HOST}:${PORT}/print`);
});

server.on("error", (err) => {
  console.error("printer-bridge failed to start:", err.message);
  process.exit(1);
});
