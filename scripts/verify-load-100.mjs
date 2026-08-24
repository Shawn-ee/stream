import assert from "node:assert/strict";
import { io } from "socket.io-client";

const base = process.env.LOAD_BASE_URL ?? "http://127.0.0.1:3001";
const password = process.env.LOCAL_DEMO_PASSWORD ?? "Local-demo-2026!";
const targetUsers = Number(process.env.LOAD_USERS ?? 100);
const sessions = [];
const sockets = [];
const measurements = {
  login: [],
  discovery: [],
  room: [],
  join: [],
  chat: [],
  playbackAuthorization: [],
};
let unexpectedDisconnects = 0;
let testActive = true;

function percentile(values, percentage) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * percentage) - 1)] ?? 0;
}

async function inBatches(items, size, operation) {
  for (let index = 0; index < items.length; index += size)
    await Promise.all(items.slice(index, index + size).map(operation));
}

async function login(handle) {
  const started = performance.now();
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ handle, password }),
  });
  measurements.login.push(performance.now() - started);
  assert.equal(response.status, 200, `login failed with ${response.status}`);
  const pairs = response.headers
    .getSetCookie()
    .map((item) => item.split(";")[0]);
  const csrf = pairs
    .find((item) => item.startsWith("stream_csrf="))
    ?.slice("stream_csrf=".length);
  assert.ok(csrf);
  return { cookie: pairs.join("; "), csrf };
}

async function timedGet(path, auth, bucket) {
  const started = performance.now();
  const response = await fetch(`${base}${path}`, {
    headers: { cookie: auth.cookie },
  });
  measurements[bucket].push(performance.now() - started);
  assert.equal(response.status, 200, `${path} failed with ${response.status}`);
  return response.json();
}

async function timedExpectedStatus(path, auth, bucket, expectedStatus) {
  const started = performance.now();
  const response = await fetch(`${base}${path}`, {
    headers: { cookie: auth.cookie },
  });
  measurements[bucket].push(performance.now() - started);
  assert.equal(response.status, expectedStatus, `${path} returned ${response.status}`);
}

function connectAndJoin(auth) {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const socket = io(base, {
      transports: ["websocket"],
      extraHeaders: { cookie: auth.cookie },
      reconnection: false,
      timeout: 5000,
    });
    const timer = setTimeout(() => reject(new Error("room join timed out")), 7000);
    socket.once("connect_error", reject);
    socket.on("disconnect", (reason) => {
      if (testActive && reason !== "io client disconnect") unexpectedDisconnects += 1;
    });
    socket.once("connect", () => {
      socket.emit("room:join", "demo-streamer", (result) => {
        clearTimeout(timer);
        if (result?.error) return reject(new Error(result.error));
        measurements.join.push(performance.now() - started);
        sockets.push(socket);
        resolve(socket);
      });
    });
  });
}

function sendChat(socket, index) {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const timer = setTimeout(() => reject(new Error("chat acknowledgement timed out")), 4000);
    socket.emit(
      "chat:send",
      { roomSlug: "demo-streamer", body: `Load verification ${index}` },
      (result) => {
        clearTimeout(timer);
        if (result?.error) return reject(new Error(result.error));
        measurements.chat.push(performance.now() - started);
        resolve();
      },
    );
  });
}

