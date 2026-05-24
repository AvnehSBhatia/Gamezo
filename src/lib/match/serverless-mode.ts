/** Postgres-backed polling (optional — only when DATABASE_URL is set on Vercel). */
export function usePostgresMatchBackend(): boolean {
  if (process.env.GAME_SERVER_HTTP) return false;
  if (process.env.USE_SERVERLESS_MATCH === "1") return Boolean(process.env.DATABASE_URL);
  if (process.env.VERCEL && process.env.DATABASE_URL) return true;
  return false;
}

/** In-memory polling — default on Vercel with zero extra services. */
export function useMemoryMatchBackend(): boolean {
  if (process.env.GAME_SERVER_HTTP) return false;
  if (usePostgresMatchBackend()) return false;
  if (process.env.VERCEL || process.env.VERCEL_URL) return true;
  if (process.env.USE_MEMORY_MATCH === "1") return true;
  return false;
}

export function usePollingMatchBackend(): boolean {
  return usePostgresMatchBackend() || useMemoryMatchBackend();
}

export function matchTransportMode(): "websocket" | "polling" {
  return usePollingMatchBackend() ? "polling" : "websocket";
}

/** @deprecated use usePollingMatchBackend */
export function useServerlessMatchBackend(): boolean {
  return usePollingMatchBackend();
}

export function matchBackendMode(): "websocket" | "memory" | "postgres" {
  if (process.env.GAME_SERVER_HTTP || (!usePollingMatchBackend() && !process.env.VERCEL)) {
    return "websocket";
  }
  if (usePostgresMatchBackend()) return "postgres";
  return "memory";
}
