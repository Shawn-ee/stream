import { execFileSync } from "node:child_process";
import { createTemporaryProductionEnvironment } from "./temporary-production-environment.mjs";

const composeFile = "docker-compose.production.yml";
const gateway = "http://127.0.0.1:18080";
const projectName = `stream-lc-load-verify-${process.pid}`;
const temporaryEnvironment = createTemporaryProductionEnvironment({
  appPort: "18080",
});
const environmentFile = temporaryEnvironment.path;

const environment = {
  ...process.env,
  ...temporaryEnvironment.environment,
  PRODUCTION_ENV_FILE: environmentFile,
  APP_PORT: "18080",
  LOAD_BASE_URL: gateway,
  LOAD_USERS: "100",
};

function compose(...args) {
  return execFileSync(
    "docker",
    [
      "compose",
      "--project-name",
      projectName,
      "--env-file",
      environmentFile,
      "-f",
      composeFile,
      ...args,
    ],
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
  execFileSync(process.execPath, ["scripts/validate-production-env.mjs", environmentFile], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
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
  try {
    compose("down", "--volumes", "--remove-orphans");
  } finally {
    temporaryEnvironment.cleanup();
  }
}
