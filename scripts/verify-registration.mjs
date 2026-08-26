import assert from "node:assert/strict";
import { Client } from "pg";

const base = process.env.API_BASE_URL ?? "http://127.0.0.1:3001";
const handle = `viewer_${Date.now().toString(36)}`;
const password = "SafeViewer2026Password";
const client = new Client({ connectionString: process.env.DATABASE_URL });

function cookieState(response) {
  const pairs = response.headers
    .getSetCookie()
    .map((item) => item.split(";")[0]);
  return {
    cookie: pairs.join("; "),
    csrf: pairs
      .find((item) => item.startsWith("stream_csrf="))
      ?.slice("stream_csrf=".length),
  };
}

await client.connect();
try {
  const weak = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      handle: `${handle}_weak`,
      displayName: "Weak Test",
      password: "alllowercasepassword",
      locale: "en",
    }),
  });
  assert.equal(weak.status, 400);

  const emptyName = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      handle: `${handle}_empty`,
      displayName: "  ",
      password,
      locale: "en",
    }),
  });
  assert.equal(emptyName.status, 400);

  const registration = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      handle,
      displayName: "New Viewer",
      password,
      locale: "zh",
    }),
  });
  assert.equal(registration.status, 201);
  const registered = await registration.json();
  assert.equal(registered.user.handle, handle);
  assert.equal(registered.user.displayName, "New Viewer");
  assert.equal(registered.user.role, "audience");
  assert.equal(registered.user.locale, "zh");
  assert.equal(registered.user.ageAcknowledged, false);
  const auth = cookieState(registration);
  assert.ok(auth.cookie.includes("stream_session="));
  assert.ok(auth.csrf);

  const stored = await client.query(
    "SELECT id,password_hash,password_salt,role FROM users WHERE handle=$1",
    [handle],
  );
  assert.equal(stored.rowCount, 1);
  assert.equal(stored.rows[0].role, "audience");
  assert.notEqual(stored.rows[0].password_hash, password);
  assert.ok(stored.rows[0].password_hash);
  assert.ok(stored.rows[0].password_salt);

  const duplicate = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      handle: handle.toUpperCase(),
      displayName: "Duplicate Viewer",
      password,
      locale: "en",
    }),
  });
  assert.equal(duplicate.status, 409);

  const acknowledgement = await fetch(
    `${base}/api/demo/age-acknowledgement`,
    {
      method: "POST",
      headers: {
        cookie: auth.cookie,
        "content-type": "application/json",
        "x-csrf-token": auth.csrf,
      },
      body: "{}",
    },
  );
  assert.equal(acknowledgement.status, 200);
  const acknowledged = await acknowledgement.json();
  assert.equal(acknowledged.user.id, registered.user.id);
  assert.equal(acknowledged.user.handle, handle);
  assert.equal(acknowledged.user.ageAcknowledged, true);

  const wallet = await fetch(`${base}/api/wallet`, {
    headers: { cookie: auth.cookie },
  });
  assert.equal(wallet.status, 200);
  assert.equal((await wallet.json()).balance, 0);
  assert.equal(
    (
      await fetch(`${base}/api/admin/users`, {
        headers: { cookie: auth.cookie },
      })
    ).status,
    403,
  );

  const logout = await fetch(`${base}/api/auth/session`, {
    method: "DELETE",
    headers: { cookie: auth.cookie, "x-csrf-token": auth.csrf },
  });
  assert.equal(logout.status, 204);

  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ handle: handle.toUpperCase(), password }),
  });
  assert.equal(login.status, 200);
  assert.equal((await login.json()).user.id, registered.user.id);

  console.log(
    "Individual registration, hashing, case-folding, session, CSRF, identity isolation, role protection, and zero-balance behavior verified.",
  );
} finally {
  await client.query("DELETE FROM users WHERE handle=$1", [handle]);
  await client.end();
}
