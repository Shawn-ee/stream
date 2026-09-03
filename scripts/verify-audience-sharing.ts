import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { sharePath, sharePayload } from "../apps/web/src/audience-share.ts";

const root = process.cwd();
const main = fs.readFileSync(path.join(root, "apps/web/src/main.tsx"), "utf8");
const room = fs.readFileSync(path.join(root, "apps/web/src/components/room.tsx"), "utf8");
const profile = fs.readFileSync(path.join(root, "apps/web/src/components/profile.tsx"), "utf8");
const helper = fs.readFileSync(path.join(root, "apps/web/src/audience-share.ts"), "utf8");
const html = fs.readFileSync(path.join(root, "apps/web/index.html"), "utf8");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const target = {
  kind: "room" as const,
  slug: "demo-streamer",
  creatorName: "Demo Streamer",
  roomTitle: "Local Live Room",
};
assert.equal(sharePath(target), "/room/demo-streamer");
assert.equal(sharePath({ ...target, kind: "creator" }), "/creator/demo-streamer");
assert.deepEqual(sharePayload(target, "https://holiwyn.online"), {
  title: "Demo Streamer · Local Live Room",
  url: "https://holiwyn.online/room/demo-streamer",
});

assert.match(helper, /typeof navigator\.share === "function"/);
assert.match(helper, /error\.name === "AbortError"/);
assert.match(helper, /navigator\.clipboard\.writeText/);
assert.match(helper, /getElementById\("canonical"\)/);
for (const [id, key] of [["og-title", "og:title"], ["og-url", "og:url"]]) {
  assert.ok(helper.includes(id), `dynamic metadata must include ${key}`);
  assert.ok(html.includes(key), `server-visible fallback metadata must include ${key}`);
}
for (const key of ["og:description", "og:type", "twitter:card"]) assert.ok(html.includes(key), `server-visible fallback metadata must include ${key}`);
assert.match(html, /https:\/\/holiwyn\.online\//);
assert.match(main, /syncAudienceMetadata\(item \?/);
assert.match(main, /audienceShareTarget\(room, "room"\)/);
assert.match(main, /audienceShareTarget\(room, "creator"\)/);
assert.match(helper, /copyOnly/);
assert.match(main, /share-notice[^\"]*" role="status"/);
assert.match(room, /<ShareButton label=\{shareLabel\} onShare=\{onShare\}/);
assert.match(profile, /<ShareButton label=\{zh \? "分享主播" : "Share creator"\}/);
assert.doesNotMatch(profile, />Copy link</, "creator profile should expose one authoritative share action");
assert.equal(packageJson.scripts["verify:audience-sharing"], "node --import tsx scripts/verify-audience-sharing.ts");
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:audience-sharing"));

console.log("Canonical room/profile payloads, native-share/copy fallback, bilingual controls, live metadata, and server-visible preview metadata verified.");
