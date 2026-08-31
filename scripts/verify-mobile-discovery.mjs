import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, components, styles, packageText] = await Promise.all([
  readFile("apps/web/src/main.tsx", "utf8"),
  readFile("apps/web/src/components/discovery.tsx", "utf8"),
  readFile("apps/web/src/discovery.css", "utf8"),
  readFile("package.json", "utf8"),
]);
const packageJson = JSON.parse(packageText);

assert.match(components, /export type MobileDiscoveryView = "for-you" \| "following" \| "live"/);
assert.match(components, /export function MobileDiscoveryFeed\b/);
assert.match(app, /<MobileDiscoveryFeed\b/);
assert.match(app, /useState<MobileDiscoveryView>\("for-you"\)/);

for (const tab of ["for-you", "following", "live"]) {
  assert.match(components, new RegExp(`id: "${tab}"`), `missing ${tab} mobile discovery tab`);
}
assert.match(components, /role="tablist"/);
assert.match(components, /role="tab"/);
assert.match(components, /aria-selected=\{view === tab\.id\}/);
assert.match(components, /view === "following"[\s\S]*following/);
assert.match(components, /view === "live"[\s\S]*roomState\(room\) === "live"/);
assert.match(components, /LiveStreamCardSkeleton count=\{3\}/);
assert.match(components, /mobile-discovery-empty/);
assert.match(components, /onCategoryChange\(event\.target\.value\)/);
assert.match(components, /onLanguageChange/);
assert.doesNotMatch(components, /<video|<iframe|autoplay|autoPlay/, "mobile discovery must use bounded static previews");
assert.doesNotMatch(components, /fetch\(|request\(|socket|io\(/, "mobile discovery must reuse parent-owned data and realtime state");

for (const rule of [
  /\.mobile-discovery-feed\s*\{\s*display:\s*none/,
  /@media \(max-width: 767px\)[\s\S]*\.mobile-discovery-feed\s*\{[\s\S]*display:\s*grid/,
  /\.featured-live,[\s\S]*\.desktop-discovery-feed,[\s\S]*\.discovery-content > \.following-feed\s*\{\s*display:\s*none/,
  /\.mobile-discovery-tabs\s*\{[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/,
  /\.mobile-discovery-tabs button\s*\{[\s\S]*min-height:\s*var\(--control-min\)/,
  /\.mobile-live-feed-list\s*\{[\s\S]*scroll-snap-type:\s*y mandatory/,
  /\.mobile-live-feed-list > \.live-stream-card\s*\{[\s\S]*scroll-snap-align:\s*start/,
  /@media \(max-width: 359px\)[\s\S]*\.mobile-discovery-controls\s*\{[\s\S]*grid-template-columns:\s*1fr/,
]) assert.match(styles, rule);

assert.equal(packageJson.scripts["verify:mobile-discovery"], "node scripts/verify-mobile-discovery.mjs");
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:mobile-discovery"));

console.log("Mobile content-first feed, For You/Following/Live tabs, truthful static previews, touch targets, and empty states verified.");
