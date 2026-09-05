import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, classification, api, styles, migration, seed, nginx, packageText] = await Promise.all([
  readFile("apps/web/src/main.tsx", "utf8"),
  readFile("apps/web/src/components/room-classification.tsx", "utf8"),
  readFile("apps/api/src/index.ts", "utf8"),
  readFile("apps/web/src/broadcast.css", "utf8"),
  readFile("apps/api/src/db/migrations/018_streamer_production_polish.sql", "utf8"),
  readFile("apps/api/src/db/seed.ts", "utf8"),
  readFile("deploy/nginx.conf", "utf8"),
  readFile("package.json", "utf8"),
]);
const packageJson = JSON.parse(packageText);

for (const branding of ["PRIVATE STAGING", "HOLIWYN", "Creator preview environment"])
  assert.match(app, new RegExp(branding), `missing staging branding: ${branding}`);
assert.doesNotMatch(app, />Stream MVP</, "visible product heading must not use the old MVP brand");

for (const metadata of ["Stream title", "Audience card preview", "Choose stream thumbnail"])
  assert.match(app, new RegExp(metadata.replace(/[()]/g, "\\$&")), `missing pre-live metadata: ${metadata}`);
for (const metadata of ["Stream languages", "Content tags"])
  assert.match(classification, new RegExp(metadata), `missing room classification metadata: ${metadata}`);
assert.match(app, /await onSaveMetadata\(\)/, "metadata must be saved before broadcast starts");

for (const action of ['"delete"', '"mute"', '"timeout"', '"ban"', '"unban"'])
  assert.match(api, new RegExp(action), `missing moderation action ${action}`);
for (const event of ["chat:deleted", "moderation:action", "chat:settings"])
  assert.match(api, new RegExp(event), `missing realtime moderation event ${event}`);
assert.ok((app.match(/socket\.on\("chat:deleted"/g) ?? []).length >= 3, "creator chat, creator overlay, and audience room must all remove deleted messages");
assert.match(api, /chat_slow_mode_seconds/);
assert.match(api, /blocked_terms/);

for (const health of ["Device", "Stream connection", "Viewer playback"])
  assert.match(app, new RegExp(health), `missing layered health label: ${health}`);
for (const summary of ["R earned", "Supporters", "Chat messages", "New followers", "Top supporter"])
  assert.match(app, new RegExp(summary), `missing post-stream summary: ${summary}`);
assert.doesNotMatch(app, /SIMULATED LIVE|SIMULATED STARTING|Lifetime test income|Test support/, "production Studio must not expose test-state labels");

for (const icon of ["viewers", "more", "close", "upload", "timeout", "ban"])
  assert.match(app, new RegExp(`${icon}:`), `missing SVG icon ${icon}`);
assert.match(app, /focusX=/);
assert.match(app, /focusY=/);
assert.match(app, /stream-thumbnail/);
assert.match(styles, /avatar-focus-controls/);
assert.match(styles, /broadcast-health-layers/);
assert.match(styles, /broadcaster-chat-settings/);

for (const column of ["stream_language", "stream_tags", "stream_thumbnail_url", "chat_slow_mode_seconds", "blocked_terms", "is_banned", "muted_until", "deleted_at"])
  assert.match(migration, new RegExp(column), `missing schema field ${column}`);
for (const reset of [
  "stream_language='en'",
  "stream_tags='{}'::text[]",
  "stream_thumbnail_url=NULL",
  "chat_slow_mode_seconds=0",
  "blocked_terms='{}'::text[]",
])
  assert.match(seed, new RegExp(reset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `seed must reset ${reset}`);
assert.match(nginx, /location = \/api\/streamer\/stream-thumbnail[\s\S]*client_max_body_size 7m/);

assert.equal(packageJson.scripts["verify:streamer-production-polish"], "node scripts/verify-streamer-production-polish.mjs");
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:streamer-production-polish"));

console.log("Streamer staging branding, pre-live metadata, moderation, layered health, summary, icon, crop, and thumbnail surfaces verified.");
