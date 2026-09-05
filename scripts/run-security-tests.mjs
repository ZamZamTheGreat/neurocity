import { build } from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

await build({
  absWorkingDir: projectRoot,
  stdin: {
    contents: await readFile(resolve(projectRoot, "tests/security-entry.ts"), "utf8"),
    resolveDir: resolve(projectRoot, "tests"),
    sourcefile: "security-entry.ts",
    loader: "ts",
  },
  outfile: resolve(projectRoot, ".security-test-dist/security-entry.mjs"),
  bundle: true, platform: "node", format: "esm", packages: "external",
  plugins: [{ name: "isolated-security-database", setup(builder) {
    builder.onResolve({ filter: /^(?:\.\.\/)+db$|^next\/(headers|navigation)$/ }, () => ({ path: resolve(projectRoot, "tests/security-fixture.ts") }));
  } }],
});
const result = spawnSync(process.execPath, ["--test", "--test-concurrency=1", resolve(projectRoot, "tests/security.test.mjs")], { cwd: projectRoot, stdio: "inherit", env: { ...process.env, NODE_ENV: "test", DATABASE_URL: "", SMTP_HOST: "", ADMIN_EMAIL: "administrator@security.example", ADMIN_MFA_SECRET: "JBSWY3DPEHPK3PXP" } });
process.exitCode = result.status ?? 1;
