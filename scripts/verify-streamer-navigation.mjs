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
  /type StreamerSection = "live" \| "earnings" \| "supporters" \| "followers" \| "actions" \| "private" \| "profile" \| "settings"/,
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
  /Open creator menu/,
  /className="creator-menu-sections studio-mobile-nav"/,
  /className="studio-primary-nav"/,
  /const studioNavigation = \[/,
  /studioOpen \? " studio-open"/,
  /!studioOpen \? <header className=\{`product-header/,
  /Sign out and end stream\?/,
  /if \(liveSessionActive\) setLogoutConfirmationOpen\(true\)/,
  /studio-view-active" : "studio-view-inactive"/,
  /Your live broadcast is still running for viewers/,
  /\["live", liveSessionActive \? \(zh \? "直播控制" : "Live control"\) : \(zh \? "开播设置" : "Stream setup"\)/,
  /\["profile", zh \? "公开主页" : "Public profile"/,
  /\["earnings", zh \? "收益" : "Earnings",/,
  /\["supporters", zh \? "支持者" : "Supporters"/,
  /\["followers", zh \? "关注者" : "Followers"/,
  /\["actions", zh \? "互动与变现" : "Monetization"/,
  /\["settings", zh \? "设置" : "Settings",/,
]) assert.match(app, behavior);

assert.doesNotMatch(app, /className="creator-center-nav"/, "overflowing creator tab strip must stay removed");

assert.doesNotMatch(
  app,
  /activeSection === "live"\s*\?\s*\([\s\S]{0,300}<QuickGoLive/,
  "Profile navigation must never conditionally unmount the active publisher",
);

for (const rule of [
  /\.studio-view-inactive\s*\{\s*display:\s*none/,
  /\.broadcast-continues-banner\s*\{/,
  /\.creator-menu-sections\s*\{[\s\S]*display:\s*grid/,
  /\.creator-menu-language\s*\{[\s\S]*grid-template-columns:\s*1fr auto/,
  /\.creator-live-view\.broadcaster-runtime-live \.broadcaster-header\s*\{/,
  /\.creator-center-view \.broadcaster-header\s*\{[\s\S]*position:\s*relative/,
  /\.broadcaster-account-popover\s*\{[\s\S]*position:\s*absolute/,
  /@media \(max-width: 767px\)[\s\S]*\.broadcaster-account-popover\s*\{[\s\S]*position:\s*fixed/,
  /\.broadcaster-account-popover \.locale\s*\{[\s\S]*position:\s*static/,
  /\.broadcaster-signout-button\s*\{[\s\S]*background:\s*#d92d4f/,
  /\.studio-primary-nav\s*\{[\s\S]*position:\s*fixed/,
  /\.studio-open \.broadcaster-account-menu\[open\]::before/,
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

console.log("Persistent publisher mounting, single Studio shell, responsive primary navigation, history restoration, and active-session sign-out protection verified.");
