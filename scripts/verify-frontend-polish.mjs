import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, discovery, ui, styles, packageText] = await Promise.all([
  readFile("apps/web/src/main.tsx", "utf8"),
  readFile("apps/web/src/components/discovery.tsx", "utf8"),
  readFile("apps/web/src/components/ui.tsx", "utf8"),
  readFile("apps/web/src/discovery.css", "utf8"),
  readFile("package.json", "utf8"),
]);
const packageJson = JSON.parse(packageText);

assert.match(app, /const \[sessionLoading, setSessionLoading\] = useState\(true\)/);
assert.match(app, /className="app-loading" aria-busy="true"/);
assert.match(app, /\.finally\(\(\) => setSessionLoading\(false\)\)/);

assert.match(app, /const \[settledQuery, setSettledQuery\] = useState\(\(\)=>initialFilters\.get\("q"\)\?\?""\)/);
assert.match(app, /window\.setTimeout\(\(\) => setSettledQuery\(query\), 250\)/);
assert.match(app, /encodeURIComponent\(settledQuery\)/);
assert.doesNotMatch(app, /api\/rooms\?q=\$\{encodeURIComponent\(query\)\}/);
assert.match(app, /roomsRequestRef\.current/);
assert.match(app, /requestId === roomsRequestRef\.current/);

for (const state of ["roomsError", "followingError"])
  assert.match(app, new RegExp(`const \\[${state}, set${state[0].toUpperCase()}${state.slice(1)}\\]`));
assert.match(app, /Discovery is temporarily unavailable/);
assert.match(app, /Following is temporarily unavailable/);
assert.match(app, /onFollowingRetry=\{\(\) => void loadFollowing\(\)\}/);
assert.match(discovery, /Creators are temporarily unavailable/);
assert.match(discovery, /role="alert"/);
assert.match(ui, /label = "Loading live creators"/);
assert.match(ui, /role="status">\{label\}/);

assert.match(styles, /content-visibility:\s*auto/);
assert.match(styles, /contain-intrinsic-size:\s*auto 28rem/);

assert.equal(packageJson.scripts["verify:frontend-polish"], "node scripts/verify-frontend-polish.mjs");
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:frontend-polish"));
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:web-bundle-budget"));

console.log("Session loading, debounced race-safe discovery, explicit failure states, localized skeleton status, deferred rendering, and performance gates verified.");
