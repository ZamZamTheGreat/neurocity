import { AsyncLocalStorage } from "node:async_hooks";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../db/schema";

export const pg = new PGlite();
const db = drizzle(pg, { schema });
export const getDb = () => db;
export const cookieContext = new AsyncLocalStorage<Map<string, { value: string }>>();
export async function cookies() {
  const jar = cookieContext.getStore()!;
  return { get: (name: string) => jar.get(name), set: (name: string, value: string) => jar.set(name, { value }) };
}
export const redirect = (url: string) => { throw new Error(`Redirect: ${url}`); };
