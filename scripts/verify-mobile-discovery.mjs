import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const [app,components,styles]=await Promise.all([readFile("apps/web/src/main.tsx","utf8"),readFile("apps/web/src/components/discovery.tsx","utf8"),readFile("apps/web/src/discovery.css","utf8")]);
assert.match(app,/<SimpleDiscovery\b/);assert.doesNotMatch(app,/<MobileDiscoveryFeed\b/);
assert.match(components,/compact-filter-row/);assert.match(components,/type="checkbox"/);assert.match(components,/selectedLanguages/);assert.match(components,/selectedTags/);
assert.doesNotMatch(components,/<video|<iframe|autoplay|autoPlay/);
assert.match(styles,/@media \(max-width: 767px\)[\s\S]*\.compact-filter-row\s*\{[\s\S]*overflow-x:\s*auto/);
assert.match(styles,/\.compact-filter-popover\s*\{[\s\S]*position:\s*fixed/);assert.match(styles,/\.live-stream-grid\s*\{[\s\S]*grid-template-columns:\s*1fr/);
console.log("One responsive mobile feed, compact viewport-safe filters, static cards, and no duplicate discovery tabs verified.");
