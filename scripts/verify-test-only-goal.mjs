import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";

const goal = await readFile("GOAL.md", "utf8");
const audit = await readFile("docs/Test-Only-Product-Completion-Audit.md", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

assert.match(goal, /Active four-phase product goal/);
assert.match(goal, /Explicitly skipped and out of scope/);
for (const excluded of [
  "Legal/compliance implementation",
  "Real token sales",
  "Stripe or another payment processor",
  "creator payouts",
  "entirely new owner-scoped goal",
]) assert.match(goal, new RegExp(excluded, "i"), `goal boundary missing ${excluded}`);

for (const evidence of [
  "verify-account-lifecycle.mjs",
  "verify-creator-applications.mjs",
  "verify-audience-retention.mjs",
  "verify-gift-polish.mjs",
]) {
  assert.ok(audit.includes(evidence), `audit missing ${evidence}`);
  await access(`scripts/${evidence}`);
}
for (const command of [
  "verify:account-lifecycle",
  "verify:creator-applications",
  "verify:audience-retention",
  "verify:gift-polish",
]) assert.ok(packageJson.scripts["verify:staging"].includes(`npm run ${command}`), `staging missing ${command}`);

for (const boundary of [
  "synthetic test coins",
  "There is no real purchase",
  "Archived moderation and commercial planning documents are not active requirements",
  "no payment credential or real-money migration",
]) assert.match(audit, new RegExp(boundary, "i"), `audit boundary missing ${boundary}`);

const migrations = await readdir("apps/api/src/db/migrations");
assert.equal(migrations.some((name) => /stripe|payment|payout|commercial|money_ledger/i.test(name)), false);
console.log("Revised four-phase test-only goal, focused verifier coverage, explicit exclusions, and no commercial migration verified.");
