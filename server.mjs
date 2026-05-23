/**
 * Custom Next.js server that:
 * 1. Serves the Next.js app on port 3000
 * 2. Proxies WebSocket upgrades at /ws/game and /ws/signaling to the
 *    backend on port 3001 — making them reachable from any browser
 *    without the client knowing about the backend port at all.
 */
import http from "http";
import httpProxy from "http-proxy";
import { parse } from "url";
import next from "next";

const dev  = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app    = next({ dev, dir: process.cwd() });
const handle = app.getRequestHandler();

const proxy = httpProxy.createProxyServer({
  target: "http://localhost:3001",
  ws: true,
  changeOrigin: true,
});

proxy.on("error", (err) => {
  console.error("[ws-proxy] error:", err.message);
});

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "/", true);
    handle(req, res, parsedUrl);
  });

  // Proxy WS upgrades for /ws/game and /ws/signaling to backend:3001
  server.on("upgrade", (req, socket, head) => {
    const url = req.url ?? "";
    if (url.startsWith("/ws/game") || url.startsWith("/ws/signaling")) {
      console.log(`[ws-proxy] upgrading ${url} → :3001`);
      proxy.ws(req, socket, head);
    } else {
      socket.destroy();
    }
  });

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
