/**
 * Production runner — game server (:3001) + Next custom server (:PORT) with WS proxy.
 * Use on Railway/Render/Fly where one process group runs both services.
 * Vercel deploys only `next build` output; set GAME_SERVER_HTTP + NEXT_PUBLIC_GAME_SERVER_URL instead.
 */
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const game = spawn("node", ["backend/game-server.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env },
});

const server = spawn("node", ["server.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production" },
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
