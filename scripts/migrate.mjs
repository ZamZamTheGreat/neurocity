import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for migrations.");
const hostname = new URL(connectionString).hostname;
const local = hostname === "localhost" || hostname === "127.0.0.1";
const renderInternal = /^dpg-[a-z0-9-]+-a$/.test(hostname);
const pool = new Pool({ connectionString, max: 1, ssl: local || renderInternal ? false : true });
try {
  await migrate(drizzle(pool), { migrationsFolder: "drizzle-postgres" });
  console.log("Database migrations complete.");
} finally {
  await pool.end();
}
