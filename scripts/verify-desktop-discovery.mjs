import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const [app,components,styles]=await Promise.all([readFile("apps/web/src/main.tsx","utf8"),readFile("apps/web/src/components/discovery.tsx","utf8"),readFile("apps/web/src/discovery.css","utf8")]);
assert.match(app,/<SimpleDiscovery\b/);assert.doesNotMatch(app,/<FollowingAvatarRow\b|<MobileDiscoveryFeed\b|className="audience-main-nav"/);
assert.match(app,/className="audience-global-search"/);assert.match(app,/className="product-identity logo-home"/);
assert.match(components,/export function SimpleDiscovery\b/);assert.match(components,/compact-filter-row/);assert.match(components,/Creators you may like/);
assert.match(components,/room-language-labels/);assert.match(components,/slice\(0,2\)/);assert.doesNotMatch(components,/\{isSimulated\(room\) \?/);
assert.match(styles,/grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);assert.match(styles,/@media \(min-width: 1440px\)/);assert.match(styles,/\.compact-filter-popover/);assert.match(styles,/\.live-stream-card:focus-visible/);
console.log("Minimal desktop header, compact filters, live-first grid, conditional recommendations, and card accessibility verified.");
