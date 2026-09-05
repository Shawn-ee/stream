import assert from "node:assert/strict";

const base = "http://127.0.0.1:3001";
const ready = await fetch(`${base}/ready`);
assert.equal(ready.status, 200);
assert.deepEqual(await ready.json(), {
  status: "ready",
  database: "ok",
  redis: "ok",
  privateStorage: "ok",
});
assert.equal(ready.headers.get("x-content-type-options"), "nosniff");
assert.equal(ready.headers.get("x-frame-options"), "DENY");
assert.ok(ready.headers.get("permissions-policy")?.includes("camera=()"));

const originProbe = await fetch(`${base}/api/auth/session`, {
  headers: { origin: "https://not-approved.invalid" },
});
assert.notEqual(
  originProbe.headers.get("access-control-allow-origin"),
  "https://not-approved.invalid",
);

const oversized = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ handle: "x".repeat(70_000), password: "x" }),
});
assert.equal(oversized.status, 413);
const safeError = await oversized.json();
assert.ok(safeError.error);
assert.equal(JSON.stringify(safeError).includes("LOCAL_DEMO_PASSWORD"), false);

const invalidShape = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    handle: "demo-audience",
    password: "short",
    unexpectedPrivilege: "admin",
  }),
});
assert.equal(invalidShape.status, 400);
assert.equal(JSON.stringify(await invalidShape.json()).includes("admin"), false);

const metricsWithoutToken = await fetch(`${base}/internal/metrics`);
assert.equal(metricsWithoutToken.status, 401);
const metricsToken =
  process.env.METRICS_TOKEN ?? "local-metrics-token-not-for-production";
const metrics = await fetch(`${base}/internal/metrics`, {
  headers: { authorization: `Bearer ${metricsToken}` },
});
assert.equal(metrics.status, 200);
assert.ok(metrics.headers.get("content-type")?.includes("text/plain"));
assert.equal(metrics.headers.get("cache-control"), "no-store");
const metricsBody = await metrics.text();
for (const metric of [
  "stream_http_requests_total",
  "stream_http_errors_total",
  "stream_realtime_connections",
  "stream_database_pool_connections",
  "stream_process_resident_memory_bytes",
  "stream_redis_used_memory_bytes",
])
  assert.ok(metricsBody.includes(metric), `missing metric ${metric}`);
assert.equal(metricsBody.includes(metricsToken), false);

console.log(
  "Readiness, protected metrics, security headers, origin policy, schema/body limits, and safe errors verified.",
);
