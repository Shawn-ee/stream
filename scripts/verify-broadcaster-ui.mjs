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
]) assert.match(app, essential);

assert.doesNotMatch(
  app.match(/activeSection === "live"[\s\S]*?activeSection === "earnings"/)?.[0] ?? "",
  /CreatorSessionSummary|creator-session-metrics|quick-goal|creator-control-rail/,
  "broadcast workflow must not contain analytics, earnings, goals, or dashboard rails",
);

for (const rule of [
  /\.broadcaster-layout\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 3fr\) minmax\(19rem, 1fr\)/,
  /\.broadcaster-chat\s*\{[\s\S]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto/,
  /@media \(max-width: 767px\)[\s\S]*\.broadcaster-runtime-live \.broadcaster-stage \.quick-live-video-shell\s*\{[\s\S]*height:\s*100dvh/,
  /@media \(max-width: 767px\)[\s\S]*\.broadcaster-chat\.is-open\s*\{[\s\S]*display:\s*grid/,
  /@media \(max-width: 932px\) and \(orientation: landscape\)/,
]) assert.match(styles, rule);

assert.equal(packageJson.scripts["verify:broadcaster-ui"], "node scripts/verify-broadcaster-ui.mjs");
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:broadcaster-ui"));

console.log("Minimal desktop/mobile broadcaster layout, essential controls, chat/gift feed, safe ending, and dashboard exclusions verified.");
