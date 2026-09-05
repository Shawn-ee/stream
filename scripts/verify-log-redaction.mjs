import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const base = "http://127.0.0.1:3003";
const passwordSentinel = "password-secret-sentinel-never-log";
const metricsSentinel = "metrics-secret-sentinel-never-log-123456";
const child = spawn(
  process.execPath,
  ["--env-file=.env", "--import", "tsx", "apps/api/src/index.ts"],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      API_PORT: "3003",
      API_HOST: "127.0.0.1",
      METRICS_TOKEN: metricsSentinel,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let output = "";
child.stdout.on("data", (chunk) => (output += chunk.toString()));
child.stderr.on("data", (chunk) => (output += chunk.toString()));

async function waitForReady() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      if ((await fetch(`${base}/ready`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Log-verification API did not become ready. ${output.slice(-500)}`);
}

try {
  await waitForReady();
  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      handle: "demo-audience",
      password: passwordSentinel,
    }),
  });
  assert.equal(login.status, 401);
  const metrics = await fetch(`${base}/internal/metrics`, {
    headers: { authorization: `Bearer ${metricsSentinel}` },
  });
  assert.equal(metrics.status, 200);
} finally {
  if (!child.killed) child.kill();
  await new Promise((resolve) => {
    if (child.exitCode !== null) return resolve();
    child.once("exit", resolve);
    setTimeout(resolve, 3000);
  });
}

assert.equal(output.includes(passwordSentinel), false, "password leaked to logs");
assert.equal(output.includes(metricsSentinel), false, "metrics token leaked to logs");
const logLines = output
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);
assert.ok(logLines.length >= 3, "expected structured runtime logs");
for (const line of logLines) assert.doesNotThrow(() => JSON.parse(line));
console.log("Structured JSON logging and credential redaction verified.");
