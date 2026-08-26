import assert from "node:assert/strict";

const base = process.env.STREAM_VERIFY_BASE_URL ?? "http://127.0.0.1:3001";
const password = process.env.LOCAL_DEMO_PASSWORD;
assert.ok(password, "LOCAL_DEMO_PASSWORD is required.");

async function login(handle) {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ handle, password }),
  });
  assert.equal(response.status, 200, `${handle} login failed`);
  const cookies = response.headers.getSetCookie().map((item) => item.split(";")[0]);
  return {
    cookie: cookies.join("; "),
    csrf: cookies.find((item) => item.startsWith("stream_csrf="))?.slice(12),
  };
}

const streamer = await login("demo-streamer");
const audience = await login("demo-audience");
const studioResponse = await fetch(`${base}/api/streamer/studio`, {
  headers: { cookie: streamer.cookie },
});
assert.equal(studioResponse.status, 200);
const studio = await studioResponse.json();
assert.equal(studio.broadcastControls?.cloudflareConfigured, true);
assert.equal(studio.broadcastControls?.localFallbackEnabled, false);

const refreshResponse = await fetch(
  `${base}/api/streamer/rooms/demo-streamer/broadcast/refresh`,
  {
    method: "POST",
    headers: { cookie: streamer.cookie, "x-csrf-token": streamer.csrf },
  },
);
assert.equal(refreshResponse.status, 200);
const refresh = await refreshResponse.json();
assert.equal(refresh.broadcast?.state, "offline");
assert.equal(refresh.broadcast?.source, "cloudflare");

const audienceStatus = await fetch(`${base}/api/rooms/demo-streamer/broadcast`, {
  headers: { cookie: audience.cookie },
});
assert.equal(audienceStatus.status, 200);
assert.equal((await audienceStatus.json()).broadcast?.state, "offline");

const playback = await fetch(`${base}/api/rooms/demo-streamer/playback`, {
  headers: { cookie: audience.cookie },
});
assert.equal(playback.status, 409);
assert.equal((await playback.json()).error, "room_not_live");

const fakeLive = await fetch(
  `${base}/api/streamer/rooms/demo-streamer/broadcast/local-status`,
  {
    method: "PUT",
    headers: {
      cookie: streamer.cookie,
      "content-type": "application/json",
      "x-csrf-token": streamer.csrf,
    },
    body: JSON.stringify({ state: "live" }),
  },
);
assert.equal(fakeLive.status, 404);

const publicEvidence = JSON.stringify({ studio, refresh });
for (const secret of [
  process.env.CLOUDFLARE_API_TOKEN,
  process.env.CLOUDFLARE_STREAM_LIVE_INPUT_ID,
  process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE,
]) {
  if (secret) assert.equal(publicEvidence.includes(secret), false);
}

console.log(
  "Production Stream readiness verified: configured creator, Cloudflare offline status, fail-closed playback, no fake-live route, and no secret exposure.",
);
