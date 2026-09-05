import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, api, storage, discovery, migration, nginx, packageText] = await Promise.all([
  readFile("apps/web/src/main.tsx", "utf8"),
  readFile("apps/api/src/index.ts", "utf8"),
  readFile("apps/api/src/stream-thumbnail-storage.ts", "utf8"),
  readFile("apps/web/src/components/discovery.tsx", "utf8"),
  readFile("apps/api/src/db/migrations/032_live_room_snapshots.sql", "utf8"),
  readFile("deploy/nginx.conf", "utf8"),
  readFile("package.json", "utf8"),
]);
const packageJson = JSON.parse(packageText);

for (const clientRule of [
  "canvas.width = 640",
  "canvas.height = 360",
  'canvas.toBlob(resolve, "image/webp", 0.68)',
  "[5_000, 15_000, 30_000]",
  "10 * 60_000",
  'form.append("snapshot"',
]) assert.match(app, new RegExp(clientRule.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing client snapshot rule: ${clientRule}`);
assert.match(app, /broadcastState !== "live"/);
assert.match(app, /broadcastSource !== "cloudflare"/);
assert.doesNotMatch(app, /Choose stream thumbnail|Room cover/);

for (const guard of [
  "streamer_id=$2",
  "publication_status='published'",
  "broadcast_state='live'",
  "broadcast_status_source='cloudflare'",
  "live_snapshot_too_frequent",
  "live_room_snapshot_updated",
  "live_snapshot_source='BROWSER'",
]) assert.match(api, new RegExp(guard.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing server snapshot guard: ${guard}`);
assert.match(api, /CASE WHEN r\.broadcast_state='live' AND r\.broadcast_status_source='cloudflare' AND r\.live_snapshot_source IS NOT NULL THEN r\.stream_thumbnail_url ELSE NULL END AS stream_thumbnail_url/);
assert.match(storage, /512 \* 1024/);
assert.match(storage, /resize\(640, 360/);
assert.match(storage, /webp\(\{ quality: 72/);
assert.match(migration, /live_snapshot_captured_at/);
assert.match(migration, /live_snapshot_source IN \('BROWSER','PROVIDER'\)/);
assert.match(nginx, /location = \/api\/streamer\/stream-thumbnail[\s\S]*client_max_body_size 640k/);
assert.match(discovery, /loading="lazy" decoding="async"/);
assert.match(discovery, /RecommendedCreatorCard[\s\S]*CreatorAvatar/);

assert.equal(packageJson.scripts["verify:live-card-snapshots"], "node scripts/verify-live-card-snapshots.mjs");
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:live-card-snapshots"));

console.log("Low-frequency, owner-authorized live-card snapshots and static lazy audience delivery verified.");
