import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const nodeImage =
  "node:24-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43";
const repository = process.cwd();
const fixture = mkdtempSync(join(tmpdir(), "stream-staging-operator-"));
const bin = join(fixture, "bin");
mkdirSync(bin);

const expectedCommit = "0123456789abcdef0123456789abcdef01234567";

writeFileSync(
  join(bin, "git"),
  `#!/bin/sh
case "$1" in
  rev-parse) printf '%s\\n' "\${MOCK_GIT_HEAD:-${expectedCommit}}" ;;
  status) exit 0 ;;
  --version) printf 'git version 2.45.0\\n' ;;
  *) exit 1 ;;
esac
`,
);
writeFileSync(
  join(bin, "docker"),
  `#!/bin/sh
printf '%s\\n' "$*" >> /tmp/stream-docker-calls
if [ "$1" = "version" ]; then printf '24.0.0\\n'; exit 0; fi
if [ "$1" = "compose" ] && [ "$2" = "version" ]; then printf '2.20.0\\n'; exit 0; fi
exit 0
`,
);

function runOperator(args, environment = {}) {
  return spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "--mount",
      `type=bind,source=${repository},target=/workspace,readonly`,
      "--mount",
      `type=bind,source=${fixture},target=/fixture,readonly`,
      ...Object.entries(environment).flatMap(([name, value]) => ["-e", `${name}=${value}`]),
      nodeImage,
      "sh",
      "-c",
      "mkdir -p /tmp/mockbin && cp /fixture/bin/* /tmp/mockbin/ && chmod +x /tmp/mockbin/* && PATH=/tmp/mockbin:$PATH sh /workspace/deploy/private-staging-operator.sh \"$@\"",
      "operator-test",
      ...args,
    ],
    { cwd: repository, encoding: "utf8" },
  );
}

try {
  execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "--mount",
      `type=bind,source=${repository},target=/workspace,readonly`,
      nodeImage,
      "sh",
      "-n",
      "/workspace/deploy/private-staging-operator.sh",
    ],
    { cwd: repository, stdio: "pipe" },
  );
  execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "--mount",
      `type=bind,source=${repository},target=/workspace,readonly`,
      nodeImage,
      "sh",
      "-n",
      "/workspace/deploy/verify-host-prerequisites.sh",
    ],
    { cwd: repository, stdio: "pipe" },
  );

  const missingApproval = runOperator(["plan"], {
    EXPECTED_RELEASE_COMMIT: expectedCommit,
  });
  assert.notEqual(missingApproval.status, 0);
  assert.match(missingApproval.stderr, /owner approval is not recorded/);

  const shortCommit = runOperator(["plan"], {
    STREAM_PRIVATE_STAGING_APPROVED: "I_APPROVE_PRIVATE_STAGING",
    EXPECTED_RELEASE_COMMIT: "abc123",
  });
  assert.notEqual(shortCommit.status, 0);
  assert.match(shortCommit.stderr, /full 40-character hexadecimal commit/);

  const wrongCommit = runOperator(["plan"], {
    STREAM_PRIVATE_STAGING_APPROVED: "I_APPROVE_PRIVATE_STAGING",
    EXPECTED_RELEASE_COMMIT: expectedCommit,
    MOCK_GIT_HEAD: "ffffffffffffffffffffffffffffffffffffffff",
  });
  assert.notEqual(wrongCommit.status, 0);
  assert.match(wrongCommit.stderr, /does not match EXPECTED_RELEASE_COMMIT/);

  const unapprovedStart = runOperator(["start"], {
    STREAM_PRIVATE_STAGING_APPROVED: "I_APPROVE_PRIVATE_STAGING",
    EXPECTED_RELEASE_COMMIT: expectedCommit,
    PRODUCTION_ENV_FILE: ".env.production.example",
  });
  assert.notEqual(unapprovedStart.status, 0);
  assert.match(unapprovedStart.stderr, /APPROVED_STAGING_ACTION=start/);

  const approvedPlan = runOperator(["plan"], {
    STREAM_PRIVATE_STAGING_APPROVED: "I_APPROVE_PRIVATE_STAGING",
    EXPECTED_RELEASE_COMMIT: expectedCommit,
    PRODUCTION_ENV_FILE: ".env.production.example",
  });
  assert.equal(
    approvedPlan.status,
    0,
    `approved read-only plan failed:\n${approvedPlan.stdout}\n${approvedPlan.stderr}`,
  );
  assert.match(approvedPlan.stdout, /no service was started/);

  const source = await import("node:fs").then(({ readFileSync }) =>
    readFileSync("deploy/private-staging-operator.sh", "utf8"),
  );
  const hostPreflight = await import("node:fs").then(({ readFileSync }) =>
    readFileSync("deploy/verify-host-prerequisites.sh", "utf8"),
  );
  assert.match(source, /compose down/);
  assert.doesNotMatch(source, /compose down[^\n]*(--volumes|-v)/);
  assert.match(source, /127\.0\.0\.1:\*/);
  assert.match(hostPreflight, /command -v git/);

  console.log(
    "Private staging operator and host-preflight syntax, Git admission, owner/commit/action guards, localhost check, and volume-preserving stop verified.",
  );
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
