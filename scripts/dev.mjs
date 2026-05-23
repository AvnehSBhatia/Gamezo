/**
 * Dev runner — game server (:3001) + custom Next server (:3000) with WS proxy.
 * WebSockets are exposed on the same origin as the app (/ws/game, /ws/signaling).
 */
import { spawn, execSync } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function freePort(port) {
  try {
    execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`, { stdio: "ignore" });
  } catch {
    // ignore
  }
}

freePort(3000);
freePort(3001);

const game = spawn("node", ["backend/game-server.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env },
});

const server = spawn("node", ["server.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "development" },
});

function shutdown(code) {
  game.kill("SIGTERM");
  server.kill("SIGTERM");
  process.exit(code ?? 0);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

game.on("exit", (code) => {
  if (code !== 0 && code !== null) shutdown(code);
});
server.on("exit", (code) => {
  if (code !== 0 && code !== null) shutdown(code);
});
