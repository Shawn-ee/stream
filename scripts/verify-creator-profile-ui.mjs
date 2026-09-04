import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, profile, room, styles, packageText] = await Promise.all([
  readFile("apps/web/src/main.tsx", "utf8"),
  readFile("apps/web/src/components/profile.tsx", "utf8"),
  readFile("apps/web/src/components/room.tsx", "utf8"),
  readFile("apps/web/src/profile.css", "utf8"),
  readFile("package.json", "utf8"),
]);
const packageJson = JSON.parse(packageText);

assert.match(app, /function PublicCreatorProfileView\(/);
assert.match(app, /Promise\.all\(\[[\s\S]*\/api\/streamers\/\$\{room\.streamer_id\}[\s\S]*follow-status/);
assert.match(app, /method: nextFollowing \? "POST" : "DELETE"/);
assert.match(app, /follower_count: typeof result\?\.followerCount === "number"/);
assert.match(app, /Math\.max\(0, current\.follower_count/);
assert.match(app, /profile\.broadcast_state \?\? room\.broadcast_state/);
assert.match(app, /<CreatorProfileSurface/);
assert.match(app, /showProfile\(room\)/);
assert.match(app, /onProfile=\{onOpenProfile\}/);
assert.match(app, /<RoomCreatorProfileCard/);

for (const supportedField of [
  "displayName",
  "handle",
  "bio",
  "languages",
  "tags",
  "followerCount",
  "scheduleText",
  "nextStreamAt",
  "scheduleTimezone",
  "roomTitle",
]) assert.match(profile, new RegExp(supportedField), `missing supported field ${supportedField}`);

assert.match(profile, /state: "live" \| "connecting" \| "offline" \| "unavailable"/);
assert.doesNotMatch(profile, /CURRENT ROOM|KEEP DISCOVERING|Meet \{displayName\}|Regular schedule/);
assert.match(profile, /Back to discovery/);
assert.match(profile, /aria-pressed=\{following\}/);
assert.match(profile, /toLocaleString/);
assert.match(profile, /state === "live"\?<button[^>]+creator-profile-watch live/);
assert.equal((profile.match(/<ShareButton/g) ?? []).length, 1, "creator profile should expose one share action");
assert.doesNotMatch(profile, /fetch\(|request\(|socket|io\(/, "presentational profile must not own network state");
assert.doesNotMatch(profile, /verified|instagram|tiktok|recent stream|clips/i, "unsupported profile data must not be invented");

assert.match(room, /className="room-creator-profile-link"/);
assert.match(room, /className="mobile-room-profile-link"/);
assert.match(room, /className="room-creator-name-link"/);

for (const rule of [
  /\.creator-profile-hero-art\s*\{[\s\S]*linear-gradient/,
  /\.creator-profile-information\s*\{[\s\S]*grid-template-columns/,
  /@media \(max-width: 767px\)[\s\S]*\.creator-profile-information[\s\S]*grid-template-columns:\s*1fr/,
  /\.creator-profile-actions button\s*\{[\s\S]*min-height:\s*3\.25rem/,
  /env\(safe-area-inset-bottom\)/,
  /@media \(prefers-reduced-motion: reduce\)/,
]) assert.match(styles, rule);

assert.equal(packageJson.scripts["verify:creator-profile-ui"], "node scripts/verify-creator-profile-ui.mjs");
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:creator-profile-ui"));

console.log("Simplified responsive creator profile, truthful live-only room action, single sharing action, and unsupported-data boundaries verified.");
