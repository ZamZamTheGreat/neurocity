import { Pool } from "pg";

// Intentionally not exposed through HTTP. Requires operator database credentials
// and the numeric ID of an account whose identity was confirmed out of band.
const [email, id] = process.argv.slice(2);
if (!email || !/^\d+$/.test(id ?? "") || !process.env.DATABASE_URL) throw new Error("Usage: node scripts/provision-admin.mjs <verified-email> <verified-user-id>; DATABASE_URL is required.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const result = await client.query("UPDATE users SET platform_role = 'administrator' WHERE id = $1 AND email = $2 AND status = 'active' RETURNING id", [Number(id), email.trim().toLowerCase()]);
  if (result.rowCount !== 1) throw new Error("The verified account ID and email do not match an active account.");
  await client.query("DELETE FROM sessions WHERE user_id = $1", [Number(id)]);
  await client.query("INSERT INTO audit_events (actor_ref, action, resource_type, resource_id) VALUES ('operator-cli', 'administrator.provisioned', 'user', $1)", [id]);
  await client.query("COMMIT");
  console.log("Administrator role granted; previous sessions revoked. Sign in again.");
} catch (error) { await client.query("ROLLBACK"); throw error; }
finally { client.release(); await pool.end(); }
