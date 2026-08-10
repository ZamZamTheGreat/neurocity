import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  if (!client) client = postgres(connectionString, { max: 10, ssl: process.env.NODE_ENV === "production" ? "require" : false });
  if (!database) database = drizzle(client, { schema });
  return database;
}
