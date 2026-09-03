import assert from "node:assert/strict";
import { io } from "socket.io-client";
import { Client } from "pg";

const base = "http://127.0.0.1:3001";
async function login(role) {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      handle: `demo-${role}`,
      password: process.env.LOCAL_DEMO_PASSWORD ?? "Local-demo-2026!",
    }),
  });
  assert.equal(response.status, 200);
  const pairs = response.headers
    .getSetCookie()
    .map((item) => item.split(";")[0]);
  const cookie = pairs.join("; ");
  const csrf = pairs
    .find((item) => item.startsWith("stream_csrf="))
    ?.slice("stream_csrf=".length);
  assert.ok(cookie, "expected test session cookie");
  assert.ok(csrf, "expected CSRF token cookie");
  return { cookie, csrf };
}
function connect(cookie) {
  return new Promise((resolve, reject) => {
    const socket = io(base, {
      transports: ["websocket"],
      extraHeaders: { cookie },
    });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });
}
async function verifyAnonymousReadOnlySocket() {
  const socket = io(base, {
    transports: ["websocket"],
    auth: { demoRole: "admin" },
  });
  await new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
  const room = await joined(socket);
  assert.equal(room.error, undefined);
  assert.deepEqual(await sendWithResult(socket, "Anonymous mutation attempt"), {
    error: "session_required",
  });
  socket.disconnect();
}
function joined(socket) {
  return new Promise((resolve) =>
    socket.emit("room:join", "demo-streamer", resolve),
  );
}
async function creatorModeration(auth, action) {
  const response = await fetch(
    `${base}/api/streamer/rooms/demo-streamer/moderation`,
    {
      method: "POST",
      headers: {
        cookie: auth.cookie,
        "content-type": "application/json",
        "x-csrf-token": auth.csrf,
      },
      body: JSON.stringify({
        targetId: "10000000-0000-4000-8000-000000000001",
        action,
      }),
    },
  );
  assert.equal(response.status, 200);
}
async function creatorBroadcast(auth, state) {
  const response = await fetch(
    `${base}/api/streamer/rooms/demo-streamer/broadcast/local-status`,
    {
      method: "PUT",
      headers: {
        cookie: auth.cookie,
        "content-type": "application/json",
        "x-csrf-token": auth.csrf,
      },
      body: JSON.stringify({ state }),
    },
  );
  assert.equal(response.status, 200);
}
function sendWithResult(socket, body) {
  return new Promise((resolve) =>
    socket.emit("chat:send", { roomSlug: "demo-streamer", body }, resolve),
  );
}

