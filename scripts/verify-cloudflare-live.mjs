import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

if (process.env.OWNER_APPROVED_CLOUDFLARE_BROADCAST !== "yes")
  throw new Error(
    "Fresh owner approval is required. Set OWNER_APPROVED_CLOUDFLARE_BROADCAST=yes only for the approved execution.",
  );

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const inputId = process.env.CLOUDFLARE_STREAM_LIVE_INPUT_ID;
if (!accountId || !token || !inputId)
  throw new Error("Cloudflare Stream local configuration is incomplete.");

const api = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;
const headers = { authorization: `Bearer ${token}` };
const inputResponse = await fetch(`${api}/stream/live_inputs/${inputId}`, {
  headers,
});
const inputPayload = await inputResponse.json();
const rtmps = inputPayload.result?.rtmps;
if (!inputResponse.ok || !rtmps?.url || !rtmps?.streamKey)
  throw new Error("Cloudflare Live Input credentials are unavailable.");

const ffmpeg =
  process.env.FFMPEG_PATH ??
  "C:/Users/hecto/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.1-essentials_build/bin/ffmpeg.exe";
if (!existsSync(ffmpeg))
  throw new Error("FFmpeg is not installed at the configured location.");
const broadcast = spawn(
  ffmpeg,
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-re",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=640x360:rate=30",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=1000:sample_rate=44100",
    "-t",
    "25",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-g",
    "60",
    "-c:a",
    "aac",
    "-f",
    "flv",
    `${rtmps.url}${rtmps.streamKey}`,
  ],
  { stdio: "ignore" },
);

await new Promise((resolve) => setTimeout(resolve, 10_000));
const login = await fetch("http://127.0.0.1:3001/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    handle: "demo-audience",
    password: process.env.LOCAL_DEMO_PASSWORD ?? "Local-demo-2026!",
  }),
});
const cookie = login.headers
  .getSetCookie()
  .map((item) => item.split(";")[0])
  .join("; ");
if (!cookie) throw new Error("Could not create local audience demo session.");
const playback = await fetch(
  "http://127.0.0.1:3001/api/rooms/demo-streamer/playback",
  { headers: { cookie } },
);
const playbackPayload = await playback.json();
if (
  !playback.ok ||
  !playbackPayload.iframeUrl?.includes("cloudflarestream.com")
)
  throw new Error(
    "The local signed playback endpoint did not return a Stream URL.",
  );
await new Promise((resolve, reject) => {
  broadcast.once("exit", (code) =>
    code === 0
      ? resolve()
      : reject(new Error("Synthetic Cloudflare broadcast failed.")),
  );
});
console.log(
  "Synthetic Cloudflare live broadcast and signed playback endpoint verified.",
);
