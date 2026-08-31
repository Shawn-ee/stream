import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, components, styles, packageText] = await Promise.all([
  readFile("apps/web/src/main.tsx", "utf8"),
  readFile("apps/web/src/components/room.tsx", "utf8"),
  readFile("apps/web/src/room.css", "utf8"),
  readFile("package.json", "utf8"),
]);
const packageJson = JSON.parse(packageText);

for (const component of ["RoomCreatorBar", "LiveChatPanel"]) {
  assert.match(components, new RegExp(`export function ${component}\\b`), `missing ${component}`);
  assert.match(app, new RegExp(`<${component}\\b`), `${component} is not integrated`);
}

assert.match(app, /import "\.\/room\.css"/);
assert.match(app, /<WhepPlayer slug=\{room\.slug\} active t=\{t\} \/>/);
assert.match(app, /title="Cloudflare Stream playback"/);
assert.match(app, /<VideoActivityOverlay messages=\{messages\} gift=\{activeGift\} t=\{t\} \/>/);
assert.match(app, /id="room-gifts"/);
assert.match(app, /onFollow=\{\(\) => void follow\(\)\}/);
assert.match(app, /onReport=\{\(\) => void report\(\)\}/);

for (const semantic of [
  /aria-pressed=\{following\}/,
  /<details className="room-more-actions">/,
  /aria-live="polite"/,
  /aria-relevant="additions"/,
  /inputId = "room-chat-input"/,
  /htmlFor=\{inputId\}/,
  /className="room-gift-jump" onClick=\{onGift\}/,
]) assert.match(components, semantic);

for (const layout of [
  /grid-template-columns:\s*minmax\(0, 1fr\) 21\.5rem/,
  /"media chat"/,
  /"creator chat"/,
  /"gifts chat"/,
  /\.room-media-panel \.player,[\s\S]*aspect-ratio:\s*16 \/ 9/,
  /\.room-chat\s*\{[\s\S]*position:\s*sticky/,
  /\.room-chat\s*\{[\s\S]*height:\s*calc\(100vh - 6\.5rem\)/,
  /@media \(max-width: 1023px\)[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/,
  /@media \(max-width: 767px\)/,
  /\.gift-tray-heading\s*\{[\s\S]*flex-wrap:\s*wrap/,
  /\.gift-sound-toggle\s*\{[\s\S]*white-space:\s*normal/,
  /min-height:\s*var\(--control-min\)/,
]) assert.match(styles, layout);

assert.doesNotMatch(components, /fetch\(|request\(|socket|io\(/, "room presentation components must not duplicate data or realtime logic");
assert.equal(packageJson.scripts["verify:desktop-room"], "node scripts/verify-desktop-room.mjs");
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:desktop-room"));

console.log("Video-first desktop room, creator bar, sticky live chat, responsive fallback, accessibility, and preserved media paths verified.");
