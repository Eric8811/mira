// Probe: browser-equivalent WebSocket client → Cloudflare Worker → DashScope
// No Authorization header — the Worker must inject it.
import WebSocket from "ws";

const URL = "wss://mira-ws-proxy.zhongyuan425.workers.dev";
console.log("connecting:", URL);

const ws = new WebSocket(URL);
const t0 = Date.now();

const timer = setTimeout(() => {
  console.log("[timeout 10s] no response — failing");
  try { ws.close(); } catch {}
  process.exit(1);
}, 10000);

ws.on("open", () => {
  console.log(`[+${Date.now() - t0}ms] OPEN (upgrade succeeded)`);
});

ws.on("message", (data) => {
  const text = data.toString();
  console.log(`[+${Date.now() - t0}ms] MSG:`, text.slice(0, 400));
  try {
    const parsed = JSON.parse(text);
    if (parsed.type === "session.created") {
      console.log("\n✅ SUCCESS: DashScope session.created received through proxy");
      console.log("   model:", parsed.session?.model);
      console.log("   voice:", parsed.session?.voice);
      console.log("   modalities:", parsed.session?.modalities);
      console.log("   input format:", parsed.session?.input_audio_format);
      console.log("   output format:", parsed.session?.output_audio_format);
      clearTimeout(timer);
      setTimeout(() => { ws.close(); process.exit(0); }, 100);
    }
  } catch (e) {
    console.log("not JSON:", e.message);
  }
});

ws.on("unexpected-response", (_req, res) => {
  const chunks = [];
  res.on("data", (c) => chunks.push(c));
  res.on("end", () => {
    clearTimeout(timer);
    console.log(`[+${Date.now() - t0}ms] HTTP ${res.statusCode} ${res.statusMessage}`);
    console.log("body:", Buffer.concat(chunks).toString().slice(0, 500));
    process.exit(2);
  });
});

ws.on("error", (e) => {
  clearTimeout(timer);
  console.log(`[+${Date.now() - t0}ms] ERROR:`, e.message);
  process.exit(3);
});

ws.on("close", (code, reason) => {
  console.log(`[+${Date.now() - t0}ms] CLOSE code=${code} reason=${reason.toString()}`);
});
