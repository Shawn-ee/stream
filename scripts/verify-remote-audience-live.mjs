import assert from "node:assert/strict";

const base = process.env.WEB_ORIGIN;
const password = process.env.LOCAL_DEMO_PASSWORD;
assert.ok(base?.startsWith("https://"), "Public WEB_ORIGIN is required.");
assert.ok(password, "LOCAL_DEMO_PASSWORD is required.");

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ handle: "demo-audience", password }),
});
assert.equal(login.status, 200, "Remote audience login failed");
const cookie = login.headers
  .getSetCookie()
  .map((item) => item.split(";")[0])
  .join("; ");

const statusResponse = await fetch(`${base}/api/rooms/demo-streamer/broadcast`, {
  headers: { cookie },
});
assert.equal(statusResponse.status, 200);
assert.equal((await statusResponse.json()).broadcast?.state, "live");

const playbackResponse = await fetch(`${base}/api/rooms/demo-streamer/playback`, {
  headers: { cookie },
});
assert.equal(playbackResponse.status, 200, "Remote signed playback unavailable");
const playback = await playbackResponse.json();
assert.match(playback.iframeUrl, /^https:\/\/[^/]+\/[A-Za-z0-9._~-]+\/iframe$/);

const manifestUrl = playback.iframeUrl.replace(
  /\/iframe$/,
  "/manifest/video.m3u8",
);
const manifestResponse = await fetch(manifestUrl);
assert.equal(manifestResponse.status, 200, "Remote HLS manifest unavailable");
const manifest = await manifestResponse.text();
assert.match(manifest, /^#EXTM3U/m);
assert.equal(manifest.includes(process.env.CLOUDFLARE_API_TOKEN ?? "never"), false);

console.log(
  "REMOTE_AUDIENCE_LIVE_READY: Linux audience login, live lifecycle, signed player authorization, and Cloudflare HLS delivery verified.",
);
