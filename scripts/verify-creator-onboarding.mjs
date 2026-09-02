import assert from "node:assert/strict";
import { Client } from "pg";
import { unlink } from "node:fs/promises";
import { join } from "node:path";

const base = process.env.API_BASE_URL ?? "http://127.0.0.1:3001";
const handle = `onboard_${Date.now().toString(36)}`;
const password = "SafeCreator2026Password";
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

let cookie = "";
let csrf = "";
async function call(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...(csrf && options.method && options.method !== "GET" ? { "x-csrf-token": csrf } : {}),
      ...(options.headers ?? {}),
    },
  });
  const pairs = response.headers.getSetCookie().map((value) => value.split(";")[0]);
  if (pairs.length) {
    cookie = pairs.join("; ");
    csrf = pairs.find((value) => value.startsWith("stream_csrf="))?.slice("stream_csrf=".length) ?? csrf;
  }
  const body = response.status === 204 ? null : await response.json();
  return { response, body };
}

try {
  const registration = await call("/api/auth/register", { method: "POST", body: JSON.stringify({ handle, displayName: "Onboarding Test", password, locale: "en" }) });
  assert.equal(registration.response.status, 201);
  const userId = registration.body.user.id;

  for (const path of ["/api/creator/onboarding", "/api/broadcast/access", "/api/creator/onboarding", "/api/streamer/studio"]) await call(path);
  const untouched = await db.query("SELECT (SELECT COUNT(*) FROM creator_accounts WHERE user_id=$1)::int AS accounts,(SELECT COUNT(*) FROM creator_onboarding WHERE user_id=$1)::int AS onboarding,(SELECT COUNT(*) FROM streamer_profiles WHERE user_id=$1)::int AS profiles,(SELECT COUNT(*) FROM live_rooms WHERE streamer_id=$1)::int AS rooms", [userId]);
  assert.deepEqual(untouched.rows[0], { accounts: 0, onboarding: 0, profiles: 0, rooms: 0 }, "read-only navigation must not provision creator resources");
  assert.equal((await call("/api/streamer/studio")).response.status, 403);

  assert.equal((await call("/api/creator/onboarding/start", { method: "POST", body: "{}" })).response.status, 201);
  let counts = await db.query("SELECT (SELECT COUNT(*) FROM creator_accounts WHERE user_id=$1)::int AS accounts,(SELECT COUNT(*) FROM creator_onboarding WHERE user_id=$1)::int AS onboarding,(SELECT COUNT(*) FROM streamer_profiles WHERE user_id=$1)::int AS profiles,(SELECT COUNT(*) FROM live_rooms WHERE streamer_id=$1)::int AS rooms", [userId]);
  assert.deepEqual(counts.rows[0], { accounts: 1, onboarding: 1, profiles: 0, rooms: 0 });
  assert.equal((await call("/api/streamer/studio")).response.status, 403);

  const profile = await call("/api/creator/onboarding/profile", { method: "PATCH", body: JSON.stringify({ creatorHandle: handle, displayName: "Onboarding Creator", bio: "A complete test creator biography for safe local verification.", primaryLanguage: "en", timezone: "America/Chicago" }) });
  assert.equal(profile.response.status, 200);
  const beforeAgreement = await call("/api/creator/onboarding");
  assert.ok(beforeAgreement.body.agreement.version);
  assert.equal((await call("/api/creator/onboarding/agreement/accept", { method: "POST", body: JSON.stringify({ agreementVersion: beforeAgreement.body.agreement.version, signerName: "Onboarding Creator", ageConfirmed: false, agreementConfirmed: true }) })).response.status, 400);
  assert.equal((await call("/api/creator/onboarding/agreement/accept", { method: "POST", body: JSON.stringify({ agreementVersion: beforeAgreement.body.agreement.version, signerName: "Onboarding Creator", ageConfirmed: true, agreementConfirmed: true }) })).response.status, 200);
  assert.equal((await call("/api/creator/onboarding/agreement/accept", { method: "POST", body: JSON.stringify({ agreementVersion: beforeAgreement.body.agreement.version, signerName: "Changed Name", ageConfirmed: true, agreementConfirmed: true }) })).response.status, 409, "agreement acceptance is immutable and step-bound");
  const document = new FormData();
  document.append("document", new Blob([Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0])], { type: "image/png" }), "identity.png");
  const upload = await call("/api/creator/onboarding/identity-document?documentType=passport", { method: "POST", body: document });
  assert.equal(upload.response.status, 201);
  assert.equal(upload.body.document.status, "UPLOADED");
  assert.equal("storageReference" in upload.body.document, false);
  const activation = await call("/api/creator/onboarding/activate", { method: "POST", body: "{}" });
  assert.equal(activation.response.status, 200);
  assert.equal(activation.body.status, "ACTIVE");
  assert.equal((await call("/api/creator/onboarding/activate", { method: "POST", body: "{}" })).body.status, "ACTIVE", "activation must be idempotent");
  counts = await db.query("SELECT (SELECT COUNT(*) FROM streamer_profiles WHERE user_id=$1)::int AS profiles,(SELECT COUNT(*) FROM live_rooms WHERE streamer_id=$1)::int AS rooms", [userId]);
  assert.deepEqual(counts.rows[0], { profiles: 1, rooms: 0 }, "activation creates a profile but never a room");
  assert.equal((await call("/api/streamer/studio")).response.status, 200);
  assert.equal((await call("/api/me/following")).response.status, 200, "active creators retain audience capabilities");
  assert.equal((await call("/api/admin/creator-reviews")).response.status,403,"creators cannot access administrator reviews");

  const room = await call("/api/studio/rooms", { method: "POST", body: JSON.stringify({ title: "Explicit Draft Room", primaryLanguage: "en", additionalLanguages: [], tagIds: [] }) });
  assert.equal(room.response.status, 201);
  assert.equal(room.body.room.publication_status, "draft");
  for (const path of [
    `/api/rooms/${handle}`,
    `/api/rooms/${handle}/chat-history`,
    `/api/rooms/${handle}/broadcast`,
    `/api/rooms/${handle}/playback`,
    `/api/rooms/${handle}/actions`,
    `/api/rooms/${handle}/private-show`,
    `/api/rooms/${handle}/support-feed`,
  ]) {
    assert.equal((await call(path)).response.status, 404, `draft room endpoint must remain private: ${path}`);
  }
  assert.equal((await call(`/api/studio/rooms/${handle}/publish`, { method: "POST", body: "{}" })).response.status, 200);
  assert.equal((await call(`/api/rooms/${handle}`)).response.status, 200);

  let adminCookie = "", adminCsrf = "";
  async function adminCall(path, options = {}) {
    const response = await fetch(`${base}${path}`, { ...options, headers: { ...(options.body ? { "content-type": "application/json" } : {}), ...(adminCookie ? { cookie: adminCookie } : {}), ...(adminCsrf && options.method && options.method !== "GET" ? { "x-csrf-token": adminCsrf } : {}) } });
    const pairs=response.headers.getSetCookie().map(value=>value.split(";")[0]);if(pairs.length){adminCookie=pairs.join("; ");adminCsrf=pairs.find(value=>value.startsWith("stream_csrf="))?.slice("stream_csrf=".length)??adminCsrf;}
    return {response,body:response.status===204?null:await response.json()};
  }
  assert.equal((await adminCall("/api/auth/login",{method:"POST",body:JSON.stringify({handle:"demo-admin",password:process.env.LOCAL_DEMO_PASSWORD??"Local-demo-2026!"})})).response.status,200);
  const queue=await adminCall(`/api/admin/creator-reviews?search=${userId}`);assert.equal(queue.response.status,200);assert.equal(queue.body.items.length,1);
  const detail=await adminCall(`/api/admin/creator-reviews/${userId}`);assert.equal(detail.response.status,200);assert.equal("storage_reference" in detail.body.creator,false,"admin metadata must not expose storage references");
  const adminId=(await db.query("SELECT id FROM users WHERE handle='demo-admin'")).rows[0].id;
  await db.query("DELETE FROM admin_permissions WHERE user_id=$1 AND permission='creator_document.view'",[adminId]);
  assert.equal((await adminCall(`/api/admin/creator-reviews/${userId}/document-view`,{method:"POST",body:JSON.stringify({documentId:detail.body.creator.document_id})})).response.status,403,"review readers cannot view documents without dedicated permission");
  await db.query("INSERT INTO admin_permissions(user_id,permission) VALUES($1,'creator_document.view') ON CONFLICT DO NOTHING",[adminId]);
  const grant=await adminCall(`/api/admin/creator-reviews/${userId}/document-view`,{method:"POST",body:JSON.stringify({documentId:detail.body.creator.document_id})});assert.equal(grant.response.status,200);
  const viewed=await fetch(`${base}${grant.body.viewPath}`,{headers:{cookie:adminCookie}});assert.equal(viewed.status,200);assert.match(viewed.headers.get("cache-control")??"",/no-store/);
  async function decision(action){return adminCall(`/api/admin/creator-reviews/${userId}/actions`,{method:"POST",body:JSON.stringify({action,reasonCode:`test_${action.toLowerCase()}`,userFacingReason:"Automated review test",idempotencyKey:crypto.randomUUID()})});}
  assert.equal((await decision("DOCUMENT_REVIEWED")).response.status,200);
  assert.equal((await decision("SUSPENDED")).response.status,200);
  assert.equal((await call("/api/streamer/studio")).response.status, 403);
  assert.equal((await call("/api/me/following")).response.status,200,"suspension preserves audience access");
  assert.equal((await decision("REACTIVATED")).response.status,200);
  assert.equal((await call("/api/streamer/studio")).response.status,200);
  const audit=await db.query("SELECT COUNT(*)::int AS count FROM audit_events WHERE subject_user_id=$1 AND event_type IN ('identity_document_view_authorized','creator_review_decision')",[userId]);assert.ok(audit.rows[0].count>=4);
} finally {
  const stored=await db.query("SELECT storage_reference FROM creator_identity_documents WHERE user_id IN (SELECT user_id FROM creator_onboarding WHERE creator_handle=$1)",[handle]);
  for(const item of stored.rows){if(/^[0-9a-f-]{36}-[0-9a-f-]{36}\.idoc$/i.test(item.storage_reference))await unlink(join(process.env.IDENTITY_DOCUMENT_STORAGE_PATH??"work/private-identity-documents",item.storage_reference)).catch(()=>undefined);}
  await db.query("DELETE FROM users WHERE handle=$1 OR id IN (SELECT user_id FROM creator_onboarding WHERE creator_handle=$1)", [handle]);
  await db.end();
}

console.log("Creator onboarding, authorization, activation idempotency, explicit room creation, draft privacy, and suspension verified.");
