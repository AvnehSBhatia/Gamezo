import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

config({ path: ".env" });

const url = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/myapp";

/**
 * prepare: false — required for Neon pooler on Vercel serverless.
 * max: 1 — every Vercel invocation gets its own pgbouncer-side connection;
 *   default max:10 multiplied by N concurrent invocations would exhaust Neon's
 *   ~100-connection per-project limit and fail every DB call under load.
 */
const client = postgres(url, { prepare: false, max: 1 });

export const db = drizzle(client);
