const baseUrl = (process.env.LOAD_TEST_URL || "http://localhost:3000").replace(/\/$/, "");
const concurrency = Math.min(100, Math.max(1, Number(process.env.LOAD_TEST_CONCURRENCY) || 10));
const requests = Math.min(10_000, Math.max(concurrency, Number(process.env.LOAD_TEST_REQUESTS) || 100));
const paths = (process.env.LOAD_TEST_PATHS || "/api/health,/api/stores,/api/malls,/marketplace").split(",").map((path) => path.trim()).filter((path) => path.startsWith("/"));

const results = [];
let cursor = 0;
async function worker() {
  while (cursor < requests) {
    const index = cursor++;
    const path = paths[index % paths.length];
    const startedAt = performance.now();
    try {
      const response = await fetch(`${baseUrl}${path}`, { headers: { accept: path.startsWith("/api/") ? "application/json" : "text/html", "user-agent": "NeuroCity-Load-Test/1.0" } });
      await response.arrayBuffer();
      results.push({ path, status: response.status, duration: performance.now() - startedAt });
    } catch (error) {
      const cause = error instanceof Error && error.cause && typeof error.cause === "object" ? error.cause : null;
      results.push({ path, status: 0, duration: performance.now() - startedAt, error: error instanceof Error ? error.message : "request failed", code: cause && "code" in cause ? String(cause.code) : undefined });
    }
  }
}

const wallStartedAt = performance.now();
await Promise.all(Array.from({ length: concurrency }, () => worker()));
const wallSeconds = (performance.now() - wallStartedAt) / 1000;
const durations = results.map((item) => item.duration).sort((a, b) => a - b);
const percentile = (ratio) => Math.round(durations[Math.min(durations.length - 1, Math.floor(durations.length * ratio))] || 0);
const failures = results.filter((item) => item.status < 200 || item.status >= 400);
const summary = { target: baseUrl, requests: results.length, concurrency, requestsPerSecond: Number((results.length / wallSeconds).toFixed(1)), latencyMs: { p50: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99), max: Math.round(durations.at(-1) || 0) }, failures: failures.length, statuses: Object.fromEntries([...new Set(results.map((item) => item.status))].map((status) => [status, results.filter((item) => item.status === status).length])), sampleErrors: [...new Map(failures.filter((item) => item.error).map((item) => [`${item.code ?? "unknown"}:${item.error}`, { code: item.code ?? null, message: item.error }])).values()].slice(0, 5) };
console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exitCode = 1;
