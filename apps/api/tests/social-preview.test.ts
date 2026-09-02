import assert from "node:assert/strict";
import test from "node:test";
import { renderSocialPreview, validSocialPreviewPath } from "../src/social-preview.ts";

const room = {
  slug: "demo-streamer",
  title: "A room & friends",
  streamer_name: "Demo <Streamer>",
  handle: "demo-streamer",
  languages: [{ code: "en", nameEn: "English", nameNative: "English", isPrimary: true }],
  tags: [{ id: "1", slug: "conversation", displayName: "Conversation", type: "CONTENT" }],
  bio: 'A safe "profile"',
  broadcast_state: "live",
  broadcast_status_source: "cloudflare",
  avatar_url: "/api/media/avatars/avatar-safe.webp",
  stream_thumbnail_url: "/api/media/stream-thumbnails/stream-thumbnail-safe.webp",
};

test("validates only canonical preview kinds and slugs", () => {
  assert.equal(validSocialPreviewPath("room", "demo-streamer"), true);
  assert.equal(validSocialPreviewPath("creator", "demo-streamer"), true);
  assert.equal(validSocialPreviewPath("video", "demo-streamer"), false);
  assert.equal(validSocialPreviewPath("room", "../admin"), false);
  assert.equal(validSocialPreviewPath("room", "UPPER"), false);
});

test("renders escaped room metadata with a platform-owned image", () => {
  const html = renderSocialPreview("room", room, "https://holiwyn.online");
  assert.match(html, /<title>Demo &lt;Streamer&gt; · A room &amp; friends \| Holiwyn<\/title>/);
  assert.match(html, /property="og:url" content="https:\/\/holiwyn\.online\/room\/demo-streamer"/);
  assert.match(html, /property="og:image" content="https:\/\/holiwyn\.online\/api\/media\/stream-thumbnails\/stream-thumbnail-safe\.webp"/);
  assert.doesNotMatch(html, /<Streamer>/);
});

test("renders creator metadata and rejects external image injection", () => {
  const html = renderSocialPreview("creator", { ...room, avatar_url: "https://attacker.example/image.jpg", bio: "</title><script>alert(1)</script>" }, "https://holiwyn.online");
  assert.match(html, /property="og:type" content="profile"/);
  assert.match(html, /href="https:\/\/holiwyn\.online\/creator\/demo-streamer"/);
  assert.doesNotMatch(html, /og:image/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("never advertises a local simulation as live", () => {
  const html = renderSocialPreview(
    "room",
    { ...room, broadcast_status_source: "local" },
    "https://holiwyn.online",
  );
  assert.match(html, /Creator room/);
  assert.doesNotMatch(html, /Live now/);
});
