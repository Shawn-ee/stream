import assert from "node:assert/strict";
import { Client } from "pg";

const base = "http://127.0.0.1:3001";
const password = process.env.LOCAL_DEMO_PASSWORD ?? "Local-demo-2026!";
const bad = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ handle: "demo-admin", password: "wrong-password" }),
});
assert.equal(bad.status, 401);
const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ handle: "demo-audience", password }),
});
assert.equal(login.status, 200);
const pairs = login.headers.getSetCookie().map((item) => item.split(";")[0]);
const cookie = pairs.join("; ");
const csrf = pairs
  .find((item) => item.startsWith("stream_csrf="))
  ?.slice("stream_csrf=".length);
assert.ok(cookie.includes("stream_session="));
assert.ok(csrf);
assert.equal(
  (await fetch(`${base}/api/auth/session`, { headers: { cookie } })).status,
  200,
);
assert.equal(
  (
    await fetch(`${base}/api/demo/age-acknowledgement`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: "{}",
    })
  ).status,
  403,
);
assert.equal(
  (
    await fetch(`${base}/api/demo/age-acknowledgement`, {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json",
        "x-csrf-token": csrf,
      },
      body: "{}",
    })
  ).status,
  200,
);
assert.equal(
  (await fetch(`${base}/api/admin/dashboard`, { headers: { cookie } })).status,
  403,
);
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(
    "UPDATE auth_sessions SET expires_at=NOW()-INTERVAL '1 second' WHERE user_id='10000000-0000-4000-8000-000000000001'",
  );
} finally {
  await client.end();
}
assert.equal(
  (
    await (
      await fetch(`${base}/api/auth/session`, { headers: { cookie } })
    ).json()
  ).user,
  null,
);
const relogin = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ handle: "demo-audience", password }),
});
const reloginPairs = relogin.headers
  .getSetCookie()
  .map((item) => item.split(";")[0]);
const reloginCookie = reloginPairs.join("; ");
const reloginCsrf = reloginPairs
  .find((item) => item.startsWith("stream_csrf="))
  ?.slice("stream_csrf=".length);
assert.equal(
  (
    await fetch(`${base}/api/auth/session`, {
      method: "DELETE",
      headers: { cookie: reloginCookie, "x-csrf-token": reloginCsrf },
    })
  ).status,
  204,
);
assert.equal(
  (
    await (
      await fetch(`${base}/api/auth/session`, {
        headers: { cookie: reloginCookie },
      })
    ).json()
  ).user,
  null,
);
const restrictionClient = new Client({
  connectionString: process.env.DATABASE_URL,
});
await restrictionClient.connect();
try {
  await restrictionClient.query(
    "UPDATE users SET is_banned=TRUE WHERE handle='demo-admin'",
  );
  const banned = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ handle: "demo-admin", password }),
  });
  assert.equal(banned.status, 401);
} finally {
  await restrictionClient.query(
    "UPDATE users SET is_banned=FALSE WHERE handle='demo-admin'",
  );
  await restrictionClient.end();
}
console.log(
  "Credential verification, CSRF, expiry, logout, banned-user, and cross-role authorization verified.",
);
