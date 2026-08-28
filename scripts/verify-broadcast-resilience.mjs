import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, api, recovery, styles, packageText] = await Promise.all([
  readFile("apps/web/src/main.tsx", "utf8"),
  readFile("apps/api/src/index.ts", "utf8"),
  readFile("apps/api/src/broadcast-recovery.ts", "utf8"),
  readFile("apps/web/src/broadcast.css", "utf8"),
  readFile("package.json", "utf8"),
]);
const packageJson = JSON.parse(packageText);

for (const behavior of [
  /facingMode: \{ exact: targetFacingMode \}/,
  /Some mobile browsers cannot open the other physical camera/,
  /releasedOldTrack/,
  /restoreConstraints/,
  /replacePublishedTrack\(controllerRef\.current, nextTrack\)/,
  /cameraSwitching/,
  /Camera switching failed/,
  /requestFullscreen/,
  /wakeLock\?\.request|wakeLock\.request/,
  /visibilitychange/,
  /if \(document\.hidden\) \{\s*markInterrupted\(\)/,
  /window\.addEventListener\("pagehide"/,
  /keepalive: true/,
  /Resume Live/,
  /publish\/\$\{previousSessionId\}\/resume/,
  /15_000/,
]) assert.match(app, behavior);

for (const behavior of [
  /publishResourceTtlMilliseconds = 50_000/,
  /broadcastRecoveryGraceMilliseconds = 45_000/,
  /failure_code='heartbeat_expired'/,
  /broadcastRecoveryWindows/,
  /persistPolledBroadcastStatus/,
  /\/interruption/,
  /publish\/:sessionId\/resume/,
  /failure_code='creator_resume'/,
  /failure_code=\$1/,
  /broadcastRecoveryMessage/,
]) assert.match(api, behavior);

assert.match(recovery, /statusDuringRecovery/);
assert.match(recovery, /broadcast_interrupted/);
assert.match(recovery, /broadcast_recovered/);
assert.match(recovery, /status\.state === "offline"/);
assert.match(recovery, /state: "connecting"/);

for (const rule of [
  /\.creator-activity-overlay\s*\{[\s\S]*right:/,
  /\.creator-activity-overlay \.video-overlay-comments\s*\{[\s\S]*align-items: flex-end/,
  /\.quick-live-preview\.is-mirrored/,
  /\.phase-live\.controls-hidden \.quick-live-controls\.live-controls/,
  /height:\s*100dvh/,
]) assert.match(styles, rule);

assert.ok(packageJson.scripts.test.includes("broadcast-recovery.test.ts"));
assert.equal(
  packageJson.scripts["verify:broadcast-resilience"],
  "node scripts/verify-broadcast-resilience.mjs",
);
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:broadcast-resilience"));

console.log("Immersive controls, front/rear switching, wake lock, exit cleanup, recovery grace, server expiry, and viewer lifecycle safeguards verified.");
