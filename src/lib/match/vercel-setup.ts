export const VERCEL_DB_SETUP_MSG =
  "Add Postgres on Vercel: Project → Storage → Create Database → connect to this project → redeploy.";

/** Vercel deploy with no game backend configured yet. */
export function vercelNeedsDatabase(): boolean {
  if (process.env.GAME_SERVER_HTTP) return false;
  return Boolean(process.env.VERCEL && !process.env.DATABASE_URL);
}
