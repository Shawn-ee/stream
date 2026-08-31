import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, roomComponents, ui, styles, packageText] = await Promise.all([
  readFile("apps/web/src/main.tsx", "utf8"),
  readFile("apps/web/src/components/room.tsx", "utf8"),
  readFile("apps/web/src/components/ui.tsx", "utf8"),
  readFile("apps/web/src/room.css", "utf8"),
  readFile("package.json", "utf8"),
]);
const packageJson = JSON.parse(packageText);

for (const component of ["MobileRoomOverlay", "LiveChatPanel"]) {
  assert.match(roomComponents, new RegExp(`export function ${component}\\b`), `missing ${component}`);
  assert.match(app, new RegExp(`<${component}\\b`), `${component} is not integrated`);
}

assert.match(app, /useState<"chat" \| "gifts" \| null>\(null\)/);
assert.match(app, /<BottomSheet[\s\S]*open=\{mobileSheet === "chat"\}/);
assert.match(app, /<BottomSheet[\s\S]*open=\{authenticated && supportAvailable && mobileSheet === "gifts"\}/);
assert.match(app, /const supportAvailable = broadcast\.state === "live"/);
assert.match(app, /inputId="room-chat-input-sheet"/);
assert.match(app, /className="desktop-room-chat"/);
assert.match(app, /className="room-gift-tray desktop-room-gifts"/);
assert.match(app, /className="mobile-room-recommendations"/);
assert.match(app, /recommendations=\{rooms\.filter\(\(item\) => item\.slug !== room\.slug\)\}/);
assert.match(app, /hidden=\{Boolean\(room \|\| profileRoom\)\}/);

for (const control of [/onChat/, /onGift/, /onFollow/, /onBack/, /onReport/]) {
  assert.match(roomComponents, control);
}
assert.match(roomComponents, /aria-pressed=\{following\}/);
assert.match(roomComponents, /minLength|inputId/);
assert.doesNotMatch(roomComponents, /fetch\(|request\(|socket|io\(/, "mobile room controls must not duplicate product logic");
assert.match(ui, /closeLabel\?: string/);
assert.match(ui, /aria-label=\{closeLabel \?\? `Close \$\{title\}`\}/);

for (const rule of [
  /\.mobile-room-overlay,[\s\S]*\.mobile-room-recommendations\s*\{\s*display:\s*none/,
  /@media \(max-width: 767px\), \(orientation: landscape\) and \(max-height: 600px\) and \(max-width: 932px\)/,
  /\.room-open \.audience-product-header\s*\{\s*display:\s*none/,
  /\.desktop-room-chat,[\s\S]*\.desktop-room-gifts\s*\{\s*display:\s*none/,
  /\.room-media-panel\s*\{[\s\S]*height:\s*min\(68dvh, 40rem\)/,
  /\.mobile-room-action-rail\s*\{[\s\S]*position:\s*absolute/,
  /\.mobile-room-topbar button,[\s\S]*min-width:\s*var\(--control-min\)/,
  /\.room-chat-sheet\s*\{[\s\S]*height:\s*min\(62dvh, 34rem\)/,
  /\.mobile-room-recommendations\s*\{[\s\S]*grid-area:\s*recommendations/,
  /@media \(orientation: landscape\) and \(max-height: 600px\) and \(max-width: 932px\)[\s\S]*height:\s*100dvh/,
]) assert.match(styles, rule);

for (const preservedPath of [
  /<WhepPlayer slug=\{room\.slug\} active t=\{t\}/,
  /title="Cloudflare Stream playback"/,
  /socketRef\.current\.emit/,
  /async function sendGift/,
  /async function follow/,
]) assert.match(app, preservedPath);

assert.equal(packageJson.scripts["verify:mobile-room"], "node scripts/verify-mobile-room.mjs");
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:mobile-room"));

console.log("Immersive mobile room, creator actions, chat/gift sheets, recommendations, landscape mode, and preserved product paths verified.");
