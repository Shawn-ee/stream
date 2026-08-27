import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, transport, styles, packageText] = await Promise.all([
  readFile("apps/web/src/main.tsx", "utf8"),
  readFile("apps/web/src/webrtc.ts", "utf8"),
  readFile("apps/web/src/broadcast.css", "utf8"),
  readFile("package.json", "utf8"),
]);
const packageJson = JSON.parse(packageText);

for (const phase of ["idle", "requesting", "preview", "connecting", "live", "error"])
  assert.match(app, new RegExp(`\\| "${phase}"`), `missing ${phase} broadcast phase`);

assert.match(app, /navigator\.mediaDevices\.getUserMedia\(/);
assert.match(app, /facingMode: "user"/);
assert.match(app, /navigator\.mediaDevices\.enumerateDevices\(/);
assert.match(app, /Camera or microphone permission was denied/);
assert.match(app, /Only you can see this preview/);
assert.match(app, /Step 1 of 3/);
assert.match(app, /Step 2 of 3/);
assert.match(app, /Stream title/);
assert.match(app, /maxLength=\{120\}/);
assert.match(app, /await onSaveTitle\(\);[\s\S]*createWhipPublisher\(/);

assert.match(transport, /export async function replacePublishedTrack\(/);
assert.match(transport, /getSenders\(\)/);
assert.match(transport, /await sender\.replaceTrack\(track\)/);
assert.match(app, /await replacePublishedTrack\(controllerRef\.current, nextTrack\)/);
assert.match(app, /async function switchCamera\(\)/);
assert.match(app, /aria-label=\{zh \? "切换相机" : "Switch camera"\}/);
assert.match(app, /Microphone on, tap to mute/);

for (const health of ["ready", "connecting", "excellent", "reconnecting", "unavailable"])
  assert.match(app, new RegExp(`\\| "${health}"`), `missing ${health} connection health`);
assert.match(app, /state === "disconnected"[\s\S]*setConnectionHealth\("reconnecting"\)/);
assert.match(app, /state === "failed"[\s\S]*setConnectionHealth\("unavailable"\)/);
assert.match(app, /broadcast-live-metrics/);
assert.match(app, /Duration/);

assert.match(app, /open=\{endConfirmationOpen\}/);
assert.match(app, /title=\{zh \? "结束直播？" : "End live stream\?"\}/);
assert.match(app, /Your broadcast will stop for every viewer/);
assert.match(app, /setEndConfirmationOpen\(true\)/);
assert.match(app, /onClick=\{\(\) => void endBroadcast\(\)\}/);

for (const rule of [
  /\.quick-live-video-shell\s*\{[\s\S]*aspect-ratio:\s*16 \/ 9/,
  /\.broadcast-stage-status\s*\{[\s\S]*position:\s*absolute/,
  /\.broadcast-stage-controls button\s*\{[\s\S]*height:\s*2\.75rem[\s\S]*width:\s*2\.75rem/,
  /@media \(max-width: 767px\)[\s\S]*\.quick-live-video-shell\s*\{[\s\S]*height:\s*min\(64dvh, 40rem\)/,
  /@media \(max-width: 767px\)[\s\S]*\.quick-live-controls button,[\s\S]*min-height:\s*3\.25rem/,
  /@media \(orientation: landscape\) and \(max-height: 600px\) and \(max-width: 932px\)/,
  /@media \(prefers-reduced-motion: reduce\)/,
]) assert.match(styles, rule);

for (const preservedPath of [
  /\/api\/streamer\/rooms\/\$\{slug\}\/webrtc\/publish/,
  /method: "PATCH"/,
  /method: "DELETE"/,
  /stopMediaStream\(streamRef\.current\)/,
  /<CreatorRealtimeOverlay slug=\{room\.slug\} t=\{t\}/,
]) assert.match(app, preservedPath);

assert.equal(
  packageJson.scripts["verify:mobile-broadcast"],
  "node scripts/verify-mobile-broadcast.mjs",
);
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:mobile-broadcast"));

console.log("Staged mobile permission, preview, title, device switching, health, live controls, safe ending, and preserved WHIP paths verified.");
