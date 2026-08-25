import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";

const container = `neurocity-test-postgres-${process.pid}`;
const password = "neurocity_test_password";
let started = false;

function command(program, args, options = {}) {
  const result = spawnSync(program, args, { stdio: "inherit", env: process.env, ...options });
  if (result.status !== 0) throw new Error(`${program} ${args.join(" ")} failed with exit code ${result.status}.`);
}

function capture(program, args) {
  const result = spawnSync(program, args, { encoding: "utf8", env: process.env });
  if (result.status !== 0) throw new Error(result.stderr || `${program} ${args.join(" ")} failed.`);
  return result.stdout.trim();
}

function cleanup() {
  if (started) spawnSync("docker", ["stop", container], { stdio: "ignore" });
  started = false;
}

process.on("SIGINT", () => { cleanup(); process.exit(130); });
process.on("SIGTERM", () => { cleanup(); process.exit(143); });
process.on("exit", cleanup);

try {
  command("docker", [
    "run", "--detach", "--rm", "--name", container,
    "--publish", "127.0.0.1::5432",
    "--env", `POSTGRES_PASSWORD=${password}`,
    "--env", "POSTGRES_DB=neurocity_test",
    "postgres:16-alpine",
  ]);
  started = true;

  const portOutput = capture("docker", ["port", container, "5432/tcp"]);
  const port = portOutput.match(/:(\d+)$/)?.[1];
  if (!port) throw new Error(`Could not determine PostgreSQL test port from: ${portOutput}`);
  process.env.DATABASE_URL = `postgres://postgres:${password}@127.0.0.1:${port}/neurocity_test`;
  process.env.NODE_ENV = "test";
  process.env.SESSION_SECRET = "integration-test-only-secret";
  process.env.SMTP_HOST = "";

  let ready = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      await pool.query("select 1");
      ready = true;
      await pool.end();
      break;
    } catch {
      await pool.end().catch(() => {});
      await delay(500);
    }
  }
  if (!ready) throw new Error("PostgreSQL test container did not become ready.");

  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error("npm_execpath is unavailable; run this harness with npm run test:integration.");
  command(process.execPath, [npmCli, "run", "db:migrate"]);
  command(process.execPath, [npmCli, "run", "build"]);
  command(process.execPath, ["--test", "--test-concurrency=1", "tests/database-integration.test.mjs"]);
} finally {
  cleanup();
}
