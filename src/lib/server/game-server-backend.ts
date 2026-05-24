function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

/** Server-side HTTP base for the real-time game server (API route proxies). */
export function getGameServerHttpBase(): string {
  const configured = process.env.GAME_SERVER_HTTP;
  if (configured) return trimTrailingSlash(configured);

  // Local dev / monolith: game server on 3001, optionally fronted by server.mjs on 3000.
  return "http://127.0.0.1:3001";
}

export function gameServerUnavailableMessage(): string {
  if (process.env.VERCEL || process.env.VERCEL_URL) {
    if (process.env.DATABASE_URL) {
      return "Matchmaking uses serverless mode — run db:push to create match tables, or set GAME_SERVER_HTTP for WebSocket mode.";
    }
    return "No game backend. Option A: add DATABASE_URL on Vercel (Neon) for serverless matchmaking. Option B: deploy render.yaml (one-click full stack). Option C: set GAME_SERVER_HTTP to a game server URL.";
  }
  return "Game server not running. Start it with: npm run dev";
}
