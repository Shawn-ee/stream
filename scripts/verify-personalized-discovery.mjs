import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Client } from "pg";

const base = process.env.API_BASE_URL ?? "http://127.0.0.1:3001";
const password = process.env.LOCAL_DEMO_PASSWORD ?? "Local-demo-2026!";
const client = new Client({ connectionString: process.env.DATABASE_URL });

function authState(response) {
  const pairs = response.headers.getSetCookie().map((item) => item.split(";")[0]);
  return { cookie: pairs.join("; "), csrf: pairs.find((item) => item.startsWith("stream_csrf="))?.slice(12) };
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

async function call(path, auth, options = {}) {
  const response = await fetch(`${base}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(auth ? { cookie: auth.cookie } : {}),
      ...(auth && options.method && options.method !== "GET" ? { "x-csrf-token": auth.csrf } : {}),
      ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return { status: response.status, result: await response.json() };
}

await client.connect();
const audience = await login("demo-audience");
const streamer = await login("demo-streamer");
const admin = await login("demo-admin");
const users = await client.query("SELECT id,handle FROM users WHERE handle IN ('demo-audience','demo-streamer')");
const audienceId = users.rows.find((row) => row.handle === "demo-audience").id;
const streamerId = users.rows.find((row) => row.handle === "demo-streamer").id;
const states = await client.query("SELECT id,status,broadcast_state FROM live_rooms");

try {
  await client.query("DELETE FROM audience_discovery_preferences WHERE user_id=$1", [audienceId]);
  await client.query("DELETE FROM room_visits WHERE user_id=$1", [audienceId]);
  await client.query("DELETE FROM follows WHERE follower_id=$1", [audienceId]);
  await client.query("UPDATE live_rooms SET status='offline',broadcast_state='offline'");

  assert.equal((await call("/api/me/discovery-preferences", null)).status, 401);
  assert.equal((await call("/api/me/discovery-preferences", streamer)).status, 200);
  assert.equal((await call("/api/me/discovery-preferences", admin)).status, 403);

  const defaults = await call("/api/me/discovery-preferences", audience);
  assert.equal(defaults.status, 200);
  assert.deepEqual(defaults.result.preferences.preferred_languages, []);
  assert.deepEqual(defaults.result.preferences.preferred_tag_slugs, []);
  assert.equal(defaults.result.preferences.personalization_enabled, true);

  const invalidLanguage = await call("/api/me/discovery-preferences", audience, {
    method: "PUT",
    body: { preferredLanguages: ["xx"], preferredTags: [], prioritizeLive: true, prioritizeFollowing: true, personalizationEnabled: true },
  });
  assert.equal(invalidLanguage.status, 400);
  const invalidTag = await call("/api/me/discovery-preferences", audience, {
    method: "PUT",
    body: { preferredLanguages: [], preferredTags: ["not-a-real-tag"], prioritizeLive: true, prioritizeFollowing: true, personalizationEnabled: true },
  });
  assert.equal(invalidTag.status, 400);

  const saved = await call("/api/me/discovery-preferences", audience, {
    method: "PUT",
    body: { preferredLanguages: ["zh"], preferredTags: ["music"], prioritizeLive: true, prioritizeFollowing: false, personalizationEnabled: true },
  });
  assert.equal(saved.status, 200);
  let rooms = (await call("/api/rooms", audience)).result.rooms;
  assert.equal(rooms[0].slug, "jade-creator");
  assert.ok(rooms[0].recommendation_reasons.includes("preferred_language"));
  assert.ok(rooms[0].recommendation_reasons.includes("preferred_tag"));
  assert.equal(rooms[0].personalization_applied, true);

  const alex = await client.query("SELECT id FROM live_rooms WHERE slug='alex-creator'");
  for (let index = 0; index < 3; index += 1) {
    await client.query("INSERT INTO room_visits (id,room_id,user_id,visited_at) VALUES ($1,$2,$3,NOW()-($4::int*INTERVAL '2 hours'))", [crypto.randomUUID(), alex.rows[0].id, audienceId, index + 1]);
  }
  rooms = (await call("/api/rooms", audience)).result.rooms;
  const recentlyWatched = rooms.find((room) => room.slug === "alex-creator");
  assert.ok(recentlyWatched.recommendation_reasons.includes("recently_watched"));
  assert.equal("recent_visit_count" in recentlyWatched, false);
  assert.equal("last_visited_at" in recentlyWatched, false);

  await client.query("INSERT INTO follows (follower_id,streamer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [audienceId, streamerId]);
  await call("/api/me/discovery-preferences", audience, {
    method: "PUT",
    body: { preferredLanguages: [], preferredTags: [], prioritizeLive: false, prioritizeFollowing: true, personalizationEnabled: true },
  });
  rooms = (await call("/api/rooms", audience)).result.rooms;
  assert.equal(rooms[0].slug, "demo-streamer");
  assert.ok(rooms[0].recommendation_reasons.includes("following"));
  const repeated = (await call("/api/rooms", audience)).result.rooms.map((room) => room.slug);
  assert.deepEqual(repeated, rooms.map((room) => room.slug));

  await call("/api/me/discovery-preferences", audience, {
    method: "PUT",
    body: { preferredLanguages: ["zh"], preferredTags: ["music"], prioritizeLive: true, prioritizeFollowing: true, personalizationEnabled: false },
  });
  const unpersonalized = (await call("/api/rooms", audience)).result.rooms;
  const anonymous = (await call("/api/rooms", null)).result.rooms;
  assert.deepEqual(unpersonalized.map((room) => room.slug), anonymous.map((room) => room.slug));
  assert.ok(unpersonalized.every((room) => room.personalization_applied === false && room.recommendation_reasons.length === 0));

  const reset = await call("/api/me/discovery-preferences", audience, { method: "DELETE" });
  assert.equal(reset.status, 200);
  assert.deepEqual(reset.result.preferences.preferred_languages, []);
  assert.equal(reset.result.preferences.personalization_enabled, true);
  console.log("Audience-owned preferences, validation, explainable deterministic ordering, bounded visit signals, opt-out, privacy, and reset verified.");
} finally {
  await client.query("DELETE FROM audience_discovery_preferences WHERE user_id=$1", [audienceId]);
  await client.query("DELETE FROM room_visits WHERE user_id=$1", [audienceId]);
  await client.query("DELETE FROM follows WHERE follower_id=$1", [audienceId]);
  for (const room of states.rows) {
    await client.query("UPDATE live_rooms SET status=$2,broadcast_state=$3 WHERE id=$1", [room.id, room.status, room.broadcast_state]);
  }
  await client.end();
}
