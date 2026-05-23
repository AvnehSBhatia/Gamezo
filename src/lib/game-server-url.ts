const WS_PATHS = ["/ws/game", "/ws/signaling"] as const;
export type GameWsPath = (typeof WS_PATHS)[number];

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

function httpBaseToWs(base: string): string {
  return trimTrailingSlash(base).replace(/^http:\/\//i, "ws://").replace(/^https:\/\//i, "wss://");
}

/** Public game-server HTTP origin (browser). Set when WS/API are not same-origin (e.g. Vercel + Railway). */
function getPublicGameServerHttp(): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? process.env.NEXT_PUBLIC_GAME_WS_URL;
  if (!explicit) return undefined;
  // Allow passing ws(s):// in NEXT_PUBLIC_GAME_WS_URL — normalize to http for consistency elsewhere.
  return trimTrailingSlash(explicit)
    .replace(/^wss:\/\//i, "https://")
    .replace(/^ws:\/\//i, "http://");
}

/**
 * WebSocket URL for the game/signaling channels.
 * - Monolith (custom server.mjs): same-origin /ws/* via proxy
 * - Split deploy (Vercel frontend): set NEXT_PUBLIC_GAME_SERVER_URL to the public game-server origin
 */
export function getGameWsUrl(path: GameWsPath): string {
  const publicBase = getPublicGameServerHttp();
  if (publicBase) {
    return `${httpBaseToWs(publicBase)}${path}`;
  }

  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}${path}`;
  }

  const appHost =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;

  if (appHost) {
    const proto = appHost.includes("localhost") ? "ws:" : "wss:";
    return `${proto}//${appHost}${path}`;
  }

  return `ws://127.0.0.1:3000${path}`;
}

export function getPublicAppUrl(): string | undefined {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return trimTrailingSlash(process.env.NEXT_PUBLIC_APP_URL);
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return undefined;
}
