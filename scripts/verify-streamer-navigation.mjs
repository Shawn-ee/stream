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
  /type StreamerSection = "live" \| "earnings" \| "supporters" \| "actions" \| "private" \| "profile" \| "settings"/,
  /const openAuxiliarySection = useCallback\(\(section: Exclude<StreamerSection, "live">\)/,
  /const nextUrl = `#streamer-\$\{section\}`/,
  /window\.history\.pushState\(nextState/,
  /window\.history\.replaceState\([\s\S]*holiwynStreamerSection: "live"/,
  /window\.addEventListener\("popstate", restoreStudioSection\)/,
  /window\.addEventListener\("hashchange", restoreStudioSection\)/,
  /const returnToLive = useCallback/,
  /activeView=\{activeSection === "live"\}/,
  /if \(!immersiveBroadcast \|\| !activeView\) return/,
  /creator-live-view" : "creator-center-view"/,
  /className="broadcaster-account-menu"/,
  /Open account menu/,
  /Sign out and end stream\?/,
  /liveSessionActive \? setLogoutConfirmationOpen\(true\) : onLogout\(\)/,
  /studio-view-active" : "studio-view-inactive"/,
  /Your live broadcast is still running for viewers/,
  /\["profile", zh \? "主页" : "Profile"\]/,
  /\["earnings", zh \? "收益" : "Earnings"\]/,
  /\["supporters", zh \? "支持者" : "Supporters"\]/,
  /\["actions", zh \? "互动" : "Actions"\]/,
  /\["settings", zh \? "设置" : "Settings"\]/,
  /className="creator-center-nav"/,
]) assert.match(app, behavior);

assert.doesNotMatch(
  app,
  /activeSection === "live"\s*\?\s*\([\s\S]{0,300}<QuickGoLive/,
  "Profile navigation must never conditionally unmount the active publisher",
);

for (const rule of [
  /\.studio-view-inactive\s*\{\s*display:\s*none/,
  /\.broadcast-continues-banner\s*\{/,
  /\.creator-center-nav\s*\{/,
  /@media \(max-width: 767px\)[\s\S]*\.broadcaster-profile-button\s*\{[\s\S]*min-height:\s*2\.5rem/,
  /\.creator-live-view\.broadcaster-runtime-live \.broadcaster-header\s*\{/,
  /\.creator-center-view \.broadcaster-header\s*\{[\s\S]*position:\s*relative/,
  /\.creator-center-nav\s*\{[\s\S]*scroll-snap-type:\s*x proximity/,
  /\.broadcaster-account-popover\s*\{[\s\S]*position:\s*absolute/,
  /\.broadcaster-signout-button\s*\{[\s\S]*background:\s*#d92d4f/,
]) assert.match(styles, rule);

assert.doesNotMatch(
  styles,
  /(?<!creator-live-view)\.broadcaster-runtime-live \.broadcaster-header\s*\{/,
  "Creator Center must not inherit the fixed immersive live header",
);

assert.equal(
  packageJson.scripts["verify:streamer-navigation"],
  "node scripts/verify-streamer-navigation.mjs",
);
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:streamer-navigation"));

console.log("Persistent publisher mounting, complete Creator Center history/navigation, Back to Live access, and active-session leave protection verified.");
