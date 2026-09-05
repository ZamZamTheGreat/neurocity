import { build } from "esbuild";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

await build({
  entryPoints: ["tests/security-entry.ts"], outfile: ".security-test-dist/security-entry.mjs",
  bundle: true, platform: "node", format: "esm", packages: "external",
  plugins: [{ name: "isolated-security-database", setup(builder) {
    builder.onResolve({ filter: /^(?:\.\.\/)+db$|^next\/(headers|navigation)$/ }, () => ({ path: resolve("tests/security-fixture.ts") }));
  } }],
});
const result = spawnSync(process.execPath, ["--test", "--test-concurrency=1", "tests/security.test.mjs"], { stdio: "inherit", env: { ...process.env, NODE_ENV: "test", DATABASE_URL: "", SMTP_HOST: "", ADMIN_EMAIL: "administrator@security.example" } });
process.exitCode = result.status ?? 1;
