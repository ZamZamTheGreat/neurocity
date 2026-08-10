import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let pool: Pool | undefined;
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  if (!pool) {
    const hostname = new URL(connectionString).hostname;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    const isRenderInternal = /^dpg-[a-z0-9-]+-a$/.test(hostname);
    pool = new Pool({
      connectionString,
      max: 10,
      ssl: isLocal || isRenderInternal ? false : true,
    });
  }
  if (!database) database = drizzle(pool, { schema });
  return database;
}
