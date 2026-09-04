import assert from "node:assert/strict";
import fs from "node:fs";

const app=fs.readFileSync("apps/web/src/main.tsx","utf8");
const discovery=fs.readFileSync("apps/web/src/components/discovery.tsx","utf8");
const navigation=fs.readFileSync("apps/web/src/components/navigation.tsx","utf8");
const routes=fs.readFileSync("apps/web/src/audience-route.ts","utf8");
const api=fs.readFileSync("apps/api/src/index.ts","utf8");
const migration=fs.readFileSync("apps/api/src/db/migrations/031_public_room_ids.sql","utf8");

assert.match(app,/<SimpleDiscovery\b/);
assert.doesNotMatch(app,/<MobileDiscoveryFeed\b|<MobileBottomNav\b|<FollowingAvatarRow\b/);
assert.doesNotMatch(app,/Creators broadcasting now and rooms worth discovering|Browse by interest|Trending now/);
assert.doesNotMatch(app,/className="audience-main-nav"/);
assert.match(app,/Search room ID, creator or tag/);
assert.match(app,/^\s*if\(\!supportAvailable\)return <section/m);
assert.match(app,/if\(\!supportAvailable\)return;/);
assert.match(app,/if \(authenticated\) void request\(`\/api\/rooms\/\$\{room\.slug\}\/visit`/);
assert.match(discovery,/export function SimpleDiscovery/);
assert.match(discovery,/compact-filter-row/);
assert.doesNotMatch(discovery,/\{isSimulated\(room\) \?/);
assert.doesNotMatch(navigation,/View public profile/);
assert.match(routes,/return "\/";/);
assert.match(routes,/\^\\\/tags\\\//);
assert.match(api,/public_room_id AS "publicRoomId"/);
assert.match(api,/\/api\/search/);
assert.match(api,/room_not_live/);
assert.match(migration,/CHECK \(public_room_id ~ '\^\[1-9\]\[0-9\]\{5\}\$'\)/);
assert.match(migration,/UNIQUE \(public_room_id\)/);

console.log("Radically simple homepage, canonical routing, six-digit room IDs, compact filters, and offline realtime isolation verified.");
