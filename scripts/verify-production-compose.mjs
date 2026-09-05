import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer } from "node:net";
import { createTemporaryProductionEnvironment } from "./temporary-production-environment.mjs";

const composeFile = "docker-compose.production.yml";
async function availableLocalPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return String(address.port);
}

const appPort = await availableLocalPort();
const gateway = `http://127.0.0.1:${appPort}`;
const projectName = `stream-lc-package-verify-${process.pid}`;
const temporaryEnvironment = createTemporaryProductionEnvironment({
  appPort,
});
const environmentFile = temporaryEnvironment.path;
const environment = {
  ...process.env,
  ...temporaryEnvironment.environment,
  PRODUCTION_ENV_FILE: environmentFile,
  APP_PORT: appPort,
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
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

function verifyHostPreflightSyntax() {
  execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "--mount",
      `type=bind,source=${process.cwd()},target=/workspace,readonly`,
      "node:24-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43",
      "sh",
      "-n",
      "/workspace/deploy/verify-host-prerequisites.sh",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
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
  throw new Error("Production-style gateway did not become healthy.");
}

try {
  verifyHostPreflightSyntax();
  execFileSync(process.execPath, ["scripts/validate-production-env.mjs", environmentFile], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  compose("config", "--quiet");
  compose("up", "-d", "--build");
  await waitForGateway();
  assert.equal((await fetch(`${gateway}/`)).status, 200);
  assert.equal((await fetch(`${gateway}/healthz`)).status, 200);
  assert.equal(
    (
      await fetch(
        `${gateway}/api/streamer/rooms/demo-streamer/broadcast/local-status`,
        {
          method: "PUT",
          headers: {
            "content-type": "application/json",
            cookie: "stream_csrf=production-probe",
            origin: temporaryEnvironment.environment.WEB_ORIGIN,
            "x-csrf-token": "production-probe",
          },
          body: JSON.stringify({ state: "live" }),
        },
      )
    ).status,
    404,
    "production must not expose the local fake-live control",
  );
  assert.equal(
    (await fetch(`${gateway}/internal/metrics`)).status,
    404,
    "internal metrics must not be exposed by the web gateway",
  );
  const identityGatewayForm = new FormData();
  identityGatewayForm.append(
    "document",
    new Blob([Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(7 * 1024 * 1024 - 9)])], { type: "application/pdf" }),
    "gateway-probe.pdf",
  );
  const identityGatewayProbe = await fetch(
    `${gateway}/api/creator/onboarding/identity-document?documentType=passport`,
    {
      method: "POST",
      body: identityGatewayForm,
    },
  );
  assert.equal(
    identityGatewayProbe.status,
    401,
    "a valid-size identity upload must reach API authentication instead of being rejected by Nginx",
  );

  const readiness = compose(
    "exec",
    "-T",
    "api",
    "wget",
    "-qO-",
    "http://127.0.0.1:3001/ready",
  );
  assert.ok(readiness.includes('"status":"ready"'));
  assert.ok(readiness.includes('"privateStorage":"ok"'));

  const privateStorageMode = compose(
    "exec",
    "-T",
    "api",
    "stat",
    "-c",
    "%u:%g:%a",
    "/app/work/private-identity-documents",
  ).trim();
  assert.equal(privateStorageMode, "1000:1000:700");

  const metricsProbe = compose(
    "exec",
    "-T",
    "api",
    "node",
    "-e",
    "const r=await fetch('http://127.0.0.1:3001/internal/metrics',{headers:{authorization:'Bearer '+process.env.METRICS_TOKEN}});const b=await r.text();if(r.status!==200||!b.includes('stream_http_requests_total'))process.exit(1);console.log('private-metrics-ok')",
  );
  assert.ok(metricsProbe.includes("private-metrics-ok"));

  const browserArtifactProbe = compose(
    "exec",
    "-T",
    "web",
    "sh",
    "-c",
    "if find /usr/share/nginx/html -type f -name '.env*' | grep -q .; then exit 1; fi; if grep -R -E 'CLOUDFLARE_|DATABASE_URL|REDIS_URL|POSTGRES_PASSWORD|METRICS_TOKEN|LOCAL_DEMO_PASSWORD' /usr/share/nginx/html >/dev/null; then exit 1; fi; echo browser-artifacts-clean",
  );
  assert.ok(browserArtifactProbe.includes("browser-artifacts-clean"));

  const services = compose("ps", "--status", "running", "--services");
  for (const service of ["postgres", "redis", "api", "web"])
    assert.ok(services.split(/\r?\n/).includes(service), `${service} is not running`);
  console.log(
    "Linux host-script syntax, Production Compose build, migration, readiness, private metrics, clean browser artifacts, and gateway boundary verified.",
  );
} finally {
  try {
    compose("down", "--volumes", "--remove-orphans");
  } finally {
    temporaryEnvironment.cleanup();
  }
}
