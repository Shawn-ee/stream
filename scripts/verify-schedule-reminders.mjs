import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Client } from "pg";

const base = process.env.API_BASE_URL ?? "http://127.0.0.1:3001";
const password = process.env.LOCAL_DEMO_PASSWORD ?? "Local-demo-2026!";
const client = new Client({ connectionString: process.env.DATABASE_URL });

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

async function call(path, auth, options = {}) {
  const response = await fetch(`${base}${path}`, {
    method: options.method ?? "GET",
    headers: {
      cookie: auth.cookie,
      ...(options.method && options.method !== "GET" ? { "x-csrf-token": auth.csrf } : {}),
      ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return {
    status: response.status,
    result: response.status === 204 ? null : await response.json(),
  };
}

await client.connect();
const audience = await login("demo-audience");
const streamer = await login("demo-streamer");
const ids = await client.query(
  "SELECT id,role FROM users WHERE handle IN ('demo-audience','demo-streamer')",
);
const audienceId = ids.rows.find((row) => row.role === "audience").id;
const streamerId = ids.rows.find((row) => row.role === "streamer").id;

try {
  await client.query("DELETE FROM notifications WHERE user_id=$1", [audienceId]);
  await client.query("DELETE FROM follows WHERE follower_id=$1 AND streamer_id=$2", [audienceId, streamerId]);

  assert.equal((await call(`/api/streamers/${streamerId}/follow`, audience, { method: "POST", body: {} })).status, 200);
  let following = (await call("/api/me/following", audience)).result.creators;
  assert.equal(following[0].reminder_enabled, true);

  assert.equal((await call(`/api/streamers/${streamerId}/reminder`, streamer, { method: "PATCH", body: { enabled: false } })).status, 404);
  assert.equal((await call(`/api/streamers/${streamerId}/reminder`, audience, { method: "PATCH", body: { enabled: "no" } })).status, 400);
  assert.equal((await call(`/api/streamers/${crypto.randomUUID()}/reminder`, audience, { method: "PATCH", body: { enabled: true } })).status, 404);

  assert.equal((await call(`/api/streamers/${streamerId}/reminder`, audience, { method: "PATCH", body: { enabled: false } })).result.enabled, false);
  await call("/api/streamer/profile", streamer, {
    method: "PUT",
    body: { nextStreamAt: new Date(Date.now() + 2 * 60 * 60_000).toISOString(), scheduleTimezone: "America/Chicago" },
  });
  let notifications = (await call("/api/me/notifications", audience)).result.notifications;
  assert.equal(notifications.filter((item) => item.kind === "schedule_updated").length, 0);

  assert.equal((await call(`/api/streamers/${streamerId}/reminder`, audience, { method: "PATCH", body: { enabled: true } })).result.enabled, true);
  const threeHours = new Date(Date.now() + 3 * 60 * 60_000).toISOString();
  await call("/api/streamer/profile", streamer, {
    method: "PUT",
    body: { nextStreamAt: threeHours, scheduleTimezone: "America/Chicago" },
  });
  await call("/api/streamer/profile", streamer, {
    method: "PUT",
    body: { nextStreamAt: threeHours, scheduleTimezone: "America/Chicago" },
  });
  notifications = (await call("/api/me/notifications", audience)).result.notifications;
  assert.equal(notifications.filter((item) => item.kind === "schedule_updated").length, 1);

  await call("/api/streamer/profile", streamer, {
    method: "PUT",
    body: { nextStreamAt: new Date(Date.now() + 30 * 60_000).toISOString(), scheduleTimezone: "America/Chicago" },
  });
  notifications = (await call("/api/me/notifications", audience)).result.notifications;
  notifications = (await call("/api/me/notifications", audience)).result.notifications;
  const due = notifications.filter((item) => item.kind === "schedule_reminder");
  assert.equal(due.length, 1);
  assert.equal(due[0].room_slug, "demo-streamer");
  assert.equal("notification_key" in due[0], false);
  assert.equal(JSON.stringify(due[0]).includes("cloudflare"), false);

  const duplicates = await client.query(
    "SELECT notification_key,COUNT(*)::int AS count FROM notifications WHERE user_id=$1 AND notification_key IS NOT NULL GROUP BY notification_key HAVING COUNT(*)>1",
    [audienceId],
  );
  assert.equal(duplicates.rowCount, 0);

  await call(`/api/streamers/${streamerId}/reminder`, audience, { method: "PATCH", body: { enabled: false } });
  notifications = (await call("/api/me/notifications", audience)).result.notifications;
  assert.equal(notifications.filter((item) => ["schedule_updated", "schedule_reminder"].includes(item.kind) && !item.read_at).length, 0);
  following = (await call("/api/me/following", audience)).result.creators;
  assert.equal(following[0].reminder_enabled, false);

  console.log("Follow-owned reminder preferences, schedule updates, due delivery, room links, deduplication, and opt-out cleanup verified.");
} finally {
  await client.query("DELETE FROM notifications WHERE user_id=$1", [audienceId]);
  await client.query("DELETE FROM follows WHERE follower_id=$1 AND streamer_id=$2", [audienceId, streamerId]);
  await client.query(
    "UPDATE streamer_profiles SET schedule_text='Weekdays 8 PM Central · Test schedule',next_stream_at=NOW()+INTERVAL '1 day',schedule_timezone='America/Chicago' WHERE user_id=$1",
    [streamerId],
  );
  await client.end();
}
