import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

function command(executable, args) {
  return execFileSync(executable, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const ignoredEnvironment = command("git", ["check-ignore", ".env"]);
assert.ok(ignoredEnvironment.trim().endsWith(".env"));

const trackedWordDocument = command("git", ["ls-files"])
  .split(/\r?\n/)
  .find((path) => path.toLowerCase().endsWith(".docx"));
assert.equal(
  trackedWordDocument,
  undefined,
  `Word documents must remain local and untracked: ${trackedWordDocument}`,
);

const proposed = command("git", ["add", "--dry-run", "--all"]);
const proposedPaths = [...proposed.matchAll(/^add '(.+)'$/gm)].map(
  ([, path]) => path.replaceAll("\\\\", "/"),
);
const forbiddenPath = proposedPaths.find(
  (path) =>
    path === ".env" ||
    path === "node_modules" ||
    path.startsWith("node_modules/") ||
    path.split("/").includes("node_modules") ||
    path.split("/").includes("dist") ||
    path.split("/").includes("coverage") ||
    path === "work" ||
    path.startsWith("work/") ||
    path.endsWith(".log") ||
    path.endsWith(".docx"),
);
assert.equal(
  forbiddenPath,
  undefined,
  `release baseline would include ${forbiddenPath}`,
);

const sensitivePatterns = [
  "cfat_[A-Za-z0-9_-]{20,}",
  "-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----",
  "AKIA[0-9A-Z]{16}",
];
const scan = spawnSync(
  "rg",
  [
    "-n",
    "--hidden",
    "-g",
    "!node_modules/**",
    "-g",
    "!.git/**",
    "-g",
    "!.env",
    "-g",
    "!work/**",
    "-g",
    "!scripts/verify-release-preflight.mjs",
    sensitivePatterns.join("|"),
    ".",
  ],
  { cwd: process.cwd(), encoding: "utf8" },
);
assert.ok([0, 1].includes(scan.status));
assert.equal(scan.status, 1, `sensitive source match:\n${scan.stdout}`);

const browserServerVariableScan = spawnSync(
  "rg",
  [
    "-n",
    "--hidden",
    "-g",
    "!node_modules/**",
    "CLOUDFLARE_|DATABASE_URL|REDIS_URL|POSTGRES_PASSWORD|METRICS_TOKEN|LOCAL_DEMO_PASSWORD",
    "apps/web",
  ],
  { cwd: process.cwd(), encoding: "utf8" },
);
assert.ok([0, 1].includes(browserServerVariableScan.status));
assert.equal(
  browserServerVariableScan.status,
  1,
  `server-only variable name found in browser source/build:\n${browserServerVariableScan.stdout}`,
);

for (const environmentFile of [".env.example", ".env.production.example"]) {
  const content = readFileSync(environmentFile, "utf8");
  for (const name of [
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_STREAM_CUSTOMER_CODE",
    "CLOUDFLARE_STREAM_LIVE_INPUT_ID",
    "CLOUDFLARE_STREAM_SIGNING_KEY_ID",
    "CLOUDFLARE_STREAM_SIGNING_JWK",
  ]) {
    const value = content.match(new RegExp(`^${name}=(.+)$`, "m"))?.[1];
    assert.ok(value?.startsWith("replace-with-"), `${name} is not a placeholder`);
  }
}

const staged = spawnSync("git", ["diff", "--cached", "--quiet"], {
  cwd: process.cwd(),
});
assert.equal(staged.status, 0, "preflight must not run with unreviewed staged changes");

console.log(
  "Release baseline preflight passed: proposed files are clean and nothing was staged.",
);