try {
  const admin = await login("demo-admin");
  const startMetrics = await timedGet("/api/admin/ops/metrics", admin, "room");
  const loadStarted = performance.now();
  const indexes = Array.from({ length: targetUsers }, (_, index) => index);
  await inBatches(indexes, 5, async () => sessions.push(await login("demo-audience")));

  for (const step of [10, 25, 50, targetUsers]) {
    const cappedStep = Math.min(step, targetUsers);
    await inBatches(
      sessions.slice(sockets.length, cappedStep),
      10,
      connectAndJoin,
    );
    assert.equal(sockets.length, cappedStep);
  }

  await inBatches(sessions, 20, async (auth) => {
    await Promise.all([
      timedGet("/api/rooms", auth, "discovery"),
      timedGet("/api/rooms/demo-streamer", auth, "room"),
      timedExpectedStatus(
        "/api/rooms/demo-streamer/playback",
        auth,
        "playbackAuthorization",
        409,
      ),
    ]);
  });
  const unauthorizedMetrics = await fetch(`${base}/api/admin/ops/metrics`, {
    headers: { cookie: sessions[0].cookie },
  });
  assert.equal(unauthorizedMetrics.status, 403);
  await Promise.all(sockets.slice(0, 20).map(sendChat));

  const actions = await timedGet(
    "/api/rooms/demo-streamer/actions",
    sessions[0],
    "room",
  );
  assert.ok(actions.actions[0], "expected a seeded action for contention proof");
  const balanceBefore = await timedGet("/api/wallet", sessions[0], "room");
  const idempotencyKey = `load-action-${crypto.randomUUID()}`;
  const purchaseResponses = await Promise.all(
    Array.from({ length: 10 }, () =>
      fetch(
        `${base}/api/rooms/demo-streamer/actions/${actions.actions[0].id}/purchase`,
        {
          method: "POST",
          headers: {
            cookie: sessions[0].cookie,
            "content-type": "application/json",
            "x-csrf-token": sessions[0].csrf,
          },
          body: JSON.stringify({ idempotencyKey }),
        },
      ),
    ),
  );
  assert.ok(purchaseResponses.every((response) => response.status === 200));
  const purchaseBodies = await Promise.all(
    purchaseResponses.map((response) => response.json()),
  );
  assert.equal(purchaseBodies.filter((body) => body.action).length, 1);
  assert.equal(purchaseBodies.filter((body) => body.duplicate).length, 9);
  const balanceAfter = await timedGet("/api/wallet", sessions[0], "room");
  assert.equal(
    balanceAfter.balance,
    balanceBefore.balance - actions.actions[0].coin_cost,
    "idempotent contention must debit exactly once",
  );

  await new Promise((resolve) => setTimeout(resolve, 750));
  const metrics = await timedGet("/api/admin/ops/metrics", admin, "room");
  const loadWallMilliseconds = performance.now() - loadStarted;
  const cpuDeltaMicros =
    metrics.cpuUsageMicros.user +
    metrics.cpuUsageMicros.system -
    startMetrics.cpuUsageMicros.user -
    startMetrics.cpuUsageMicros.system;

  const report = {
    targetUsers,
    connectedSockets: sockets.length,
    unexpectedDisconnects,
    p95Milliseconds: Object.fromEntries(
      Object.entries(measurements).map(([name, values]) => [
        name,
        Math.round(percentile(values, 0.95)),
      ]),
    ),
    databasePool: metrics.databasePool,
    apiMemoryMiB: Math.round(metrics.memoryBytes.rss / 1024 / 1024),
    apiCpuPercentOfOneCore: Math.round(
      (cpuDeltaMicros / (loadWallMilliseconds * 1000)) * 100,
    ),
    redisMemoryMiB: Math.round(metrics.redis.usedMemoryBytes / 1024 / 1024),
    redisConnectedClients: metrics.redis.connectedClients,
    idempotency: { successfulMutation: 1, safeDuplicates: 9 },
    authorizationProbe: "audience denied admin metrics",
  };

  assert.equal(unexpectedDisconnects, 0);
  assert.ok(report.p95Milliseconds.login <= 1500, "login p95 exceeded 1500 ms");
  assert.ok(report.p95Milliseconds.discovery <= 750, "discovery p95 exceeded 750 ms");
  assert.ok(report.p95Milliseconds.room <= 750, "room-read p95 exceeded 750 ms");
  assert.ok(report.p95Milliseconds.join <= 1500, "realtime join p95 exceeded 1500 ms");
  assert.ok(report.p95Milliseconds.chat <= 1000, "chat p95 exceeded 1000 ms");
  assert.ok(
    report.p95Milliseconds.playbackAuthorization <= 750,
    "playback authorization p95 exceeded 750 ms",
  );
  assert.ok(metrics.databasePool.total <= metrics.databasePool.max);
  assert.equal(metrics.databasePool.waiting, 0);
  assert.ok(report.apiMemoryMiB <= 512, "API RSS exceeded 512 MiB");
  assert.ok(
    report.apiCpuPercentOfOneCore <= 200,
    "API CPU exceeded two core-equivalents",
  );
  assert.ok(report.redisMemoryMiB <= 128, "Redis memory exceeded 128 MiB");
  console.log(JSON.stringify(report, null, 2));
} finally {
  testActive = false;
  for (const socket of sockets) socket.disconnect();
}
