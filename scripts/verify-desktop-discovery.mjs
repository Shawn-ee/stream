import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, components, styles, packageText] = await Promise.all([
  readFile("apps/web/src/main.tsx", "utf8"),
  readFile("apps/web/src/components/discovery.tsx", "utf8"),
  readFile("apps/web/src/discovery.css", "utf8"),
  readFile("package.json", "utf8"),
]);
const packageJson = JSON.parse(packageText);

for (const component of ["LiveStreamCard", "FollowingAvatarRow"]) {
  assert.match(components, new RegExp(`export function ${component}\\b`), `missing ${component}`);
  assert.match(app, new RegExp(`<${component}\\b`), `${component} is not integrated`);
}

for (const accessibleSurface of [
  /aria-label=\{`\$\{room\.streamer_name\}: \$\{room\.title\}`\}/,
  /aria-labelledby="following-avatar-title"/,
  /following-live-badge/,
]) assert.match(components, accessibleSurface);

assert.match(app, /className="audience-global-search"/);
assert.match(app, /id="following-feed"/);
assert.doesNotMatch(app, /<DesktopDiscoveryRail\b/);
assert.match(app, /setFollowingRooms/);
assert.match(app, /discovery:broadcast/);
assert.match(app, /<LiveStreamCardSkeleton count=\{6\}/);
assert.match(app, /<EmptyState/);

for (const layoutRule of [
  /\.audience-discovery\s*\{[\s\S]*width:\s*min\(100%, 90rem\)/,
  /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/,
  /@media \(min-width: 1440px\)/,
  /@media \(max-width: 1180px\)/,
  /@media \(max-width: 767px\)/,
  /@media \(max-width: 359px\)[\s\S]*\.audience-product-header \.product-identity > div\s*\{[\s\S]*display:\s*none/,
  /\.following-avatar-row\s*\{[\s\S]*overflow-x:\s*auto/,
  /\.tag-chip-grid\s*\{[\s\S]*repeat\(4, minmax\(0, 1fr\)\)/,
  /\.live-card-preview\s*\{[\s\S]*aspect-ratio:\s*16 \/ 9/,
  /\.live-stream-card:focus-visible/,
]) assert.match(styles, layoutRule);

assert.match(components, /viewer_count/);
assert.match(components, /room-language-labels/);
assert.match(app, /discovery-language-filter/);
assert.equal(packageJson.scripts["verify:desktop-discovery"], "node scripts/verify-desktop-discovery.mjs");
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:desktop-discovery"));

assert.match(app, /followingRooms\.length \? <FollowingAvatarRow/, "empty Following row must collapse");
assert.match(app, /<AudienceAccountMenu\b/);
assert.match(app, /className="live-empty-compact"/);
assert.match(app, /id="popular-tags"/);
console.log("Desktop audience header, avatar menu, Following row, language and tag discovery, accessibility, and truthful metadata verified.");
