import assert from "node:assert/strict";
import { Client } from "pg";

const base = process.env.API_BASE_URL ?? "http://127.0.0.1:3001";
const handle = `account_${Date.now().toString(36)}`;
const oldPassword = "AccountStart2026Password";
const newPassword = "AccountChanged2026Password";
const client = new Client({ connectionString: process.env.DATABASE_URL });

function authState(response) {
  const pairs = response.headers.getSetCookie().map((item) => item.split(";")[0]);
  return {
    cookie: pairs.join("; "),
    csrf: pairs.find((item) => item.startsWith("stream_csrf="))?.slice("stream_csrf=".length),
  };
}
async function login(password, userAgent) {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": userAgent },
    body: JSON.stringify({ handle, password }),
  });
  assert.equal(response.status, 200);
  return authState(response);
}
async function mutate(path, auth, method, body) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      cookie: auth.cookie,
      "x-csrf-token": auth.csrf,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

await client.connect();
try {
  const registration = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Lifecycle Windows Browser",
    },
    body: JSON.stringify({
      handle,
      displayName: "Lifecycle Viewer",
      password: oldPassword,
      locale: "en",
    }),
  });
  assert.equal(registration.status, 201);
  const windows = authState(registration);
  const android = await login(oldPassword, "Android Mobile Lifecycle Browser");
  const mac = await login(oldPassword, "Macintosh Lifecycle Browser");

  assert.equal(
    (await mutate("/api/account/profile", mac, "PATCH", { displayName: "Blocked" })).status,
    200,
  );
  const noCsrf = await fetch(`${base}/api/account/profile`, {
    method: "PATCH",
    headers: { cookie: mac.cookie, "content-type": "application/json" },
    body: JSON.stringify({ displayName: "No CSRF" }),
  });
  assert.equal(noCsrf.status, 403);
  const profile = await mutate("/api/account/profile", mac, "PATCH", {
    displayName: "Updated Viewer",
    locale: "zh",
  });
  assert.equal(profile.status, 200);
  const updated = await profile.json();
  assert.equal(updated.user.displayName, "Updated Viewer");
  assert.equal(updated.user.locale, "zh");
  assert.equal(updated.user.handle, handle);

  let sessions = await fetch(`${base}/api/account/sessions`, {
    headers: { cookie: mac.cookie },
  }).then((response) => response.json());
  assert.equal(sessions.sessions.length, 3);
  assert.equal(sessions.sessions.filter((session) => session.current).length, 1);
  const androidSession = sessions.sessions.find((session) => session.label.includes("Android"));
  assert.ok(androidSession && !androidSession.current);
  assert.equal(
    (await mutate(`/api/account/sessions/${androidSession.id}`, mac, "DELETE")).status,
    204,
  );
  assert.equal(
    (await fetch(`${base}/api/auth/session`, { headers: { cookie: android.cookie } }).then((response) => response.json())).user,
    null,
  );

  const others = await mutate("/api/account/sessions", mac, "DELETE");
  assert.equal(others.status, 200);
  assert.equal((await others.json()).revoked, 1);
  assert.equal(
    (await fetch(`${base}/api/auth/session`, { headers: { cookie: windows.cookie } }).then((response) => response.json())).user,
    null,
  );

  const extra = await login(oldPassword, "Linux Lifecycle Browser");
  assert.equal(
    (await mutate("/api/account/password", mac, "POST", {
      currentPassword: "WrongCurrent2026",
      newPassword,
    })).status,
    400,
  );
  const changed = await mutate("/api/account/password", mac, "POST", {
    currentPassword: oldPassword,
    newPassword,
  });
  assert.equal(changed.status, 200);
  const rotated = authState(changed);
  assert.ok(rotated.cookie.includes("stream_session="));
  assert.equal(
    (await fetch(`${base}/api/auth/session`, { headers: { cookie: extra.cookie } }).then((response) => response.json())).user,
    null,
  );
  assert.equal(
    (await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ handle, password: oldPassword }),
    })).status,
    401,
  );
  const newLogin = await login(newPassword, "Fresh Lifecycle Browser");
  assert.ok(newLogin.cookie);
  sessions = await fetch(`${base}/api/account/sessions`, {
    headers: { cookie: rotated.cookie },
  }).then((response) => response.json());
  assert.equal(sessions.sessions.length, 2);

  const stored = await client.query(
    "SELECT display_name,locale,password_changed_at FROM users WHERE handle=$1",
    [handle],
  );
  assert.equal(stored.rows[0].display_name, "Updated Viewer");
  assert.equal(stored.rows[0].locale, "zh");
  assert.ok(stored.rows[0].password_changed_at);
  const events = await client.query(
    "SELECT event_type FROM account_security_events e JOIN users u ON u.id=e.user_id WHERE u.handle=$1",
    [handle],
  );
  const eventTypes = new Set(events.rows.map((event) => event.event_type));
  for (const expected of ["profile_updated", "password_changed", "session_revoked", "other_sessions_revoked"])
    assert.ok(eventTypes.has(expected), `expected ${expected} event`);

  console.log("Account profile, CSRF, session inventory/revocation, password rotation, and security events verified.");
} finally {
  await client.query("DELETE FROM users WHERE handle=$1", [handle]);
  await client.end();
}
