import assert from "node:assert/strict";
import { Client } from "pg";

const base = process.env.API_BASE_URL ?? "http://127.0.0.1:3001";
const handle = `broadcast_${Date.now().toString(36)}`;
const password = "SafeBroadcast2026Password";
const client = new Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
try {
  const registration = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ handle, displayName: "Broadcast Access Test", password, locale: "en" }),
  });
  assert.equal(registration.status, 201);
  const pairs = registration.headers.getSetCookie().map((value) => value.split(";")[0]);
  const cookie = pairs.join("; ");
  const csrf = pairs.find((value) => value.startsWith("stream_csrf="))?.slice("stream_csrf=".length);
  assert.ok(csrf);
  const access = await fetch(`${base}/api/broadcast/access`, { headers: { cookie } });
  assert.equal(access.status, 200);
  assert.deepEqual(await access.json(), { allowed: false, status: "AUDIENCE", onboardingEnabled: true });
  assert.equal((await fetch(`${base}/api/broadcast/access/activate`, { method: "POST", headers: { cookie } })).status, 403);
  assert.equal((await fetch(`${base}/api/broadcast/access/activate`, { method: "POST", headers: { cookie, "x-csrf-token": csrf } })).status, 404);
  assert.equal((await fetch(`${base}/api/creator/onboarding/start`, { method: "POST", headers: { cookie } })).status, 403);
  const start = await fetch(`${base}/api/creator/onboarding/start`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json", "x-csrf-token": csrf },
    body: "{}",
  });
  assert.equal(start.status, 201);
  assert.equal((await fetch(`${base}/api/streamer/studio`, { headers: { cookie } })).status, 403);
  const row = await client.query("SELECT u.role,(SELECT COUNT(*) FROM streamer_profiles p WHERE p.user_id=u.id)::int AS profiles,(SELECT COUNT(*) FROM live_rooms r WHERE r.streamer_id=u.id)::int AS rooms FROM users u WHERE u.handle=$1", [handle]);
  assert.deepEqual(row.rows[0], { role: "audience", profiles: 0, rooms: 0 }, "starting onboarding must not provision creator resources");
} finally {
  await client.query("DELETE FROM users WHERE handle=$1", [handle]);
  await client.end();
}

console.log("Creator onboarding entry, CSRF, no implicit provisioning, and protected streamer access verified.");
