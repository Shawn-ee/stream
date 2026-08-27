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
      ...(options.method && options.method !== "GET"
        ? { "x-csrf-token": auth.csrf }
        : {}),
      ...(options.body ? { "content-type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const result = response.status === 204 ? null : await response.json();
  return { status: response.status, result };
}

await client.connect();
const audience = await login("demo-audience");
const streamer = await login("demo-streamer");
try {
  const ids = await client.query(
    "SELECT id,role FROM users WHERE handle IN ('demo-audience','demo-streamer')",
  );
  const audienceId = ids.rows.find((row) => row.role === "audience").id;
  const streamerId = ids.rows.find((row) => row.role === "streamer").id;
  await client.query("DELETE FROM notifications WHERE user_id IN ($1,$2)", [
    audienceId,
    streamerId,
  ]);
  await client.query(
    "DELETE FROM follows WHERE follower_id=$1 AND streamer_id=$2",
    [audienceId, streamerId],
  );

  assert.equal(
    (await call(`/api/streamers/${streamerId}/follow`, streamer, { method: "POST", body: {} })).status,
    403,
  );
  let followed = await call(`/api/streamers/${streamerId}/follow`, audience, {
    method: "POST",
    body: {},
  });
  assert.equal(followed.status, 200);
  assert.equal(followed.result.created, true);
  followed = await call(`/api/streamers/${streamerId}/follow`, audience, {
    method: "POST",
    body: {},
  });
  assert.equal(followed.result.created, false);
  assert.equal(
    (await call(`/api/streamers/${streamerId}/follow-status`, audience)).result.following,
    true,
  );
  assert.equal(
    (await call(`/api/streamers/${crypto.randomUUID()}/follow`, audience, { method: "POST", body: {} })).status,
    404,
  );

  let feed = (await call("/api/me/following", audience)).result.creators;
  assert.equal(feed.length, 1);
  assert.equal(feed[0].slug, "demo-streamer");

  assert.equal(
    (await call("/api/streamer/profile", streamer, {
      method: "PUT",
      body: { nextStreamAt: new Date(Date.now() + 86_400_000).toISOString(), scheduleTimezone: "Not/A_Timezone" },
    })).status,
    400,
  );
  const nextStreamAt = new Date(Date.now() + 3_600_000).toISOString();
  const schedule = await call("/api/streamer/profile", streamer, {
    method: "PUT",
    body: {
      scheduleText: "Retention verifier weekly schedule",
      nextStreamAt,
      scheduleTimezone: "America/Chicago",
    },
  });
  assert.equal(schedule.status, 200);
  assert.equal(schedule.result.profile.schedule_timezone, "America/Chicago");
  feed = (await call("/api/me/following", audience)).result.creators;
  assert.equal(feed[0].schedule_text, "Retention verifier weekly schedule");
  assert.ok(Math.abs(new Date(feed[0].next_stream_at).getTime() - new Date(nextStreamAt).getTime()) < 1_000);

  assert.equal(
    (await call("/api/streamer/rooms/demo-streamer/broadcast/local-status", streamer, {
      method: "PUT",
      body: { state: "live" },
    })).status,
    200,
  );
  await call("/api/streamer/rooms/demo-streamer/broadcast/local-status", streamer, {
    method: "PUT",
    body: { state: "live" },
  });
  let notifications = (await call("/api/me/notifications", audience)).result.notifications;
  assert.equal(notifications.filter((item) => item.kind === "creator_live").length, 1);
  const liveNotification = notifications.find((item) => item.kind === "creator_live");
  assert.equal(liveNotification.read_at, null);

  const foreignNotificationId = crypto.randomUUID();
  await client.query(
    "INSERT INTO notifications (id,user_id,kind,title,body) VALUES ($1,$2,'retention_test','Other user','Private to creator')",
    [foreignNotificationId, streamerId],
  );
  assert.equal(
    (await call(`/api/me/notifications/${foreignNotificationId}/read`, audience, { method: "PATCH", body: {} })).status,
    404,
  );
  assert.equal(
    (await call(`/api/me/notifications/${liveNotification.id}/read`, audience, { method: "PATCH", body: {} })).status,
    200,
  );

  await call("/api/streamer/rooms/demo-streamer/broadcast/local-status", streamer, {
    method: "PUT",
    body: { state: "offline" },
  });
  notifications = (await call("/api/me/notifications", audience)).result.notifications;
  assert.equal(notifications.filter((item) => item.kind === "creator_offline").length, 1);
  const readAll = await call("/api/me/notifications/read-all", audience, {
    method: "POST",
    body: {},
  });
  assert.ok(readAll.result.updated >= 1);
  notifications = (await call("/api/me/notifications", audience)).result.notifications;
  assert.equal(notifications.every((item) => item.read_at), true);

  assert.equal(
    (await call(`/api/streamers/${streamerId}/follow`, audience, { method: "DELETE" })).status,
    204,
  );
  assert.equal((await call("/api/me/following", audience)).result.creators.length, 0);
  await call("/api/streamer/rooms/demo-streamer/broadcast/local-status", streamer, {
    method: "PUT",
    body: { state: "live" },
  });
  notifications = (await call("/api/me/notifications", audience)).result.notifications;
  assert.equal(notifications.filter((item) => item.kind === "creator_live").length, 1);

  const duplicateKeys = await client.query(
    `SELECT notification_key,COUNT(*)::int AS count
     FROM notifications WHERE user_id=$1 AND notification_key IS NOT NULL
     GROUP BY notification_key HAVING COUNT(*)>1`,
    [audienceId],
  );
  assert.equal(duplicateKeys.rowCount, 0);
  const followNoticeCount = await client.query(
    "SELECT COUNT(*)::int AS count FROM notifications WHERE user_id=$1 AND kind='follow'",
    [audienceId],
  );
  assert.equal(followNoticeCount.rows[0].count, 0);

  console.log("Follow isolation/toggling, structured schedules, lifecycle notification dedupe, ownership, read state, and followed feed verified.");
} finally {
  await client.query(
    "DELETE FROM notifications WHERE user_id IN ((SELECT id FROM users WHERE handle='demo-audience'),(SELECT id FROM users WHERE handle='demo-streamer'))",
  );
  await client.query(
    "DELETE FROM follows WHERE follower_id=(SELECT id FROM users WHERE handle='demo-audience')",
  );
  await client.query(
    "UPDATE streamer_profiles SET schedule_text='Weekdays 8 PM Central · Test schedule',next_stream_at=NOW()+INTERVAL '1 day',schedule_timezone='America/Chicago' WHERE user_id=(SELECT id FROM users WHERE handle='demo-streamer')",
  );
  await client.end();
}
