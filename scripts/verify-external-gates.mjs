import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

for (const [script, flag] of [
  ["scripts/verify-camera-cloudflare.mjs", "OWNER_APPROVED_CAMERA_TEST"],
  [
    "scripts/verify-cloudflare-live.mjs",
    "OWNER_APPROVED_CLOUDFLARE_BROADCAST",
  ],
]) {
  const environment = { ...process.env };
  delete environment[flag];
  const result = spawnSync(process.execPath, ["--env-file=.env", script], {
    cwd: process.cwd(),
    env: environment,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0, `${script} ran without owner approval`);
  assert.ok(
    `${result.stdout}${result.stderr}`.includes("Fresh owner approval is required"),
    `${script} did not fail at its approval gate`,
  );
}

console.log("External Cloudflare broadcast approval gates verified fail-closed.");
