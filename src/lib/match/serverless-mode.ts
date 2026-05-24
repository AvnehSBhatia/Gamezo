/** Use Postgres-backed matchmaking + HTTP polling (Vercel-friendly). */
export function useServerlessMatchBackend(): boolean {
  if (process.env.GAME_SERVER_HTTP) return false;
  if (process.env.USE_SERVERLESS_MATCH === "1") return Boolean(process.env.DATABASE_URL);
  if (process.env.VERCEL && process.env.DATABASE_URL) return true;
  return false;
}

export function matchTransportMode(): "websocket" | "polling" {
  return useServerlessMatchBackend() ? "polling" : "websocket";
}
