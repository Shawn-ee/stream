import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const base = process.env.API_BASE_URL ?? "http://127.0.0.1:3001";
const password = process.env.LOCAL_DEMO_PASSWORD ?? "Local-demo-2026!";

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ handle: "demo-audience", password }),
});
assert.equal(login.status, 200);
const cookieParts = login.headers.getSetCookie().map((item) => item.split(";")[0]);
const cookie = cookieParts.join("; ");
const csrf = cookieParts.find((item) => item.startsWith("stream_csrf="))?.slice("stream_csrf=".length);
assert.ok(csrf);

const roomsResponse = await fetch(`${base}/api/rooms`, { headers: { cookie } });
assert.equal(roomsResponse.status, 200);
const rooms = (await roomsResponse.json()).rooms;
assert.ok(rooms.length >= 6, "expected a useful multi-creator discovery feed");
assert.ok(rooms.filter((room) => room.stream_language === "en").length >= 3);
assert.ok(rooms.filter((room) => room.stream_language === "zh").length >= 2);
assert.ok(rooms.every((room) => typeof room.recommendation_score === "number"));

const gifts = await fetch(`${base}/api/gifts`).then((response) => response.json());
const offlineGift = await fetch(`${base}/api/rooms/demo-streamer/gifts`, {
  method: "POST",
  headers: { cookie, "x-csrf-token": csrf, "content-type": "application/json" },
  body: JSON.stringify({ giftId: gifts.gifts[0].id, quantity: 1, idempotencyKey: crypto.randomUUID() }),
});
assert.equal(offlineGift.status, 409);
assert.equal((await offlineGift.json()).error, "broadcast_not_live");

const actions = await fetch(`${base}/api/rooms/demo-streamer/actions`).then((response) => response.json());
const offlineAction = await fetch(`${base}/api/rooms/demo-streamer/actions/${actions.actions[0].id}/purchase`, {
  method: "POST",
  headers: { cookie, "x-csrf-token": csrf, "content-type": "application/json" },
  body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
});
assert.equal(offlineAction.status, 409);
assert.equal((await offlineAction.json()).error, "broadcast_not_live");

const discovery = fs.readFileSync(path.join(root, "apps/web/src/components/discovery.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "apps/web/src/discovery.css"), "utf8");
const room = fs.readFileSync(path.join(root, "apps/web/src/main.tsx"), "utf8");
assert.match(discovery, /mobile-live-card-overlay/);
assert.match(discovery, /View creator/);
assert.match(css, /scroll-snap-stop:\s*always/);
assert.match(css, /linear-gradient\(180deg, transparent/);
assert.match(room, /const supportAvailable = broadcast\.state === "live"/);
assert.match(room, /View profile & schedule/);

console.log("Audience feed density, bilingual creator variety, immersive mobile cards, and offline support guards verified.");
