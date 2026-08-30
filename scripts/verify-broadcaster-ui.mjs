import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, styles, packageText] = await Promise.all([
  readFile("apps/web/src/main.tsx", "utf8"),
  readFile("apps/web/src/broadcast.css", "utf8"),
  readFile("package.json", "utf8"),
]);
const packageJson = JSON.parse(packageText);

for (const surface of [
  "broadcaster-header",
  "broadcaster-layout",
  "broadcaster-stage",
  "broadcaster-chat",
  "broadcaster-chat-feed",
  "broadcaster-chat-form",
  "broadcaster-stream-bar",
]) assert.match(app, new RegExp(surface), `missing ${surface} broadcaster surface`);

for (const phase of ["idle", "requesting", "preview", "connecting", "live", "ending", "ended", "error"])
  assert.match(app, new RegExp(`\\| "${phase}"`), `missing ${phase} broadcast state`);

for (const essential of [
  /<BroadcastIcon name="microphone"/,
  /<BroadcastIcon name="camera"/,
  /<BroadcastIcon name="flip"/,
  /<BroadcastIcon name="chat"/,
  /<BroadcastIcon name="stop"/,
  /mobileOpen=\{mobileChatOpen\}/,
  /onViewerCountChange=\{updateViewerCount\}/,
  /Stream ended/,
  /Peak viewers/,
  /Your broadcast will stop for every viewer/,
  /Preview ready/,
  /PREVIEW READY/,
  /streamer-profile-editor/,
  /Save all public details/,
  /stream \? "has-media" : "no-media"/,
  /mobile-broadcast-scroll-locked/,
  /window\.matchMedia\("\(max-width: 767px\)"\)/,
  /window\.scrollTo\(0, previousScrollY\)/,
  /aria-label=\{zh \? "结束直播" : "End stream"\}/,
]) assert.match(app, essential);

const previewOverlay = app.match(/<div className="broadcast-stage-controls">[\s\S]*?<\/div>/)?.[0] ?? "";
assert.match(previewOverlay, /name="flip"/, "preview overlay must retain camera switching");
assert.doesNotMatch(previewOverlay, /name="microphone"/, "preview overlay must not duplicate the microphone control");

assert.doesNotMatch(
  app.match(/activeSection === "live"[\s\S]*?activeSection === "earnings"/)?.[0] ?? "",
  /CreatorSessionSummary|creator-session-metrics|quick-goal|creator-control-rail/,
  "broadcast workflow must not contain analytics, earnings, goals, or dashboard rails",
);
assert.doesNotMatch(app, /setNotice\(zh \? "直播标题已保存。" : "Stream title saved\."\)/);
assert.match(
  app,
  /notice && \(activeSection !== "live" \|\| !liveSessionActive\)/,
  "active live camera must not render workspace notices",
);

for (const rule of [
  /\.broadcaster-layout\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 3fr\) minmax\(19rem, 1fr\)/,
  /\.broadcaster-chat\s*\{[\s\S]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto/,
  /\.broadcaster-stage \.quick-live-panel\s*\{[\s\S]*flex:\s*0 0 auto/,
  /\.broadcaster-stage \.quick-live-video-shell\s*\{[\s\S]*height:\s*auto;[\s\S]*width:\s*100%/,
  /\.creator-activity-overlay\s*\{[\s\S]*background:\s*transparent/,
  /\.creator-activity-overlay \.overlay-comment\s*\{[\s\S]*background:\s*transparent;[\s\S]*text-shadow:/,
  /\.creator-activity-overlay \.overlay-gift,[\s\S]*background:\s*transparent;[\s\S]*box-shadow:\s*none/,
  /@media \(min-width: 1024px\)[\s\S]*\.broadcaster-stage \.quick-live-panel\.phase-preview,[\s\S]*grid-template-columns:\s*minmax\(0, 2\.15fr\) minmax\(20rem, 0\.85fr\)/,
  /\.broadcaster-stage \.quick-live-panel\.no-media:not\(\.phase-ended\) \.broadcast-permission-step\s*\{[\s\S]*grid-column:\s*2/,
  /\.streamer-profile-editor\s*\{[\s\S]*grid-template-columns:\s*minmax\(16rem, 0\.72fr\) minmax\(0, 1\.5fr\)/,
  /html\.mobile-broadcast-scroll-locked,[\s\S]*body\.mobile-broadcast-scroll-locked\s*\{[\s\S]*overflow:\s*hidden;[\s\S]*overscroll-behavior:\s*none/,
  /body\.mobile-broadcast-scroll-locked\s*\{[\s\S]*position:\s*fixed;[\s\S]*width:\s*100%/,
  /body\.mobile-broadcast-scroll-locked \.app\.role-streamer\s*\{[\s\S]*height:\s*100dvh;[\s\S]*overflow:\s*hidden/,
  /@media \(max-width: 767px\)[\s\S]*\.broadcaster-runtime-live \.broadcaster-stage \.quick-live-video-shell\s*\{[\s\S]*height:\s*100dvh/,
  /@media \(max-width: 767px\)[\s\S]*\.quick-live-controls\.live-controls \.danger\s*\{[\s\S]*border-radius:\s*50%;[\s\S]*position:\s*fixed;[\s\S]*top:\s*max\(0\.75rem, env\(safe-area-inset-top\)\);[\s\S]*width:\s*2\.75rem/,
  /\.quick-live-controls\.live-controls \.danger span\s*\{[\s\S]*clip-path:\s*inset\(50%\)/,
  /\.broadcaster-runtime-live \.broadcaster-notice,[\s\S]*display:\s*none/,
  /@media \(max-width: 767px\)[\s\S]*\.broadcaster-chat\.is-open\s*\{[\s\S]*display:\s*grid/,
  /@media \(max-width: 932px\) and \(orientation: landscape\)/,
]) assert.match(styles, rule);

assert.equal(packageJson.scripts["verify:broadcaster-ui"], "node scripts/verify-broadcaster-ui.mjs");
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:broadcaster-ui"));

console.log("Minimal desktop/mobile broadcaster layout, locked immersive mobile viewport, compact safe ending control, clean live notices, chat/gift feed, and dashboard exclusions verified.");
