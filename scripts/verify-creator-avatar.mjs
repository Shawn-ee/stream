import assert from "node:assert/strict";
import sharp from "sharp";

const base = process.env.API_BASE_URL ?? "http://127.0.0.1:3001";
const password = process.env.LOCAL_DEMO_PASSWORD ?? "Local-demo-2026!";

function authState(response) {
  const pairs = response.headers.getSetCookie().map((item) => item.split(";")[0]);
  return {
    cookie: pairs.join("; "),
    csrf: pairs.find((item) => item.startsWith("stream_csrf="))?.slice("stream_csrf=".length),
  };
}

async function login(handle) {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ handle, password }),
  });
  assert.equal(response.status, 200);
  return authState(response);
}

async function upload(auth, file, type = "image/png") {
  const form = new FormData();
  form.append("avatar", new Blob([file], { type }), "avatar.png");
  return fetch(`${base}/api/streamer/avatar`, {
    method: "POST",
    headers: { cookie: auth.cookie, "x-csrf-token": auth.csrf },
    body: form,
  });
}

const creator = await login("demo-night-creator");
const audience = await login("demo-audience");
const studioBefore = await fetch(`${base}/api/streamer/studio`, { headers: { cookie: creator.cookie } });
assert.equal(studioBefore.status, 200);
assert.equal((await studioBefore.json()).room.avatar_url, null, "avatar verifier requires deterministic seed state");

const source = await sharp({
  create: { width: 700, height: 500, channels: 3, background: "#ff4d6d" },
}).png().toBuffer();

assert.equal((await upload(audience, source)).status, 403, "audience cannot replace a creator avatar");
assert.equal((await upload(creator, Buffer.from("not an image"), "image/png")).status, 400);

const uploaded = await upload(creator, source);
assert.equal(uploaded.status, 200);
const { avatarUrl } = await uploaded.json();
assert.match(avatarUrl, /^\/api\/media\/avatars\/avatar-/);

try {
  const imageResponse = await fetch(`${base}${avatarUrl}`);
  assert.equal(imageResponse.status, 200);
  assert.equal(imageResponse.headers.get("content-type"), "image/webp");
  assert.match(imageResponse.headers.get("cache-control") ?? "", /immutable/);
  const metadata = await sharp(Buffer.from(await imageResponse.arrayBuffer())).metadata();
  assert.equal(metadata.width, 512);
  assert.equal(metadata.height, 512);

  const studio = await fetch(`${base}/api/streamer/studio`, { headers: { cookie: creator.cookie } });
  assert.equal((await studio.json()).room.avatar_url, avatarUrl);
  const rooms = await fetch(`${base}/api/rooms`);
  const room = (await rooms.json()).rooms.find((item) => item.slug === "night-creator");
  assert.equal(room.avatar_url, avatarUrl);
} finally {
  const removed = await fetch(`${base}/api/streamer/avatar`, {
    method: "DELETE",
    headers: { cookie: creator.cookie, "x-csrf-token": creator.csrf },
  });
  assert.equal(removed.status, 204);
}

assert.equal((await fetch(`${base}${avatarUrl}`)).status, 404);
console.log("Creator-only normalized avatar upload, public projection, immutable delivery, and cleanup verified.");
