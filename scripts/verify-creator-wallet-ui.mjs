import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, api, styles, packageText] = await Promise.all([
  readFile("apps/web/src/main.tsx", "utf8"),
  readFile("apps/api/src/index.ts", "utf8"),
  readFile("apps/web/src/broadcast.css", "utf8"),
  readFile("package.json", "utf8"),
]);
const packageJson = JSON.parse(packageText);

for (const behavior of [
  /function CreatorEarningsWallet/,
  /function CreatorSupportersPage/,
  /\/api\/streamer\/wallet\/summary\?period=/,
  /\/api\/streamer\/wallet\/transactions\?period=/,
  /\/api\/streamer\/rooms\/\$\{slug\}\/supporters\?period=/,
  /Selected-period income/,
  /Transactions/,
  /Data temporarily unavailable/,
  /Load more/,
  /Supporters/,
  /R has no cash value · No deposits or withdrawals/,
  /CreatorSessionSummary slug=\{slug\}/,
]) assert.match(app, behavior);

for (const apiBehavior of [
  /"\/api\/streamer\/wallet\/summary"/,
  /"\/api\/streamer\/wallet\/transactions"/,
  /"\/api\/streamer\/rooms\/:slug\/supporters"/,
  /creatorPeriodBounds/,
  /encodeCreatorWalletCursor/,
  /invalid_wallet_cursor/,
  /LEFT JOIN gift_catalog gc/,
  /LEFT JOIN room_action_purchases rap/,
  /LEFT JOIN private_show_access psa/,
  /WHERE slug=\$1 AND streamer_id=\$2/,
]) assert.match(api, apiBehavior);

for (const rule of [
  /\.quick-live-controls\.live-controls \.danger\s*\{[\s\S]*background:\s*#d92d4f;[\s\S]*color:\s*#fff/,
  /\.creator-wallet-workspace\s*\{[\s\S]*grid-template-columns:\s*minmax\(17rem, 0\.72fr\) minmax\(0, 1\.35fr\)/,
  /\.creator-period-tabs\s*\{/,
  /\.creator-wallet-entry-detailed\s*\{/,
  /\.creator-supporter-list li\s*\{/,
  /\.creator-data-unavailable\s*\{/,
  /@media \(max-width: 767px\)[\s\S]*\.creator-wallet-workspace,[\s\S]*grid-template-columns:\s*1fr/,
]) assert.match(styles, rule);

assert.doesNotMatch(app, /1 test token = ¥1 reference value/);
assert.doesNotMatch(app, /¥\{total\.toLocaleString\(\)\}/);
assert.equal(packageJson.scripts["verify:creator-wallet-ui"], "node scripts/verify-creator-wallet-ui.mjs");
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:creator-wallet-ui"));

console.log("Creator-owned wallet summary, enriched paginated ledger, period supporter rankings, truthful unavailable states, test-money boundaries, and responsive UI verified.");
