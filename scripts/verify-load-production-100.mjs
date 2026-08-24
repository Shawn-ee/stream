import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const composeFile = "docker-compose.production.yml";
const environmentFile = ".env.production.example";
const gateway = "http://127.0.0.1:18080";

const fileEnvironment = Object.fromEntries(
  readFileSync(environmentFile, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      assert.ok(separator > 0, `invalid environment template line: ${line}`);
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);

const environment = {
  ...process.env,
  PRODUCTION_ENV_FILE: environmentFile,
  APP_PORT: "18080",
  LOAD_BASE_URL: gateway,
  LOAD_USERS: "100",
  LOCAL_DEMO_PASSWORD: fileEnvironment.LOCAL_DEMO_PASSWORD,
};

function compose(...args) {
  return execFileSync(
    "docker",
    ["compose", "--env-file", environmentFile, "-f", composeFile, ...args],
    {
      cwd: process.cwd(),
      env: environment,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

async function waitForGateway() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      if ((await fetch(`${gateway}/healthz`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Production-style gateway did not become healthy for load verification.");
}

let servicesStarted = false;
try {
  compose("config", "--quiet");
  compose("up", "-d", "--build");
  servicesStarted = true;
  await waitForGateway();
  compose(
    "exec",
    "-T",
    "api",
    "node",
    "apps/api/dist/db/seed.js",
  );
  execFileSync(process.execPath, ["scripts/verify-load-100.mjs"], {
    cwd: process.cwd(),
    env: environment,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    stdio: "inherit",
  });
  compose(
    "exec",
    "-T",
    "api",
    "node",
    "apps/api/dist/db/seed.js",
  );
  console.log(
    "Locked production-container 100-user load verification passed and demo data was reset.",
  );
} finally {
  if (servicesStarted) {
    try {
      compose(
        "exec",
        "-T",
        "api",
        "node",
        "apps/api/dist/db/seed.js",
      );
    } catch {}
  }
  compose("down");
}
