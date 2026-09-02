import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Client } from "pg";
import { passwordRecord } from "../apps/api/src/auth.ts";

const base = process.env.API_BASE_URL ?? "http://127.0.0.1:3001";
const handle = `creator_${Date.now().toString(36)}`;
const password = "CreatorStart2026Password";
const adminPassword = process.env.LOCAL_DEMO_PASSWORD ?? "Local-demo-2026!";
const client = new Client({ connectionString: process.env.DATABASE_URL });

function authState(response) {
  const pairs = response.headers.getSetCookie().map((item) => item.split(";")[0]);
  return {
    cookie: pairs.join("; "),
    csrf: pairs.find((item) => item.startsWith("stream_csrf="))?.slice("stream_csrf=".length),
  };
}
async function login(loginHandle, loginPassword) {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ handle: loginHandle, password: loginPassword }),
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
const applicationBody = {
  category: "Music",
  bio: "A local-test creator profile with enough detail for review.",
  scheduleText: "Friday evenings in the local test environment",
  motivation: "I want to test an engaging bilingual music room with viewers.",
};

await client.connect();
try {
  const credentials = await passwordRecord(password);
  await client.query(
    `INSERT INTO users
     (id,handle,display_name,role,locale,password_hash,password_salt,test_age_acknowledged_at)
     VALUES ($1,$2,'Applicant Viewer','audience','en',$3,$4,NOW())`,
    [crypto.randomUUID(), handle, credentials.hash, credentials.salt],
  );
  const applicant = await login(handle, password);
  const applicantSecondSession = await login(handle, password);

  const noCsrf = await fetch(`${base}/api/creator-applications`, {
    method: "POST",
    headers: { cookie: applicant.cookie, "content-type": "application/json" },
    body: JSON.stringify(applicationBody),
  });
  assert.equal(noCsrf.status, 403);

  let submitted = await mutate(
    "/api/creator-applications",
    applicant,
    "POST",
    applicationBody,
  );
  assert.equal(submitted.status, 201);
  let application = (await submitted.json()).application;
  assert.equal(application.status, "pending");
  assert.equal(
    (await mutate("/api/creator-applications", applicant, "POST", applicationBody)).status,
    409,
  );
  assert.equal(
    (await fetch(`${base}/api/admin/creator-applications`, { headers: { cookie: applicant.cookie } })).status,
    403,
  );

  const admin = await login("demo-admin", adminPassword);
  let queue = await fetch(`${base}/api/admin/creator-applications`, {
    headers: { cookie: admin.cookie },
  }).then((response) => response.json());
  assert.ok(queue.applications.some((item) => item.id === application.id));

  let decision = await mutate(
    `/api/admin/creator-applications/${application.id}/decision`,
    admin,
    "POST",
    { decision: "rejected", reason: "Please clarify the local show format." },
  );
  assert.equal(decision.status, 200);
  assert.equal(
    (await fetch(`${base}/api/auth/session`, { headers: { cookie: applicant.cookie } }).then((response) => response.json())).user.role,
    "audience",
  );
  const rejected = await fetch(`${base}/api/creator-applications/me`, {
    headers: { cookie: applicant.cookie },
  }).then((response) => response.json());
  assert.equal(rejected.application.status, "rejected");
  assert.match(rejected.application.review_reason, /clarify/);

  submitted = await mutate("/api/creator-applications", applicant, "POST", {
    ...applicationBody,
    motivation: "I will host a bilingual music practice room and explain each segment clearly.",
  });
  assert.equal(submitted.status, 201);
  application = (await submitted.json()).application;

  decision = await mutate(
    `/api/admin/creator-applications/${application.id}/decision`,
    admin,
    "POST",
    { decision: "approved", reason: "Approved for the private local test." },
  );
  assert.equal(decision.status, 409);
  assert.equal((await decision.json()).error, "legacy_creator_application_requires_new_onboarding");
  for (const existingSession of [applicant, applicantSecondSession]) {
    assert.equal(
      (await fetch(`${base}/api/auth/session`, { headers: { cookie: existingSession.cookie } }).then((response) => response.json())).user.role,
      "audience",
    );
  }
  const stored = await client.query(
    "SELECT u.role,(SELECT COUNT(*) FROM streamer_profiles p WHERE p.user_id=u.id)::int AS profiles,(SELECT COUNT(*) FROM live_rooms r WHERE r.streamer_id=u.id)::int AS rooms FROM users u WHERE u.handle=$1",
    [handle],
  );
  assert.deepEqual(stored.rows[0], { role: "audience", profiles: 0, rooms: 0 });

  const events = await client.query(
    `SELECT e.event_type
     FROM creator_application_events e
     JOIN creator_applications a ON a.id=e.application_id
     JOIN users u ON u.id=a.applicant_id
     WHERE u.handle=$1 ORDER BY e.created_at`,
    [handle],
  );
  assert.deepEqual(
    events.rows.map((row) => row.event_type),
    ["submitted", "rejected", "submitted"],
  );
  const notificationCount = await client.query(
    "SELECT COUNT(*)::int AS count FROM notifications n JOIN users u ON u.id=n.user_id WHERE u.handle=$1 AND n.kind='creator_application'",
    [handle],
  );
  assert.equal(notificationCount.rows[0].count, 1);

  console.log("Legacy creator application review remains auditable but cannot bypass the new onboarding lifecycle.");
} finally {
  await client.query("DELETE FROM users WHERE handle=$1", [handle]);
  await client.end();
}
