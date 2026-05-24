import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

config({ path: ".env" });

const url = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/myapp";

/** prepare: false — required for Neon pooler on Vercel serverless. */
const client = postgres(url, { prepare: false });

export const db = drizzle(client);
