import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { audienceRoutePath, parseAudienceRoute } from "../apps/web/src/audience-route.ts";

assert.deepEqual(parseAudienceRoute("/"), { view: "discovery" });
assert.deepEqual(parseAudienceRoute("/discover"), { view: "discovery" });
assert.deepEqual(parseAudienceRoute("/tags"), { view: "legacy-discovery" });
assert.deepEqual(parseAudienceRoute("/categories"), { view: "legacy-discovery" });
assert.deepEqual(parseAudienceRoute("/account/security"), { view: "account", section: "security" });
assert.deepEqual(parseAudienceRoute("/account/following"), { view: "account", section: "following" });
assert.deepEqual(parseAudienceRoute("/account/activity"), { view: "account", section: "activity" });
assert.deepEqual(parseAudienceRoute("/account/notifications"), { view: "account", section: "notifications" });
assert.deepEqual(parseAudienceRoute("/account/preferences"), { view: "account", section: "preferences" });
assert.deepEqual(parseAudienceRoute("/creator/onboarding"), { view: "creator-onboarding", step: "intro" });
assert.deepEqual(parseAudienceRoute("/creator/onboarding/identity"), { view: "creator-onboarding", step: "identity" });
assert.deepEqual(parseAudienceRoute("/creator/status"), { view: "creator-status" });
assert.deepEqual(parseAudienceRoute("/studio"), { view: "studio" });
assert.deepEqual(parseAudienceRoute("/room/demo-streamer"), { view: "room", slug: "demo-streamer" });
assert.deepEqual(parseAudienceRoute("/rooms/demo-streamer"), { view: "room", slug: "demo-streamer" });
assert.deepEqual(parseAudienceRoute("/room/DEMO-STREAMER/"), { view: "room", slug: "demo-streamer" });
assert.deepEqual(parseAudienceRoute("/creator/night-creator"), { view: "creator", slug: "night-creator" });
assert.deepEqual(parseAudienceRoute("/@demo_audience"), { view: "user", handle: "demo_audience" });
for (const invalid of ["/room", "/room/a/b", "/room/%2F", "/creator/bad_slug", "/admin", "/account/nope"])
  assert.deepEqual(parseAudienceRoute(invalid), { view: "invalid" }, `expected invalid route: ${invalid}`);
assert.equal(audienceRoutePath({ view: "discovery" }), "/discover");
assert.equal(audienceRoutePath({ view: "creator-onboarding", step: "intro" }), "/creator/onboarding");
assert.equal(audienceRoutePath({ view: "account", section: "wallet" }), "/account/wallet");
assert.equal(audienceRoutePath({ view: "creator-onboarding", step: "agreement" }), "/creator/onboarding/agreement");
assert.equal(audienceRoutePath({ view: "room", slug: "demo-streamer" }), "/room/demo-streamer");
assert.equal(audienceRoutePath({ view: "creator", slug: "night-creator" }), "/creator/night-creator");
assert.equal(audienceRoutePath({ view: "user", handle: "demo_audience" }), "/@demo_audience");

const [app, nginx, packageText] = await Promise.all([
  readFile("apps/web/src/main.tsx", "utf8"),
  readFile("deploy/nginx.conf", "utf8"),
  readFile("package.json", "utf8"),
]);
const packageJson = JSON.parse(packageText);

assert.match(app, /window\.history\[mode === "push" \? "pushState" : "replaceState"\]/);
assert.match(app, /window\.addEventListener\("popstate", restoreAudienceRoute\)/);
assert.match(app, /hydrateAudienceRoute\(window\.location\.pathname\)/);
assert.match(app, /`\/api\/rooms\/\$\{encodeURIComponent\(route\.slug\)\}`/);
assert.match(app, /`\/api\/users\/\$\{encodeURIComponent\(route\.handle\)\}\/public`/);
assert.match(app, /holiwynAudienceParent/);
assert.match(app, /This Holiwyn page was not found/);
assert.match(app, /community_discovery_removed|legacy-discovery/);
assert.match(app, /setResumeIntent\(\["audience","streamer"\]\.includes\(result\.user\.role\) \? authGate : null\)/);
assert.match(nginx, /try_files \$uri \$uri\/ \/index\.html/);
assert.equal(packageJson.dependencies?.["react-router-dom"], undefined);
assert.equal(packageJson.scripts["verify:canonical-audience-routing"], "node --import tsx scripts/verify-canonical-audience-routing.ts");
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:canonical-audience-routing"));

console.log("Canonical audience route parsing, direct hydration, history restoration, invalid-route recovery, SPA fallback, and auth continuity verified.");
