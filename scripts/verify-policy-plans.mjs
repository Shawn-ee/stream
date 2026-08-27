import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = {
  moderation: "docs/Production-Moderation-Architecture.md",
  gates: "docs/Compliance-Launch-Gates.md",
  sources: "docs/Compliance-Source-Register.md",
};
const content = Object.fromEntries(
  await Promise.all(
    Object.entries(files).map(async ([key, path]) => [key, await readFile(path, "utf8")]),
  ),
);

for (const [name, document] of Object.entries(content)) {
  assert.match(document, /not legal advice|not a claim of compliance|not a complete legal inventory/i, `${name} must disclaim legal advice/completeness`);
}
for (const term of [
  "Roles and separation of duties",
  "Case and evidence model",
  "Severity and response targets",
  "Critical incident playbooks",
  "Enforcement and appeals",
  "Data retention decision matrix",
  "Exit gate",
]) assert.ok(content.moderation.includes(term), `moderation plan missing ${term}`);
for (let gate = 0; gate <= 8; gate += 1)
  assert.ok(content.gates.includes(`Gate ${gate}`), `launch checklist missing Gate ${gate}`);
for (const boundary of [
  "No identity evidence is collected by the current prototype",
  "Do not assume Stripe can process this platform",
  "Any missing or conditional approval means no launch",
]) assert.ok(content.gates.includes(boundary), `launch gates missing: ${boundary}`);

for (const officialHost of [
  "uscode.house.gov",
  "ncmec.org",
  "justice.gov",
  "ftc.gov",
  "oag.ca.gov",
  "supremecourt.gov",
  "stripe.com",
]) assert.ok(content.sources.includes(officialHost), `source register missing ${officialHost}`);

assert.equal(/platform is compliant|fully compliant|legally approved/i.test(Object.values(content).join("\n")), false);
console.log("Moderation architecture, compliance launch gates, official-source register, no-go boundaries, and non-compliance disclaimer verified.");
