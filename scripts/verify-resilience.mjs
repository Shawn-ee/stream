import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const base = "http://127.0.0.1:3001";
const composeArgs = ["compose", "-f", "docker-compose.yml"];

function compose(...args) {
  execFileSync("docker", [...composeArgs, ...args], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
}

async function status(path) {
  try {
    return (await fetch(`${base}${path}`)).status;
  } catch {
    return 0;
  }
}

async function waitFor(path, expected, label) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if ((await status(path)) === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${label} did not reach HTTP ${expected}`);
}

async function interruptAndRecover(service) {
  compose("stop", service);
  assert.equal(
    await status("/health"),
    200,
    `${service} outage must not change process liveness`,
  );
  await waitFor("/ready", 503, `${service} outage readiness`);
  compose("start", service);
  await waitFor("/ready", 200, `${service} recovery readiness`);
}

try {
  await waitFor("/ready", 200, "initial readiness");
  await interruptAndRecover("redis");
  await interruptAndRecover("postgres");

  const token =
    process.env.METRICS_TOKEN ?? "local-metrics-token-not-for-production";
  const metrics = await fetch(`${base}/internal/metrics`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(metrics.status, 200);
  const body = await metrics.text();
  const failures = Number(
    body.match(/^stream_readiness_failures_total (\d+)$/m)?.[1] ?? 0,
  );
  assert.ok(failures >= 2, "expected both dependency outages to be counted");
  console.log(
    "PostgreSQL and Redis outages produced safe not-ready responses and recovered.",
  );
} finally {
  compose("start", "postgres", "redis");
  await waitFor("/ready", 200, "final dependency recovery");
}
