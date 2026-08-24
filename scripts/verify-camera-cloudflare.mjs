import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

if (process.env.OWNER_APPROVED_CAMERA_TEST !== "yes")
  throw new Error(
    "Fresh owner approval is required. Set OWNER_APPROVED_CAMERA_TEST=yes only for the approved execution.",
  );

const base = "http://127.0.0.1:3001";
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const inputId = process.env.CLOUDFLARE_STREAM_LIVE_INPUT_ID;
const ffmpeg =
  process.env.FFMPEG_PATH ??
  "C:/Users/hecto/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.1-essentials_build/bin/ffmpeg.exe";
const ffprobe = ffmpeg.replace(/ffmpeg\.exe$/i, "ffprobe.exe");
const camera = "Logi C270 HD WebCam";
const microphone = "Microphone (Logi C270 HD WebCam)";

if (!accountId || !token || !inputId)
  throw new Error("Cloudflare Stream local configuration is incomplete.");
if (!existsSync(ffmpeg) || !existsSync(ffprobe))
  throw new Error("The configured FFmpeg tools are unavailable.");

async function login(handle) {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      handle,
      password: process.env.LOCAL_DEMO_PASSWORD ?? "Local-demo-2026!",
    }),
  });
  assert.equal(response.status, 200, `${handle} login failed`);
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

async function refreshBroadcast(auth) {
  const response = await fetch(
    `${base}/api/streamer/rooms/demo-streamer/broadcast/refresh`,
    {
      method: "POST",
      headers: {
        cookie: auth.cookie,
        "x-csrf-token": auth.csrf,
      },
    },
  );
  assert.equal(response.status, 200, "broadcast refresh failed");
  return (await response.json()).broadcast;
}

async function waitForState(auth, expected, timeoutMilliseconds) {
  const deadline = Date.now() + timeoutMilliseconds;
  let lastState = "unknown";
  while (Date.now() < deadline) {
    const broadcast = await refreshBroadcast(auth);
    lastState = broadcast?.state ?? "unknown";
    if (lastState === expected) return broadcast;
    await new Promise((resolve) => setTimeout(resolve, 2_500));
  }
  throw new Error(`Broadcast did not reach ${expected}; last state was ${lastState}.`);
}

function probeTracks(manifestUrl) {
  return new Promise((resolve, reject) => {
    const probe = spawn(
      ffprobe,
      [
        "-v",
        "error",
        "-rw_timeout",
        "10000000",
        "-show_entries",
        "stream=codec_type,codec_name",
        "-of",
        "json",
        manifestUrl,
      ],
      { stdio: ["ignore", "pipe", "ignore"] },
    );
    let output = "";
    probe.stdout.on("data", (chunk) => (output += chunk.toString()));
    const timer = setTimeout(() => {
      probe.kill();
      reject(new Error("Timed out while verifying playback tracks."));
    }, 20_000);
    probe.once("exit", (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error("Playback track probe failed."));
      try {
        resolve(JSON.parse(output));
      } catch {
        reject(new Error("Playback track probe returned invalid data."));
      }
    });
  });
}

const api = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;
const inputResponse = await fetch(`${api}/stream/live_inputs/${inputId}`, {
  headers: { authorization: `Bearer ${token}` },
});
const inputPayload = await inputResponse.json();
const rtmps = inputPayload.result?.rtmps;
if (!inputResponse.ok || !rtmps?.url || !rtmps?.streamKey)
  throw new Error("Cloudflare Live Input credentials are unavailable.");

const streamer = await login("demo-streamer");
const audience = await login("demo-audience");
const initial = await refreshBroadcast(streamer);
assert.equal(initial.state, "offline", "Cloudflare input must begin offline");

const broadcast = spawn(
  ffmpeg,
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-thread_queue_size",
    "512",
    "-f",
    "dshow",
    "-video_size",
    "640x480",
    "-framerate",
    "30",
    "-i",
    `video=${camera}:audio=${microphone}`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-tune",
    "zerolatency",
    "-pix_fmt",
    "yuv420p",
    "-g",
    "60",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-f",
    "flv",
    `${rtmps.url}${rtmps.streamKey}`,
  ],
  { stdio: "ignore" },
);

try {
  await waitForState(streamer, "live", 45_000);
  if (broadcast.exitCode !== null)
    throw new Error("Camera broadcast exited before playback verification.");

  const playback = await fetch(`${base}/api/rooms/demo-streamer/playback`, {
    headers: { cookie: audience.cookie },
  });
  assert.equal(playback.status, 200, "signed audience playback was unavailable");
  const playbackPayload = await playback.json();
  assert.ok(playbackPayload.iframeUrl?.endsWith("/iframe"));
  const manifestUrl = playbackPayload.iframeUrl.replace(
    /\/iframe$/,
    "/manifest/video.m3u8",
  );

  let tracks;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      tracks = await probeTracks(manifestUrl);
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }
  }
  if (!tracks) throw new Error("Cloudflare playback tracks were not available.");
  const trackTypes = new Set(tracks.streams?.map((stream) => stream.codec_type));
  assert.ok(trackTypes.has("video"), "Cloudflare playback has no video track");
  assert.ok(trackTypes.has("audio"), "Cloudflare playback has no audio track");
  console.log(
    "CAMERA_LIVE_READY: camera video and microphone audio reached signed Cloudflare playback.",
  );
  await new Promise((resolve) => setTimeout(resolve, 20_000));
} finally {
  if (broadcast.exitCode === null) broadcast.kill();
  await new Promise((resolve) => {
    if (broadcast.exitCode !== null) return resolve();
    broadcast.once("exit", resolve);
    setTimeout(resolve, 5_000);
  });
}

await waitForState(streamer, "offline", 60_000);
console.log("Camera broadcast stopped and Cloudflare lifecycle returned offline.");
