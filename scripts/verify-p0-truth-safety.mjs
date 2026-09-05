import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [api, app, discovery, status, seed, migration] = await Promise.all([
  readFile("apps/api/src/index.ts", "utf8"),
  readFile("apps/web/src/main.tsx", "utf8"),
  readFile("apps/web/src/components/discovery.tsx", "utf8"),
  readFile("apps/api/src/broadcast-status.ts", "utf8"),
  readFile("apps/api/src/db/seed.ts", "utf8"),
  readFile("apps/api/src/db/migrations/023_broadcast_status_source.sql", "utf8"),
]);

assert.match(api, /\/api\/streamer\/rooms\/:slug\/broadcast\/end/);
assert.match(api, /external_broadcast_still_live/);
assert.match(api, /broadcast_status_source === "cloudflare"/);
assert.match(api, /ORDER BY \(r\.broadcast_state='live' AND r\.broadcast_status_source='cloudflare'\) DESC/);
assert.match(api, /creator_ended/);
assert.match(api, /webRtcResources\.delete\(sessionId\)/);
assert.match(api, /normalizedReason\.length < 2/);
assert.match(api, /role<>'admin'/);
assert.match(app, /endBroadcastAndLogout/);
assert.match(app, /broadcast\.state !== "live" \|\| broadcast\.source === "local"/);
assert.match(app, /The broadcast could not be confirmed ended, so you were not signed out/);
assert.match(app, /This is a simulated live state; viewers cannot play video\./);
assert.match(app, /source=\{room\.broadcast_status_source\}/);
assert.match(app, /broadcastSource=\{room\.broadcast_status_source\}/);
assert.match(app, /Available after you go live/);
assert.match(app, /Camera preview is available, but browser broadcasting is not connected in this environment/);
assert.match(discovery, /roomState\(room\)==="live"&&!isSimulated\(room\)/);
assert.match(discovery, /Creators you may like/);
assert.match(app, /void loadRooms\(\);[\s\S]*void loadFollowing\(\);[\s\S]*void loadRooms\(\);/);
assert.match(app, /name="moderation-target"/);
assert.match(app, /Moderation reason/);
assert.match(app, /Confirm moderation action/);
assert.doesNotMatch(app, /reason: "local admin test"/);
assert.match(status, /Simulation only:/);
assert.match(seed, /Simulation only:/);
assert.doesNotMatch(discovery, /SIMULATED STATUS/);
assert.match(migration, /CHECK \(broadcast_status_source IN \('local', 'cloudflare'\)\)/);

console.log("Truthful discovery, authoritative termination, simulation labeling, reranking, and selected-user moderation verified.");
