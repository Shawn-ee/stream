import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Client } from "pg";
import { io } from "socket.io-client";

const base = process.env.API_BASE_URL ?? "http://127.0.0.1:3001";
const password = process.env.LOCAL_DEMO_PASSWORD ?? "Local-demo-2026!";
const client = new Client({ connectionString: process.env.DATABASE_URL });
const keys = [`audience-r-${crypto.randomUUID()}`, `audience-r-${crypto.randomUUID()}`];

function authState(response) {
  const pairs = response.headers.getSetCookie().map((item) => item.split(";")[0]);
  return { cookie: pairs.join("; "), csrf: pairs.find((item) => item.startsWith("stream_csrf="))?.slice("stream_csrf=".length) };
}
async function login() {
  const response = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ handle: "demo-audience", password }) });
  assert.equal(response.status, 200);
  return authState(response);
}
async function call(path, auth, options = {}) {
  const response = await fetch(`${base}${path}`, { method: options.method ?? "GET", headers: { cookie: auth.cookie, ...(options.method && options.method !== "GET" ? { "x-csrf-token": auth.csrf } : {}), ...(options.body ? { "content-type": "application/json" } : {}) }, body: options.body ? JSON.stringify(options.body) : undefined });
  return { status: response.status, result: await response.json() };
}

await client.connect();
const auth = await login();
const socket = io(base, { transports: ["websocket"], extraHeaders: { cookie: auth.cookie } });
await new Promise((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
try {
  await client.query("UPDATE live_rooms SET status='live',broadcast_state='live' WHERE slug='demo-streamer'");
  await new Promise((resolve) => socket.emit("room:join", "demo-streamer", resolve));
  const all = await call("/api/rooms?language=", auth);
  assert.equal(all.status, 200);
  assert.equal(all.result.rooms[0].slug, "demo-streamer");
  assert.ok(all.result.rooms[0].viewer_count >= 1);
  assert.equal(typeof all.result.rooms[0].recommendation_score, "number");
  const english = await call("/api/rooms?language=en", auth);
  assert.equal(english.status, 200);
  assert.ok(english.result.rooms.every((room) => room.stream_language === "en"));
  assert.equal((await call("/api/rooms?language=fr", auth)).status, 400);

  const before = await call("/api/wallet", auth);
  const order = await call("/api/wallet/orders", auth, { method: "POST", body: { amount: 100, idempotencyKey: keys[0] } });
  assert.equal(order.status, 200);
  assert.equal(order.result.duplicate, false);
  const duplicate = await call("/api/wallet/orders", auth, { method: "POST", body: { amount: 100, idempotencyKey: keys[0] } });
  assert.equal(duplicate.result.duplicate, true);
  const after = await call("/api/wallet", auth);
  assert.equal(after.result.balance, before.result.balance + 100);
  assert.equal((await call("/api/wallet/orders", auth, { method: "POST", body: { amount: 101, idempotencyKey: keys[1] } })).status, 400);
  const orders = await call("/api/wallet/orders", auth);
  assert.ok(orders.result.orders.some((item) => item.id === order.result.order.id));
  console.log("Audience language discovery, live viewer ranking, and idempotent R test orders verified.");
} finally {
  socket.disconnect();
  await client.query("DELETE FROM wallet_ledger WHERE idempotency_key=ANY($1::text[])", [keys.map((key) => `${key}:credit`)]);
  await client.query("DELETE FROM test_credit_orders WHERE idempotency_key=ANY($1::text[])", [keys]);
  await client.query("UPDATE live_rooms SET status='offline',broadcast_state='offline' WHERE slug='demo-streamer'");
  await client.end();
}
