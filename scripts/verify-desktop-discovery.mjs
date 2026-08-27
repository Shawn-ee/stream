import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, components, styles, packageText] = await Promise.all([
  readFile("apps/web/src/main.tsx", "utf8"),
  readFile("apps/web/src/components/discovery.tsx", "utf8"),
  readFile("apps/web/src/discovery.css", "utf8"),
  readFile("package.json", "utf8"),
]);
const packageJson = JSON.parse(packageText);

for (const component of ["LiveStreamCard", "FeaturedLive", "DesktopDiscoveryRail"]) {
  assert.match(components, new RegExp(`export function ${component}\\b`), `missing ${component}`);
  assert.match(app, new RegExp(`<${component}\\b`), `${component} is not integrated`);
}

for (const accessibleSurface of [
  /aria-label=\{`\$\{room\.streamer_name\}: \$\{room\.title\}`\}/,
  /aria-expanded=\{!collapsed\}/,
  /aria-label=\{zh \? "主播发现" : "Creator discovery"\}/,
]) assert.match(components, accessibleSurface);

assert.match(app, /className="audience-global-search"/);
assert.match(app, /id="following-feed"/);
assert.match(app, /id="creator-program"/);
assert.match(app, /setFollowingRooms/);
assert.match(app, /discovery:broadcast/);
assert.match(app, /<LiveStreamCardSkeleton count=\{6\}/);
assert.match(app, /<EmptyState/);

for (const layoutRule of [
  /grid-template-columns:\s*14rem minmax\(0, 1fr\)/,
  /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/,
  /@media \(min-width: 1440px\)/,
  /@media \(max-width: 1180px\)/,
  /@media \(max-width: 767px\)/,
  /@media \(max-width: 359px\)[\s\S]*\.audience-product-header \.product-identity > div\s*\{[\s\S]*display:\s*none/,
  /\.desktop-discovery-rail\s*\{[\s\S]*position:\s*sticky/,
  /\.desktop-discovery-rail\s*\{[\s\S]*max-height:\s*calc\(100vh - 6\.5rem\)/,
  /\.live-card-preview\s*\{[\s\S]*aspect-ratio:\s*16 \/ 9/,
  /\.live-stream-card:focus-visible/,
]) assert.match(styles, layoutRule);

assert.doesNotMatch(components, /viewerCount|viewer_count|1\.2K|1,284/, "discovery must not invent unavailable viewer counts");
assert.equal(packageJson.scripts["verify:desktop-discovery"], "node scripts/verify-desktop-discovery.mjs");
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:desktop-discovery"));

console.log("Desktop header, creator rail, featured/live discovery, responsive cards, accessibility, and truthful metadata verified.");
