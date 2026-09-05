import pg from "pg";

const url = process.env.RESTORE_DATABASE_URL;
if (!url) throw new Error("RESTORE_DATABASE_URL must point to an isolated restored database, never production.");
const parsed = new URL(url);
if (url === process.env.DATABASE_URL || url === process.env.DATABASE_MIGRATION_URL) throw new Error("Refusing to verify the active production database as a restore target.");
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: /^dpg-[a-z0-9-]+-a$/.test(parsed.hostname) ? false : true });
try {
  const { rows: tables } = await pool.query("select tablename from pg_tables where schemaname='public' order by tablename");
  const required = ["users", "merchants", "orders", "audit_events", "sessions"];
  const names = new Set(tables.map((row) => row.tablename));
  const missing = required.filter((name) => !names.has(name));
  if (missing.length) throw new Error(`Restore is incomplete; missing tables: ${missing.join(', ')}`);
  const counts = {};
  for (const table of required) counts[table] = Number((await pool.query(`select count(*)::bigint as count from "${table}"`)).rows[0].count);
  console.log(JSON.stringify({ status: "restore_verified", checkedAt: new Date().toISOString(), tableCount: tables.length, rowCounts: counts }, null, 2));
} finally { await pool.end(); }
