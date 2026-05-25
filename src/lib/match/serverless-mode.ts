/** Postgres-backed polling (optional — only when DATABASE_URL is set on Vercel). */
export function usesPostgresMatchBackend(): boolean {
  if (process.env.GAME_SERVER_HTTP) return false;
  if (process.env.USE_SERVERLESS_MATCH === "1") return Boolean(process.env.DATABASE_URL);
  if (process.env.VERCEL && process.env.DATABASE_URL) return true;
  return false;
}

/** In-memory polling — default on Vercel with zero extra services. */
export function usesMemoryMatchBackend(): boolean {
  if (process.env.GAME_SERVER_HTTP) return false;
  if (usesPostgresMatchBackend()) return false;
  if (process.env.VERCEL || process.env.VERCEL_URL) return true;
  if (process.env.USE_MEMORY_MATCH === "1") return true;
  return false;
}

export function usesPollingMatchBackend(): boolean {
  return usesPostgresMatchBackend() || usesMemoryMatchBackend();
}

export function matchTransportMode(): "websocket" | "polling" {
  return usesPollingMatchBackend() ? "polling" : "websocket";
}

/** @deprecated use usesPollingMatchBackend */
export function usesServerlessMatchBackend(): boolean {
  return usesPollingMatchBackend();
}

export function matchBackendMode(): "websocket" | "memory" | "postgres" {
  if (process.env.GAME_SERVER_HTTP || (!usesPollingMatchBackend() && !process.env.VERCEL)) {
    return "websocket";
  }
  if (usesPostgresMatchBackend()) return "postgres";
  return "memory";
}
