import assert from "node:assert/strict";
import fs from "node:fs";

const base = process.env.API_URL ?? "http://127.0.0.1:3001";
const nginx = fs.readFileSync("deploy/nginx.conf", "utf8");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

assert.match(nginx, /location ~ \^\/\(room\|creator\)\//);
for (const bot of ["facebookexternalhit", "Twitterbot", "LinkedInBot", "Slackbot", "Discordbot", "WhatsApp", "TelegramBot"]) {
  assert.ok(nginx.includes(bot), `crawler routing must recognize ${bot}`);
}
assert.match(nginx, /rewrite \^\/\(room\|creator\)\/.*\/api\/public\/social-preview\/\$1\/\$2 last;/);
assert.match(nginx, /add_header Vary "User-Agent" always;/);
assert.match(nginx, /try_files \$uri \/index\.html;/);

const roomResponse = await fetch(`${base}/api/public/social-preview/room/demo-streamer`);
assert.equal(roomResponse.status, 200);
assert.match(roomResponse.headers.get("content-type") ?? "", /^text\/html/);
assert.equal(roomResponse.headers.get("cache-control"), "public, max-age=60, stale-while-revalidate=300");
assert.match(roomResponse.headers.get("vary") ?? "", /User-Agent/i);
const roomHtml = await roomResponse.text();
assert.match(roomHtml, /property="og:url" content="[^\"]+\/room\/demo-streamer"/);
assert.match(roomHtml, /property="og:title" content="Demo Streamer · Demo Streamer: Local Live Room"/);
assert.match(roomHtml, /<link rel="canonical" href="[^\"]+\/room\/demo-streamer">/);
assert.doesNotMatch(roomHtml, /CLOUDFLARE|stream key|api token/i);

const creatorResponse = await fetch(`${base}/api/public/social-preview/creator/demo-streamer`);
assert.equal(creatorResponse.status, 200);
const creatorHtml = await creatorResponse.text();
assert.match(creatorHtml, /property="og:type" content="profile"/);
assert.match(creatorHtml, /property="og:url" content="[^\"]+\/creator\/demo-streamer"/);

for (const invalid of ["video/demo-streamer", "room/not-a-real-creator", "room/UPPER"] ) {
  const response = await fetch(`${base}/api/public/social-preview/${invalid}`);
  assert.equal(response.status, 404);
}

assert.equal(packageJson.scripts["verify:social-previews"], "node --env-file=.env scripts/verify-social-previews.mjs");
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:social-previews"));
console.log("Escaped route-specific preview HTML, cache/security boundaries, crawler routing, SPA fallback, and invalid-route handling verified.");
