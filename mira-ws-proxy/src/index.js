// Mira WebSocket proxy: browser ↔ this Worker ↔ DashScope Realtime API.
// DashScope refuses WebSocket handshakes without an `Authorization` header.
// Browsers cannot set WS headers, so we inject the Bearer token here.

const UPSTREAM_HOST = "dashscope.aliyuncs.com";
const UPSTREAM_PATH = "/api-ws/v1/realtime";
const DEFAULT_MODEL = "qwen3-omni-flash-realtime";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response(
        "Mira WS proxy. Connect with a WebSocket client; see /health for liveness.",
        { status: 426, headers: { "Content-Type": "text/plain" } },
      );
    }

    if (!env.DASHSCOPE_API_KEY) {
      return new Response("DASHSCOPE_API_KEY secret not configured", { status: 500 });
    }

    const model = url.searchParams.get("model") || DEFAULT_MODEL;
    const upstreamUrl = `https://${UPSTREAM_HOST}${UPSTREAM_PATH}?model=${encodeURIComponent(model)}`;

    // Open the upstream WebSocket with the Bearer header.
    let upstreamResp;
    try {
      upstreamResp = await fetch(upstreamUrl, {
        headers: {
          Upgrade: "websocket",
          Authorization: `Bearer ${env.DASHSCOPE_API_KEY}`,
        },
      });
    } catch (e) {
      return new Response(`upstream fetch failed: ${e.message}`, { status: 502 });
    }

    const upstream = upstreamResp.webSocket;
    if (!upstream) {
      const body = await upstreamResp.text().catch(() => "");
      return new Response(
        `upstream refused upgrade: ${upstreamResp.status} ${upstreamResp.statusText} ${body}`,
        { status: 502 },
      );
    }
    upstream.accept();

    // Create the client side of the proxy.
    const pair = new WebSocketPair();
    const clientFacing = pair[0];
    const server = pair[1];
    server.accept();

    // Pipe server ← → upstream
    server.addEventListener("message", (e) => {
      try { upstream.send(e.data); } catch {}
    });
    upstream.addEventListener("message", (e) => {
      try { server.send(e.data); } catch {}
    });

    server.addEventListener("close", (e) => {
      try { upstream.close(e.code, e.reason); } catch {}
    });
    upstream.addEventListener("close", (e) => {
      try { server.close(e.code, e.reason); } catch {}
    });

    server.addEventListener("error", () => {
      try { upstream.close(1011, "client error"); } catch {}
    });
    upstream.addEventListener("error", () => {
      try { server.close(1011, "upstream error"); } catch {}
    });

    return new Response(null, { status: 101, webSocket: clientFacing });
  },
};
