import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let pool: Pool | undefined;
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

const boundedInteger = (value: string | undefined, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  if (!pool) {
    const hostname = new URL(connectionString).hostname;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    const isRenderInternal = /^dpg-[a-z0-9-]+-a$/.test(hostname);
    pool = new Pool({
      connectionString,
      max: boundedInteger(process.env.DB_POOL_MAX, 10, 2, 50),
      idleTimeoutMillis: boundedInteger(process.env.DB_IDLE_TIMEOUT_MS, 30_000, 1_000, 300_000),
      connectionTimeoutMillis: boundedInteger(process.env.DB_CONNECT_TIMEOUT_MS, 5_000, 1_000, 30_000),
      ssl: isLocal || isRenderInternal ? false : true,
    });
    pool.on("error", (error) => console.error("idle database connection failed", { error }));
  }
  if (!database) database = drizzle(pool, { schema });
  return database;
}

export function getDatabasePoolStats() {
  return pool ? { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount } : { total: 0, idle: 0, waiting: 0 };
}
