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
  assert.deepEqual(await access.json(), { mode: "open", allowed: true, status: "not_applied" });
  assert.equal((await fetch(`${base}/api/broadcast/access/activate`, { method: "POST", headers: { cookie } })).status, 403);
  const activation = await fetch(`${base}/api/broadcast/access/activate`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json", "x-csrf-token": csrf },
    body: "{}",
  });
  assert.equal(activation.status, 200);
  assert.equal((await activation.json()).user.role, "streamer");
  assert.equal((await fetch(`${base}/api/streamer/studio`, { headers: { cookie } })).status, 200);
  const row = await client.query("SELECT u.role FROM users u JOIN streamer_profiles p ON p.user_id=u.id JOIN live_rooms r ON r.streamer_id=u.id WHERE u.handle=$1", [handle]);
  assert.equal(row.rows[0]?.role, "audience", "broadcast access must not remove audience capabilities");
} finally {
  await client.query("DELETE FROM users WHERE handle=$1", [handle]);
  await client.end();
}

console.log("Open-mode broadcast eligibility, CSRF, atomic provisioning, and protected streamer access verified.");
