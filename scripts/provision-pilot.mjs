import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
// Explicit operator action; never runs during builds or public requests.
await build({ absWorkingDir: root, stdin: { contents: 'import { ensurePilotCatalogue } from "./db/catalogue"; ensurePilotCatalogue().then((merchant) => { console.log("Pilot provisioned:", merchant.slug); process.exit(0); }).catch((error) => { console.error(error); process.exit(1); });', resolveDir: root, loader: "ts" }, outfile: ".seed-dist/provision.mjs", bundle: true, platform: "node", format: "esm", packages: "external" });
const result = spawnSync(process.execPath, [".seed-dist/provision.mjs"], { cwd: root, stdio: "inherit" });
process.exitCode = result.status ?? 1;