const audienceAuth = await login("audience");
const streamerCookie = await login("streamer");
const database = new Client({ connectionString: process.env.DATABASE_URL });
await database.connect();
await database.query("UPDATE live_rooms SET status='live',broadcast_state='live',broadcast_status_source='cloudflare' WHERE slug='demo-streamer'");
await verifyAnonymousReadOnlySocket();
const audienceCookie = audienceAuth.cookie;
const audience = await connect(audienceCookie);
const adminAuth = await login("admin");
const admin = await connect(adminAuth.cookie);
try {
  const first = await joined(audience);
  const discoveryJoined = await new Promise((resolve) =>
    audience.emit("discovery:join", resolve),
  );
  assert.deepEqual(discoveryJoined, { joined: true });
  const second = await joined(admin);
  assert.ok(
    first.count >= 1,
    "expected the audience to appear in room presence",
  );
  assert.equal(
    second.count,
    first.count + 1,
    "expected the admin join to increment room presence",
  );
  const received = new Promise((resolve) =>
    audience.once("chat:message", resolve),
  );
  admin.emit("chat:send", {
    roomSlug: "demo-streamer",
    body: "Realtime test message",
  });
  const message = await received;
  assert.equal(message.body, "Realtime test message");
  assert.equal(message.sender.role, "admin");
  const creatorSocketAuth = await login("streamer");
  const creatorSocket = await connect(creatorSocketAuth.cookie);
  await joined(creatorSocket);
  const creatorMessage = new Promise((resolve) =>
    audience.once("chat:message", resolve),
  );
  creatorSocket.emit("chat:send", {
    roomSlug: "demo-streamer",
    body: "Creator realtime test message",
  });
  assert.equal((await creatorMessage).sender.role, "streamer");
  creatorSocket.disconnect();
  const historyResponse = await fetch(
    `${base}/api/rooms/demo-streamer/chat-history`,
    { headers: { cookie: audienceCookie } },
  );
  assert.equal(historyResponse.status, 200);
  const history = await historyResponse.json();
  assert.ok(
    history.messages.some(
      (item) => item.id === message.id && item.body === "Realtime test message",
    ),
  );
  const gifts = await fetch(`${base}/api/gifts`).then((response) =>
    response.json(),
  );
  const giftReceived = new Promise((resolve) =>
    admin.once("gift:sent", resolve),
  );
  const giftResponse = await fetch(`${base}/api/rooms/demo-streamer/gifts`, {
    method: "POST",
    headers: {
      cookie: audienceCookie,
      "content-type": "application/json",
      "x-csrf-token": audienceAuth.csrf,
    },
    body: JSON.stringify({
      giftId: gifts.gifts[0].id,
      idempotencyKey: crypto.randomUUID(),
    }),
  });
  assert.equal(giftResponse.status, 200);
  const giftEvent = await giftReceived;
  assert.equal(giftEvent.cost, gifts.gifts[0].coin_cost);
  assert.equal(giftEvent.quantity, 1);
  assert.equal(giftEvent.symbol, gifts.gifts[0].symbol);
  assert.equal(giftEvent.animationTier, gifts.gifts[0].animation_tier);
  assert.equal(giftEvent.idempotencyKey, undefined);
  assert.equal(giftEvent.recipientId, undefined);
  const actions = await fetch(`${base}/api/rooms/demo-streamer/actions`).then(
    (response) => response.json(),
  );
  const actionReceived = new Promise((resolve) =>
    admin.once("action:purchased", resolve),
  );
  const actionResponse = await fetch(
    `${base}/api/rooms/demo-streamer/actions/${actions.actions[0].id}/purchase`,
    {
      method: "POST",
      headers: {
        cookie: audienceCookie,
        "content-type": "application/json",
        "x-csrf-token": audienceAuth.csrf,
      },
      body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
    },
  );
  assert.equal(actionResponse.status, 200);
  assert.equal((await actionReceived).title, actions.actions[0].title);
  const broadcastReceived = new Promise((resolve) =>
    audience.once("broadcast:state", resolve),
  );
  const discoveryReceived = new Promise((resolve) =>
    audience.once("discovery:broadcast", resolve),
  );
  await creatorBroadcast(streamerCookie, "connecting");
  const broadcast = await broadcastReceived;
  assert.equal(broadcast.state, "connecting");
  const discoveryBroadcast = await discoveryReceived;
  assert.equal(discoveryBroadcast.slug, "demo-streamer");
  assert.equal(discoveryBroadcast.state, "connecting");
  await database.query("UPDATE live_rooms SET status='live',broadcast_state='live',broadcast_status_source='cloudflare' WHERE slug='demo-streamer'");
  await creatorModeration(streamerCookie, "mute");
  assert.deepEqual(await sendWithResult(audience, "Muted message"), {
    error: "muted",
  });
  await creatorModeration(streamerCookie, "unmute");
  console.log(
    "Realtime presence, chat, support activity, and broadcast lifecycle updates verified.",
  );
} finally {
  await database.query("UPDATE live_rooms SET status='offline',broadcast_state='offline',broadcast_status_source='local' WHERE slug='demo-streamer'");
  await database.end();
  audience.disconnect();
  admin.disconnect();
}
