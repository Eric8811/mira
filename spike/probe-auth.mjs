// Probe 3 WebSocket auth methods against DashScope Realtime.
// Node's ws lib lets us disable the header-based auth to mirror browser constraints.
import WebSocket from "ws";
import { readFileSync } from "node:fs";

const env = readFileSync("../.env.local", "utf8");
const KEY = env.match(/^DASHSCOPE_API_KEY=(.+)$/m)?.[1];
if (!KEY) throw new Error("no DASHSCOPE_API_KEY in ../.env.local");

const BASE = "wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=qwen3-omni-flash-realtime";

function describe(ws, label, resolve) {
  let settled = false;
  const done = (result) => {
    if (settled) return;
    settled = true;
    try { ws.close(); } catch {}
    resolve({ label, ...result });
  };
  const t = setTimeout(() => done({ ok: false, reason: "timeout-8s" }), 8000);
  ws.on("upgrade", (res) => {
    // server responded to handshake (only fires before 'open')
  });
  ws.on("unexpected-response", (_req, res) => {
    const chunks = [];
    res.on("data", (c) => chunks.push(c));
    res.on("end", () => {
      clearTimeout(t);
      done({
        ok: false,
        httpStatus: res.statusCode,
        httpMessage: res.statusMessage,
        body: Buffer.concat(chunks).toString().slice(0, 400),
      });
    });
  });
  ws.on("open", () => {
    // Open the socket then immediately send a session.update-ish ping to see if auth is accepted.
    // The OpenAI-compatible realtime protocol sends a 'session.created' message on success.
  });
  ws.on("message", (data) => {
    clearTimeout(t);
    const text = data.toString().slice(0, 400);
    done({ ok: true, firstMessage: text });
  });
  ws.on("error", (e) => {
    clearTimeout(t);
    done({ ok: false, reason: "error", err: e.message });
  });
  ws.on("close", (code, reason) => {
    clearTimeout(t);
    done({ ok: false, reason: "close-before-msg", code, closeReason: reason.toString() });
  });
}

async function testA_subprotocol() {
  return new Promise((resolve) => {
    // Approach: Sec-WebSocket-Protocol = 'bearer.<KEY>' (OpenAI Realtime browser pattern)
    const ws = new WebSocket(BASE, ["openai-insecure-api-key." + KEY, "openai-beta.realtime-v1"]);
    describe(ws, "A-subprotocol-openai-style", resolve);
  });
}

async function testA2_subprotocol_bearer() {
  return new Promise((resolve) => {
    const ws = new WebSocket(BASE, ["Bearer", KEY]);
    describe(ws, "A2-subprotocol-Bearer-pair", resolve);
  });
}

async function testB_query() {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${BASE}&api_key=${encodeURIComponent(KEY)}`);
    describe(ws, "B-query-api_key", resolve);
  });
}

async function testB2_query_apikey() {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${BASE}&apikey=${encodeURIComponent(KEY)}`);
    describe(ws, "B2-query-apikey", resolve);
  });
}

async function testC_first_message() {
  // Open WS without any auth, then send auth as first message. Baseline: the server would likely 401 at upgrade.
  return new Promise((resolve) => {
    const ws = new WebSocket(BASE);
    let opened = false;
    const t = setTimeout(() => { try { ws.close(); } catch {} ; resolve({ label: "C-first-message", ok: false, reason: "timeout-opening" }); }, 8000);
    ws.on("open", () => {
      opened = true;
      ws.send(JSON.stringify({ type: "auth", authorization: `Bearer ${KEY}` }));
    });
    ws.on("message", (data) => {
      clearTimeout(t);
      try { ws.close(); } catch {}
      resolve({ label: "C-first-message", ok: true, firstMessage: data.toString().slice(0, 400) });
    });
    ws.on("unexpected-response", (_req, res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        clearTimeout(t);
        resolve({
          label: "C-first-message",
          ok: false,
          httpStatus: res.statusCode,
          body: Buffer.concat(chunks).toString().slice(0, 400),
        });
      });
    });
    ws.on("error", (e) => { clearTimeout(t); resolve({ label: "C-first-message", ok: false, reason: "error", err: e.message, opened }); });
    ws.on("close", (code) => { clearTimeout(t); resolve({ label: "C-first-message", ok: false, reason: "close", code, opened }); });
  });
}

// Baseline: Bearer header (this is what Node/server-side can do but browser can't).
async function testBaseline_header() {
  return new Promise((resolve) => {
    const ws = new WebSocket(BASE, { headers: { Authorization: `Bearer ${KEY}` } });
    describe(ws, "BASELINE-bearer-header", resolve);
  });
}

const tests = [
  testBaseline_header, // prove the endpoint + key actually work at all
  testA_subprotocol,
  testA2_subprotocol_bearer,
  testB_query,
  testB2_query_apikey,
  testC_first_message,
];

for (const t of tests) {
  const r = await t();
  console.log(JSON.stringify(r, null, 2));
  console.log("---");
}
