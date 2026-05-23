/**
 * Custom Next.js server that:
 * 1. Serves the Next.js app on port 3000
 * 2. Proxies WebSocket upgrades at /ws/game and /ws/signaling to the
 *    backend on port 3001 — same origin in dev and production
 * 3. Forwards all other upgrades (Turbopack HMR) to Next.js
 */
import http from "http";
import httpProxy from "http-proxy";
import { parse } from "url";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "0.0.0.0";
const gameServer = process.env.GAME_SERVER_HTTP ?? "http://127.0.0.1:3001";

const app = next({ dev, dir: process.cwd() });
const handle = app.getRequestHandler();

const proxy = httpProxy.createProxyServer({
  target: gameServer,
  ws: true,
  changeOrigin: true,
});

proxy.on("error", (err) => {
  console.error("[ws-proxy] error:", err.message);
});

app.prepare().then(() => {
  const handleUpgrade = app.getUpgradeHandler();

  const server = http.createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "/", true);
    handle(req, res, parsedUrl);
  });

  server.on("upgrade", (req, socket, head) => {
    const url = req.url ?? "";
    if (url.startsWith("/ws/game") || url.startsWith("/ws/signaling")) {
      proxy.ws(req, socket, head);
      return;
    }
    handleUpgrade(req, socket, head);
  });

  server.listen(port, host, () => {
    console.log(`> Ready on http://${host}:${port} (WS proxy → ${gameServer})`);
  });
});
