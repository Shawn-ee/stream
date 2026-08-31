import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { io } from "socket.io-client";

const base = process.env.API_BASE_URL ?? "http://127.0.0.1:3001";

async function json(pathname, options) {
  const response = await fetch(`${base}${pathname}`, options);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

const session = await json("/api/auth/session");
assert.equal(session.response.status, 200);
assert.equal(session.body.user, null);

const rooms = await json("/api/rooms");
assert.equal(rooms.response.status, 200);
assert.ok(rooms.body.rooms.length >= 6);
const roomSummary = rooms.body.rooms.find((room) => room.slug === "demo-streamer");
assert.ok(roomSummary);

const room = await json("/api/rooms/demo-streamer");
assert.equal(room.response.status, 200);
assert.equal("cloudflare_live_input_id" in room.body.room, false);

const profile = await json(`/api/streamers/${room.body.room.streamer_id}`);
assert.equal(profile.response.status, 200);

for (const pathname of [
  "/api/rooms/demo-streamer/chat-history",
  "/api/rooms/demo-streamer/support-feed",
  "/api/rooms/demo-streamer/private-show",
  "/api/rooms/demo-streamer/actions",
  "/api/gifts",
]) {
  const result = await json(pathname);
  assert.equal(result.response.status, 200, `expected public read for ${pathname}`);
}

const history = await json("/api/rooms/demo-streamer/chat-history");
assert.ok(
  history.body.messages.every((message) => !("id" in message.sender)),
  "anonymous chat history must not expose internal sender ids",
);

const playback = await json("/api/rooms/demo-streamer/playback");
assert.notEqual(playback.response.status, 401);
assert.ok([200, 409, 503].includes(playback.response.status));

for (const pathname of [
  "/api/wallet",
  "/api/wallet/history",
  "/api/me/following",
  "/api/streamer/studio",
  `/api/streamers/${room.body.room.streamer_id}/follow-status`,
]) {
  const result = await json(pathname);
  assert.equal(result.response.status, 401, `expected protected read for ${pathname}`);
}

const gifts = await json("/api/gifts");
const actions = await json("/api/rooms/demo-streamer/actions");
const protectedMutations = [
  [`/api/streamers/${room.body.room.streamer_id}/follow`, {}],
  ["/api/rooms/demo-streamer/reports", { reason: "test" }],
  ["/api/rooms/demo-streamer/gifts", {
    giftId: gifts.body.gifts[0].id,
    quantity: 1,
    idempotencyKey: crypto.randomUUID(),
  }],
  [`/api/rooms/demo-streamer/actions/${actions.body.actions[0].id}/purchase`, {
    idempotencyKey: crypto.randomUUID(),
  }],
];
for (const [pathname, body] of protectedMutations) {
  const result = await json(pathname, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(result.response.status, 401, `expected interaction gate for ${pathname}`);
}

const socket = io(base, { transports: ["websocket"] });
await new Promise((resolve, reject) => {
  socket.once("connect", resolve);
  socket.once("connect_error", reject);
});
try {
  const joined = await new Promise((resolve) =>
    socket.emit("room:join", "demo-streamer", resolve),
  );
  assert.equal(joined.error, undefined);
  const sent = await new Promise((resolve) =>
    socket.emit("chat:send", { roomSlug: "demo-streamer", body: "guest mutation" }, resolve),
  );
  assert.deepEqual(sent, { error: "session_required" });
} finally {
  socket.disconnect();
}

const source = fs.readFileSync(path.join(process.cwd(), "apps/web/src/main.tsx"), "utf8");
assert.match(source, /const publicGuest =/);
assert.match(source, /authenticated=\{!isGuest\}/);
assert.match(source, /Watching and discovery are public/);
assert.match(source, /onRequireAuth\("chat"\)/);

console.log("Public discovery, safe anonymous reads, interaction gates, and read-only guest realtime verified.");
