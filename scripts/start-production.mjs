import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const token = process.env.ORDER_OPERATIONS_TOKEN?.trim() || randomBytes(32).toString("hex");
const port = process.env.PORT || "3000";
const cli = fileURLToPath(new URL("../node_modules/vinext/dist/cli.js", import.meta.url));
const child = spawn(process.execPath, [cli, "start"], { stdio: "inherit", env: { ...process.env, ORDER_OPERATIONS_TOKEN: token } });
child.on("error", (error) => { console.error("NeuroCity server failed to start", error); process.exitCode = 1; });
let running = false;
async function operate() {
  if (running) return;
  running = true;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/internal/order-operations`, { method: "POST", headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(45_000) });
    if (!response.ok) console.error("order operations returned", response.status);
  } catch (error) {
    console.error("order operations request failed", error instanceof Error ? error.message : error);
  } finally { running = false; }
}
const initialTimer = setTimeout(operate, 15_000);
const interval = setInterval(operate, 60_000);
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => { clearTimeout(initialTimer); clearInterval(interval); child.kill(signal); });
child.on("exit", (code, signal) => { clearTimeout(initialTimer); clearInterval(interval); process.exitCode = code ?? (signal ? 1 : 0); });
