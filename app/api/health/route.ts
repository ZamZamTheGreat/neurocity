import { sql } from "drizzle-orm";
import { getDb } from "../../../db";

export async function GET() {
  try {
    await getDb().execute(sql`select 1 as healthy`);
    return Response.json({ status: "ok", database: "connected" });
  } catch (error) {
    const incident = crypto.randomUUID();
    console.error("database health check failed", { incident, error });
    return Response.json({ status: "error", database: "unavailable", incident }, { status: 503 });
  }
}
