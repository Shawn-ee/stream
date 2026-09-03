import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { io } from "socket.io-client";
import { Client } from "pg";

const primaryBase = "http://127.0.0.1:3001";
const secondaryBase = "http://127.0.0.1:3002";
const password = process.env.LOCAL_DEMO_PASSWORD ?? "Local-demo-2026!";

const secondary = spawn(
  process.execPath,
  ["--env-file=.env", "--import", "tsx", "apps/api/src/index.ts"],
  {
    cwd: process.cwd(),
    env: { ...process.env, API_PORT: "3002", API_HOST: "127.0.0.1" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let secondaryOutput = "";
secondary.stdout.on("data", (chunk) => (secondaryOutput += chunk.toString()));
secondary.stderr.on("data", (chunk) => (secondaryOutput += chunk.toString()));

async function waitForReady() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${secondaryBase}/ready`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Secondary API did not become ready. ${secondaryOutput.slice(-500)}`);
}

async function login(base, handle) {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ handle, password }),
  });
  assert.equal(response.status, 200);
  return response.headers
    .getSetCookie()
    .map((item) => item.split(";")[0])
    .join("; ");
}

function connect(base, cookie) {
  return new Promise((resolve, reject) => {
    const socket = io(base, {
      transports: ["websocket"],
      extraHeaders: { cookie },
      reconnection: false,
    });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });
}

function join(socket) {
  return new Promise((resolve) =>
    socket.emit("room:join", "demo-streamer", resolve),
  );
}

let first;
let second;
const database = new Client({ connectionString: process.env.DATABASE_URL });
try {
  await database.connect();
  await database.query("UPDATE live_rooms SET status='live',broadcast_state='live',broadcast_status_source='cloudflare' WHERE slug='demo-streamer'");
  await waitForReady();
  const audienceCookie = await login(primaryBase, "demo-audience");
  const adminCookie = await login(secondaryBase, "demo-admin");
  first = await connect(primaryBase, audienceCookie);
  const firstPresence = await join(first);
  second = await connect(secondaryBase, adminCookie);
  const secondPresence = await join(second);
  assert.ok(
    secondPresence.count >= firstPresence.count + 1,
    "expected Redis-coordinated presence to include the second API instance",
  );

  const received = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("cross-instance chat timed out")),
      3000,
    );
    first.once("chat:message", (message) => {
      clearTimeout(timer);
      resolve(message);
    });
  });
  second.emit("chat:send", {
    roomSlug: "demo-streamer",
    body: "Cross-instance realtime verification",
  });
  const message = await received;
  assert.equal(message.body, "Cross-instance realtime verification");
  assert.equal(message.sender.role, "admin");
  console.log("Two-process Redis presence and chat coordination verified.");
} finally {
  first?.disconnect();
  second?.disconnect();
  if (!database.ended) {
    await database.query("UPDATE live_rooms SET status='offline',broadcast_state='offline',broadcast_status_source='local' WHERE slug='demo-streamer'");
    await database.end();
  }
  if (!secondary.killed) secondary.kill();
  await new Promise((resolve) => {
    if (secondary.exitCode !== null) return resolve();
    secondary.once("exit", resolve);
    setTimeout(resolve, 3000);
  });
}
