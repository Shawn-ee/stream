import assert from "node:assert/strict";
import { Client } from "pg";
import sharp from "sharp";
import { config } from "../apps/api/src/config.ts";
import { removeStoredStreamThumbnail } from "../apps/api/src/stream-thumbnail-storage.ts";

const base = process.env.API_BASE_URL ?? "http://127.0.0.1:3001";
const password = process.env.LOCAL_DEMO_PASSWORD ?? "Local-demo-2026!";
const database = new Client({ connectionString: process.env.DATABASE_URL });
let storedUrl = null;
let previous = null;
let existingAuditIds = new Set();
let createdAuditIds = [];

function authState(response) {
  const pairs = response.headers.getSetCookie().map((item) => item.split(";")[0]);
  return {
    cookie: pairs.join("; "),
    csrf: pairs.find((item) => item.startsWith("stream_csrf="))?.slice("stream_csrf=".length),
  };
}

async function login(handle) {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ handle, password }),
  });
  assert.equal(response.status, 200);
  return authState(response);
}

async function upload(auth, image) {
  const form = new FormData();
  form.append("snapshot", new Blob([image], { type: "image/webp" }), "live-snapshot.webp");
  return fetch(`${base}/api/streamer/stream-thumbnail?slug=night-creator`, {
    method: "POST",
    headers: { cookie: auth.cookie, "x-csrf-token": auth.csrf },
    body: form,
  });
}

await database.connect();
try {
  const initial = await database.query(
    "SELECT id,stream_thumbnail_url,live_snapshot_captured_at,live_snapshot_source,broadcast_state,broadcast_status_source,publication_status FROM live_rooms WHERE slug='night-creator'",
  );
  previous = initial.rows[0];
  assert.ok(previous);
  const existingAudits = await database.query(
    "SELECT id FROM audit_events WHERE event_type='live_room_snapshot_updated' AND metadata->>'roomId'=$1::text",
    [previous.id],
  );
  existingAuditIds = new Set(existingAudits.rows.map((row) => row.id));
  const creator = await login("demo-night-creator");
  const audience = await login("demo-audience");
  const image = await sharp({
    create: { width: 640, height: 360, channels: 3, background: "#6c4df6" },
  }).webp({ quality: 68 }).toBuffer();

  assert.equal((await upload(audience, image)).status, 403, "audiences cannot write live snapshots");
  assert.equal((await upload(creator, image)).status, 409, "offline/local rooms cannot accept snapshots");

  await database.query(
    "UPDATE live_rooms SET publication_status='published',broadcast_state='live',broadcast_status_source='cloudflare',live_snapshot_captured_at=NULL,live_snapshot_source=NULL,stream_thumbnail_url=NULL WHERE id=$1",
    [previous.id],
  );
  const accepted = await upload(creator, image);
  assert.equal(accepted.status, 201);
  assert.deepEqual(await accepted.json(), { captured: true });

  const saved = await database.query(
    "SELECT stream_thumbnail_url,live_snapshot_captured_at,live_snapshot_source FROM live_rooms WHERE id=$1",
    [previous.id],
  );
  storedUrl = saved.rows[0].stream_thumbnail_url;
  assert.match(storedUrl, /^\/api\/media\/stream-thumbnails\/stream-thumbnail-/);
  assert.ok(saved.rows[0].live_snapshot_captured_at);
  assert.equal(saved.rows[0].live_snapshot_source, "BROWSER");
  const audit = await database.query(
    "SELECT id FROM audit_events WHERE event_type='live_room_snapshot_updated' AND actor_id=(SELECT streamer_id FROM live_rooms WHERE id=$1) AND metadata->>'roomId'=$1::text",
    [previous.id],
  );
  createdAuditIds = audit.rows.map((row) => row.id).filter((id) => !existingAuditIds.has(id));
  assert.equal(createdAuditIds.length, 1);

  const discovery = await fetch(`${base}/api/rooms?live=true`);
  const liveRoom = (await discovery.json()).rooms.find((room) => room.slug === "night-creator");
  assert.equal(liveRoom.stream_thumbnail_url, storedUrl, "genuine live discovery exposes the static snapshot");
  assert.equal((await upload(creator, image)).status, 429, "room update floor must reject rapid replacement");

  await database.query("UPDATE live_rooms SET broadcast_state='offline' WHERE id=$1", [previous.id]);
  const offlineDiscovery = await fetch(`${base}/api/rooms`);
  const offlineRoom = (await offlineDiscovery.json()).rooms.find((room) => room.slug === "night-creator");
  assert.equal(offlineRoom.stream_thumbnail_url, null, "offline discovery must not expose a stale live frame");
} finally {
  if (previous) {
    await database.query(
      "UPDATE live_rooms SET stream_thumbnail_url=$1,live_snapshot_captured_at=$2,live_snapshot_source=$3,broadcast_state=$4,broadcast_status_source=$5,publication_status=$6 WHERE id=$7",
      [previous.stream_thumbnail_url, previous.live_snapshot_captured_at, previous.live_snapshot_source, previous.broadcast_state, previous.broadcast_status_source, previous.publication_status, previous.id],
    );
    if (createdAuditIds.length)
      await database.query("DELETE FROM audit_events WHERE id=ANY($1::uuid[])", [createdAuditIds]);
  }
  await database.end();
  if (storedUrl) await removeStoredStreamThumbnail(config.avatarStoragePath, storedUrl);
}

console.log("Live snapshot role, ownership/live-state, audit, throttle, public projection, and offline hiding verified.");
