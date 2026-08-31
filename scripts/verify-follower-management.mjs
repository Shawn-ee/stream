import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { io } from "socket.io-client";

const base = process.env.API_BASE_URL ?? "http://127.0.0.1:3001";
const password = process.env.LOCAL_DEMO_PASSWORD ?? "Local-demo-2026!";
const client = new Client({ connectionString: process.env.DATABASE_URL });
const temporaryHandles = [];

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
      ...(options.body ? { "content-type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const result = response.status === 204 ? null : await response.json();
  return { status: response.status, result };
}

function connect(auth) {
  return new Promise((resolve, reject) => {
    const socket = io(base, { transports: ["websocket"], extraHeaders: { cookie: auth.cookie } });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });
}

function joinDiscovery(socket) {
  return new Promise((resolve) => socket.emit("discovery:join", resolve));
}

await client.connect();
const temporaryHandle = `follower_test_${crypto.randomUUID().slice(0, 6)}`;
temporaryHandles.push(temporaryHandle);
await client.query(
  "INSERT INTO users (id,handle,display_name,role,locale,test_age_acknowledged_at,password_hash,password_salt) SELECT $1,$2,'Follower 1','audience','en',NOW(),password_hash,password_salt FROM users WHERE handle='demo-audience'",
  [crypto.randomUUID(), temporaryHandle],
);
const audience = await login("demo-audience");
const streamer = await login("demo-streamer");
const admin = await login("demo-admin");
const secondAudience = await login(temporaryHandle);
const audienceSocket = await connect(audience);
const streamerSocket = await connect(streamer);
await joinDiscovery(streamerSocket);
try {
  const ids = await client.query(
    "SELECT id,handle FROM users WHERE handle IN ('demo-audience','demo-streamer')",
  );
  const audienceId = ids.rows.find((row) => row.handle === "demo-audience").id;
  const streamerId = ids.rows.find((row) => row.handle === "demo-streamer").id;
  await client.query("DELETE FROM follows WHERE streamer_id=$1", [streamerId]);

  const creatorEvent = new Promise((resolve) => streamerSocket.once("follow:changed", resolve));
  const viewerEvent = new Promise((resolve) => audienceSocket.once("follow:state", resolve));
  const firstFollow = await call(`/api/streamers/${streamerId}/follow`, audience, {
    method: "POST",
    body: {},
  });
  assert.equal(firstFollow.status, 200);
  assert.equal(firstFollow.result.created, true);
  assert.equal(firstFollow.result.followerCount, 1);
  assert.deepEqual(await creatorEvent, {
    streamerId,
    slug: "demo-streamer",
    followerCount: 1,
  });
  assert.deepEqual(await viewerEvent, {
    streamerId,
    slug: "demo-streamer",
    followerCount: 1,
    following: true,
  });

  const duplicate = await call(`/api/streamers/${streamerId}/follow`, audience, {
    method: "POST",
    body: {},
  });
  assert.equal(duplicate.result.created, false);
  assert.equal(duplicate.result.followerCount, 1);

  const secondFollow = await call(`/api/streamers/${streamerId}/follow`, secondAudience, {
    method: "POST",
    body: {},
  });
  assert.equal(secondFollow.result.created, true);
  assert.equal(secondFollow.result.followerCount, 2);

  assert.equal((await call("/api/streamer/rooms/demo-streamer/followers", audience)).status, 403);
  assert.equal((await call("/api/streamer/rooms/demo-streamer/followers", admin)).status, 403);
  assert.equal((await call("/api/streamer/rooms/night-creator/followers", streamer)).status, 404);
  assert.equal((await call("/api/streamer/rooms/demo-streamer/followers?limit=0", streamer)).status, 400);
  assert.equal((await call("/api/streamer/rooms/demo-streamer/followers?cursor=invalid", streamer)).status, 400);

  const firstPage = await call("/api/streamer/rooms/demo-streamer/followers?limit=1", streamer);
  assert.equal(firstPage.status, 200);
  assert.equal(firstPage.result.totalCount, 2);
  assert.equal(firstPage.result.followers.length, 1);
  assert.ok(firstPage.result.nextCursor);
  assert.deepEqual(Object.keys(firstPage.result.followers[0]).sort(), [
    "displayName",
    "followedAt",
    "handle",
    "id",
    "status",
  ]);
  assert.equal(firstPage.result.followers[0].status, "following");
  const secondPage = await call(
    `/api/streamer/rooms/demo-streamer/followers?limit=1&cursor=${encodeURIComponent(firstPage.result.nextCursor)}`,
    streamer,
  );
  assert.equal(secondPage.result.totalCount, 2);
  assert.equal(secondPage.result.followers.length, 1);
  assert.notEqual(secondPage.result.followers[0].id, firstPage.result.followers[0].id);
  assert.equal(secondPage.result.nextCursor, null);

  const unfollowCreatorEvent = new Promise((resolve) => streamerSocket.once("follow:changed", resolve));
  const unfollowViewerEvent = new Promise((resolve) => audienceSocket.once("follow:state", resolve));
  assert.equal((await call(`/api/streamers/${streamerId}/follow`, audience, { method: "DELETE" })).status, 204);
  assert.equal((await unfollowCreatorEvent).followerCount, 1);
  assert.equal((await unfollowViewerEvent).following, false);
  const remaining = await call("/api/streamer/rooms/demo-streamer/followers", streamer);
  assert.equal(remaining.result.totalCount, 1);
  assert.equal(remaining.result.followers.some((item) => item.id === audienceId), false);

  const [app, migration, packageText] = await Promise.all([
    readFile("apps/web/src/main.tsx", "utf8"),
    readFile("apps/api/src/db/migrations/019_follower_management.sql", "utf8"),
    readFile("package.json", "utf8"),
  ]);
  for (const text of ["CreatorFollowersPage", "Audience retention", "Followed", "关注时间", "Followers temporarily unavailable"])
    assert.match(app, new RegExp(text), `missing follower UI text: ${text}`);
  assert.match(app, /socket\.on\(\s*"follow:state"/);
  assert.match(app, /socket\.on\(\s*"follow:changed"/);
  assert.match(migration, /follows_streamer_created_idx/);
  const packageJson = JSON.parse(packageText);
  assert.equal(packageJson.scripts["verify:follower-management"], "node --env-file=.env scripts/verify-follower-management.mjs");
  assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:follower-management"));

  console.log("Follower ownership, safe pagination, realtime counts/state, creator UI, and cleanup verified.");
} finally {
  audienceSocket.disconnect();
  streamerSocket.disconnect();
  await client.query("DELETE FROM follows WHERE streamer_id=(SELECT id FROM users WHERE handle='demo-streamer')");
  if (temporaryHandles.length)
    await client.query("DELETE FROM users WHERE handle=ANY($1::text[])", [temporaryHandles]);
  await client.end();
}
