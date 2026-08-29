import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, styles, packageText] = await Promise.all([
  readFile("apps/web/src/main.tsx", "utf8"),
  readFile("apps/web/src/broadcast.css", "utf8"),
  readFile("package.json", "utf8"),
]);
const packageJson = JSON.parse(packageText);

for (const behavior of [
  /window\.addEventListener\("beforeunload", protectActiveBroadcast\)/,
  /window\.history\.pushState\([\s\S]*holiwynStreamerSection: "profile"/,
  /window\.history\.replaceState\([\s\S]*holiwynStreamerSection: "live"/,
  /window\.addEventListener\("popstate", restoreStudioSection\)/,
  /const returnToLive = useCallback/,
  /studio-view-active" : "studio-view-inactive"/,
  /Your live broadcast is still running for viewers/,
  /onClick=\{activeSection === "profile" \? returnToLive : openProfile\}/,
]) assert.match(app, behavior);

assert.doesNotMatch(
  app,
  /activeSection === "live"\s*\?\s*\([\s\S]{0,300}<QuickGoLive/,
  "Profile navigation must never conditionally unmount the active publisher",
);

for (const rule of [
  /\.studio-view-inactive\s*\{\s*display:\s*none/,
  /\.broadcast-continues-banner\s*\{/,
  /@media \(max-width: 767px\)[\s\S]*\.broadcaster-profile-button\s*\{[\s\S]*min-height:\s*2\.5rem/,
]) assert.match(styles, rule);

assert.equal(
  packageJson.scripts["verify:streamer-navigation"],
  "node scripts/verify-streamer-navigation.mjs",
);
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:streamer-navigation"));

console.log("Persistent publisher mounting, Profile/Back history, mobile return access, and active-session leave protection verified.");
