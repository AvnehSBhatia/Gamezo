import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";
import postgres from "postgres";

const required = process.argv.includes("--required");
const url = process.env.DATABASE_URL;

if (!url) {
  if (required) {
    console.error("❌ DATABASE_URL is required for db:migrate");
    process.exit(1);
  }
  console.log("⏭ No DATABASE_URL — skipping migrations");
  process.exit(0);
}

const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client);

try {
  console.log("⏳ Running migrations...");
  const migrationsFolder = path.join(process.cwd(), "src/lib/db/migrations");
  await migrate(db, { migrationsFolder });
  console.log("✅ Migrations completed");
} catch (err) {
  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
} finally {
  await client.end();
}
