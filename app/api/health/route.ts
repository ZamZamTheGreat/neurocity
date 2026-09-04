import { sql } from "drizzle-orm";
import { getDatabasePoolStats, getDb } from "../../../db";

export async function GET() {
  try {
    const startedAt = performance.now();
    await getDb().execute(sql`select 1 as healthy`);
    return Response.json({ status: "ok", database: "connected", databaseLatencyMs: Math.round(performance.now() - startedAt), pool: getDatabasePoolStats() }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const incident = crypto.randomUUID();
    console.error("database health check failed", { incident, error });
    return Response.json({ status: "error", database: "unavailable", incident }, { status: 503 });
  }
}
