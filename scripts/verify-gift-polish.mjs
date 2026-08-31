import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Client } from "pg";
import { io } from "socket.io-client";

const base = process.env.API_BASE_URL ?? "http://127.0.0.1:3001";
const password = process.env.LOCAL_DEMO_PASSWORD ?? "Local-demo-2026!";
const prefix = `gift-polish-${Date.now().toString(36)}`;
const keys = [`${prefix}-1`, `${prefix}-2`];
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
async function mutate(path, auth, body) {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      cookie: auth.cookie,
      "x-csrf-token": auth.csrf,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
function connect(cookie) {
  return new Promise((resolve, reject) => {
    const socket = io(base, { transports: ["websocket"], extraHeaders: { cookie } });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });
}
function nextEvent(socket, event) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} timeout`)), 3_000);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

await client.connect();
const audience = await login("demo-audience");
const creator = await login("demo-streamer");
const otherCreator = await login("demo-night-creator");
const socket = await connect(audience.cookie);
const joined = await new Promise((resolve) =>
  socket.emit("room:join", "demo-streamer", resolve),
);
assert.equal(joined.error, undefined);
const originalGoal = await client.query(
  "SELECT goal_progress,broadcast_state FROM live_rooms WHERE slug='demo-streamer'",
);
try {
  await client.query("UPDATE live_rooms SET status='live',broadcast_state='live' WHERE slug='demo-streamer'");
  const catalogResponse = await fetch(`${base}/api/gifts`);
  assert.equal(catalogResponse.status, 200);
  const catalog = (await catalogResponse.json()).gifts;
  const spark = catalog.find((gift) => gift.coin_cost === 1);
  const premium = catalog.find((gift) => gift.animation_tier === "premium");
  assert.ok(spark && premium, "expected small and premium gift tiers");

  const firstRealtime = nextEvent(socket, "gift:sent");
  let sent = await mutate(`/api/rooms/demo-streamer/gifts`, audience, {
    giftId: spark.id,
    quantity: 1,
    idempotencyKey: keys[0],
  });
  assert.equal(sent.status, 200);
  let gift = (await sent.json()).gift;
  assert.equal(gift.comboCount, 1);
  assert.equal(gift.comboWindowSeconds, 10);
  assert.ok(gift.giftTransactionId);
  let realtimeGift = await firstRealtime;
  assert.equal(realtimeGift.comboCount, 1);
  assert.equal("balance" in realtimeGift, false);
  assert.equal("idempotencyKey" in realtimeGift, false);

  const secondRealtime = nextEvent(socket, "gift:sent");
  sent = await mutate(`/api/rooms/demo-streamer/gifts`, audience, {
    giftId: spark.id,
    quantity: 2,
    idempotencyKey: keys[1],
  });
  assert.equal(sent.status, 200);
  gift = (await sent.json()).gift;
  assert.equal(gift.comboCount, 3);
  realtimeGift = await secondRealtime;
  assert.equal(realtimeGift.comboCount, 3);
  assert.equal(realtimeGift.quantity, 2);

  const duplicate = await mutate(`/api/rooms/demo-streamer/gifts`, audience, {
    giftId: spark.id,
    quantity: 2,
    idempotencyKey: keys[1],
  });
  assert.equal((await duplicate.json()).duplicate, true);

  assert.equal(
    (await mutate(`/api/streamer/rooms/demo-streamer/gifts/${gift.giftTransactionId}/acknowledge`, audience, { message: "thank_you" })).status,
    403,
  );
  assert.equal(
    (await mutate(`/api/streamer/rooms/demo-streamer/gifts/${gift.giftTransactionId}/acknowledge`, otherCreator, { message: "thank_you" })).status,
    404,
  );
  const acknowledgeRealtime = nextEvent(socket, "gift:acknowledged");
  const acknowledged = await mutate(
    `/api/streamer/rooms/demo-streamer/gifts/${gift.giftTransactionId}/acknowledge`,
    creator,
    { message: "thank_you" },
  );
  assert.equal(acknowledged.status, 200);
  const acknowledgement = (await acknowledged.json()).acknowledgement;
  assert.equal(acknowledgement.message, "thank_you");
  const realtimeAcknowledgement = await acknowledgeRealtime;
  assert.deepEqual(
    Object.keys(realtimeAcknowledgement).sort(),
    ["acknowledgementId", "creator", "giftTransactionId", "message", "sender"].sort(),
  );
  const repeatedAcknowledgement = await mutate(
    `/api/streamer/rooms/demo-streamer/gifts/${gift.giftTransactionId}/acknowledge`,
    creator,
    { message: "celebrate" },
  );
  assert.equal((await repeatedAcknowledgement.json()).duplicate, true);

  const stored = await client.query(
    `SELECT g.quantity,g.combo_count,g.combo_expires_at,
            (SELECT COUNT(*)::int FROM gift_acknowledgements a WHERE a.gift_id=g.id) AS acknowledgement_count
     FROM gifts g WHERE g.idempotency_key=ANY($1::text[]) ORDER BY g.created_at`,
    [keys],
  );
  assert.deepEqual(stored.rows.map((row) => row.combo_count), [1, 3]);
  assert.ok(stored.rows.every((row) => row.combo_expires_at));
  assert.equal(stored.rows[1].acknowledgement_count, 1);
  const ledger = await client.query(
    "SELECT entry_type,amount FROM wallet_ledger WHERE idempotency_key LIKE $1 ORDER BY entry_type,amount",
    [`${prefix}%`],
  );
  assert.equal(ledger.rowCount, 4);
  assert.equal(ledger.rows.reduce((sum, row) => sum + row.amount, 0), 0);

  console.log("Bounded gift combos, ledger idempotency, minimal realtime payloads, creator ownership, and one-time acknowledgements verified.");
} finally {
  socket.disconnect();
  await client.query("DELETE FROM wallet_ledger WHERE idempotency_key LIKE $1", [
    `${prefix}%`,
  ]);
  await client.query("DELETE FROM gifts WHERE idempotency_key=ANY($1::text[])", [keys]);
  await client.query(
    "UPDATE live_rooms SET goal_progress=$1,status=(CASE WHEN $2='live' THEN 'live' ELSE 'offline' END)::room_status,broadcast_state=$2::broadcast_lifecycle_state WHERE slug='demo-streamer'",
    [originalGoal.rows[0].goal_progress, originalGoal.rows[0].broadcast_state],
  );
  await client.end();
}
