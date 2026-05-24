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
    if (process.env.GAME_SERVER_HTTP) {
      return "Game server unreachable — check GAME_SERVER_HTTP URL and that Render service is running.";
    }
    return "Deploy the free game server on Render (see render-game-server.yaml), then set GAME_SERVER_HTTP and NEXT_PUBLIC_GAME_SERVER_URL on Vercel.";
  }
  return "Game server not running. Start it with: npm run dev";
}
