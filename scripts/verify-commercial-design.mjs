import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = {
  design: "docs/Commercial-System-Design.md",
  threat: "docs/Money-Movement-Threat-Model.md",
  checklist: "docs/Commercial-Activation-Checklist.md",
};
const content = Object.fromEntries(
  await Promise.all(Object.entries(files).map(async ([key, path]) => [key, await readFile(path, "utf8")])),
);
const all = Object.values(content).join("\n");

for (const [name, document] of Object.entries(content)) {
  assert.match(document, /design-only|design only|inactive planning|no-go/i, `${name} must state inactive design status`);
  assert.match(document, /not legal|not a claim of compliance/i, `${name} must disclaim legal advice/compliance`);
}
for (const invariant of [
  "immutable, balanced, double-entry",
  "test_ledger_entries",
  "return URL never grants tokens",
  "signed webhook inbox",
  "idempotent",
  "Purchase order:",
  "Token grant:",
  "Creator earning:",
  "Payout request:",
  "chargeback",
  "negative-balance",
  "reconciliation",
  "KYC",
  "sanctions",
  "tax",
  "kill switches",
]) assert.ok(content.design.toLowerCase().includes(invariant.toLowerCase()), `commercial design missing ${invariant}`);

for (const table of [
  "money_accounts",
  "money_journals",
  "money_entries",
  "purchase_orders",
  "processor_events",
  "token_grants",
  "creator_earnings",
  "payout_requests",
  "commercial_configuration_versions",
  "reconciliation_runs",
]) assert.ok(content.design.includes(`\`${table}\``), `commercial design missing proposed table ${table}`);

for (const threat of [
  "Card testing",
  "Account takeover",
  "Self-gifting",
  "Payout destination takeover",
  "Insider theft",
  "KYC/sanctions evasion",
  "Reconciliation suppression",
]) assert.ok(content.threat.includes(threat), `threat model missing ${threat}`);

for (const gate of [
  "written approval for the exact disclosed",
  "no business/content misclassification",
  "browser redirects never grant tokens",
  "Fresh owner approval",
  "Not authorized",
  "No credentials or resources may be changed",
]) assert.match(all, new RegExp(gate, "i"), `activation safeguards missing: ${gate}`);

assert.match(all, /Stripe is (?:a )?\*\*no-go\*\*|Stripe is treated as no-go/i);
assert.match(all, /adult content\/adult live-chat|adult content\/live-chat|adult live-chat/i);
assert.equal(/commercial system is compliant|payments are approved|stripe is approved/i.test(all), false);

console.log("Inactive commercial design, immutable balanced ledger, webhook authority, fraud/reconciliation controls, processor no-go boundary, and staged approvals verified.");
