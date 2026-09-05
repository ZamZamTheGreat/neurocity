import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required.");
const parsed = new URL(url);
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: /^dpg-[a-z0-9-]+-a$/.test(parsed.hostname) ? false : true });
try {
  const { rows: [role] } = await pool.query("select session_user, current_user, has_schema_privilege(current_user, 'public', 'USAGE') as can_use, has_schema_privilege(current_user, 'public', 'CREATE') as can_create");
  const { rows: missing } = await pool.query("select tablename as table_name, privilege_type from pg_tables cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) p(privilege_type) where schemaname='public' and tablename <> '__drizzle_migrations' and not has_table_privilege(current_user, format('%I.%I', schemaname, tablename), privilege_type)");
  if (!role.can_use || role.can_create || missing.length || role.session_user !== role.current_user) {
    const { rows: [ownership] } = await pool.query("select pg_get_userbyid(d.datdba) as database_owner, pg_get_userbyid(n.nspowner) as schema_owner from pg_database d cross join pg_namespace n where d.datname=current_database() and n.nspname='public'");
    const { rows: memberships } = await pool.query("select parent.rolname from pg_auth_members m join pg_roles member on member.oid=m.member join pg_roles parent on parent.oid=m.roleid where member.rolname=session_user order by parent.rolname");
    const inheritedRoles = memberships.map(({ rolname }) => rolname).join(",") || "none";
    throw new Error(`Runtime database role is not least-privilege ready (sessionUser=${role.session_user}, effectiveUser=${role.current_user}, schemaUse=${role.can_use}, schemaCreate=${role.can_create}, missingTableGrants=${missing.length}, databaseOwner=${ownership.database_owner}, schemaOwner=${ownership.schema_owner}, inheritedRoles=${inheritedRoles}).`);
  }
  console.log(`Runtime role ${role.current_user} passed least-privilege verification across all application tables.`);
} finally { await pool.end(); }
