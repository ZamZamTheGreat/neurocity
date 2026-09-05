import pg from "pg";

const ownerUrl = process.env.DATABASE_MIGRATION_URL;
const runtimeUrl = process.env.DATABASE_URL;
if (!ownerUrl || !runtimeUrl) throw new Error("DATABASE_MIGRATION_URL and DATABASE_URL are required.");
const owner = new URL(ownerUrl), runtime = new URL(runtimeUrl);
if (owner.hostname !== runtime.hostname || owner.pathname !== runtime.pathname) throw new Error("Migration and runtime URLs must target the same database.");
const role = decodeURIComponent(runtime.username);
if (!/^[A-Za-z_][A-Za-z0-9_$-]{0,62}$/.test(role)) throw new Error("Runtime database role name is invalid.");
const quoted = `"${role.replaceAll('"', '""')}"`;
const databaseName = decodeURIComponent(owner.pathname.slice(1));
const quotedDatabase = `"${databaseName.replaceAll('"', '""')}"`;
const pool = new pg.Pool({ connectionString: ownerUrl, max: 1, ssl: /^dpg-[a-z0-9-]+-a$/.test(owner.hostname) ? false : true });
const runtimePool = new pg.Pool({ connectionString: runtimeUrl, max: 1, ssl: /^dpg-[a-z0-9-]+-a$/.test(runtime.hostname) ? false : true });
try {
  const { rows: [database] } = await pool.query("select pg_get_userbyid(datdba) as owner_role from pg_database where datname = current_database()");
  const ownerRole = database.owner_role;
  if (role === ownerRole) throw new Error("Runtime credential resolves to the database owner; provide a distinct runtime credential.");
  const { rows: [identity] } = await runtimePool.query("select session_user, current_user");
  if (identity.session_user !== identity.current_user) {
    throw new Error(`Runtime credential ${identity.session_user} is provider-configured to assume ${identity.current_user}. Render support must remove that owner-role inheritance before least-privilege verification can pass.`);
  }

  await pool.query("begin");
  await pool.query(`grant connect on database ${quotedDatabase} to ${quoted}`);
  // Older PostgreSQL databases commonly grant schema creation to the implicit
  // PUBLIC role. A role-specific REVOKE cannot override that inherited grant.
  // The schema owner retains ownership privileges after this revocation.
  await pool.query("revoke create on schema public from public");
  await pool.query(`grant usage on schema public to ${quoted}`);
  await pool.query(`grant select, insert, update, delete on all tables in schema public to ${quoted}`);
  await pool.query(`grant usage, select, update on all sequences in schema public to ${quoted}`);
  await pool.query(`revoke create on schema public from ${quoted}`);
  await pool.query(`alter default privileges in schema public grant select, insert, update, delete on tables to ${quoted}`);
  await pool.query(`alter default privileges in schema public grant usage, select, update on sequences to ${quoted}`);
  await pool.query("commit");
  console.log(`Least-privilege runtime grants applied to ${role}.`);
} catch (error) {
  await Promise.allSettled([pool.query("rollback")]);
  throw error;
} finally { await Promise.all([pool.end(), runtimePool.end()]); }
