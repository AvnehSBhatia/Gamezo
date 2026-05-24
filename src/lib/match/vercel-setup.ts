import { useServerlessMatchBackend } from "@/lib/match/serverless-mode";

export const VERCEL_GAME_SERVER_MSG =
  "Matchmaking needs a game server (no database). Deploy render-game-server.yaml on Render (free), then set GAME_SERVER_HTTP and NEXT_PUBLIC_GAME_SERVER_URL on Vercel to that URL.";

/** Vercel frontend with no game backend wired up yet. */
export function vercelNeedsGameServer(): boolean {
  if (process.env.GAME_SERVER_HTTP) return false;
  if (useServerlessMatchBackend()) return false;
  return Boolean(process.env.VERCEL || process.env.VERCEL_URL);
}
