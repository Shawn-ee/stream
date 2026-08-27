import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const audit = await readFile("docs/Six-Phase-Completion-Audit.md", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

for (let phase = 1; phase <= 6; phase += 1) {
  assert.match(audit, new RegExp(`\\| ${phase}\\.`), `audit must include phase ${phase}`);
}
for (const evidence of [
  "verify-account-lifecycle.mjs",
  "verify-creator-applications.mjs",
  "verify-audience-retention.mjs",
  "verify-gift-polish.mjs",
  "verify-policy-plans.mjs",
  "verify-commercial-design.mjs",
]) {
  assert.ok(audit.includes(evidence), `audit missing focused evidence ${evidence}`);
  await access(`scripts/${evidence}`);
}
for (const command of [
  "verify:account-lifecycle",
  "verify:creator-applications",
  "verify:audience-retention",
  "verify:gift-polish",
  "verify:policy-plans",
  "verify:commercial-design",
]) {
  assert.ok(packageJson.scripts[command], `package missing ${command}`);
  assert.ok(packageJson.scripts["verify:staging"].includes(`npm run ${command}`), `staging gate missing ${command}`);
}
for (const boundary of [
  "full persistent goal is therefore **not complete**",
  "No narrower local test can substitute",
  "Not implemented; approval prerequisites missing",
  "fresh owner approval",
]) assert.match(audit, new RegExp(boundary.replaceAll("*", "\\*"), "i"));

const questionnaire = await readFile("docs/Commercial-Processor-Scope-Questionnaire.md", "utf8");
for (const disclosure of [
  "sexually explicit/adult content",
  "private shows",
  "token purchase",
  "Merchant of record",
  "Chargeback",
  "KYC/KYB",
  "Owner separately approves contacting",
]) assert.match(questionnaire, new RegExp(disclosure, "i"), `processor scope missing ${disclosure}`);

assert.equal(/Stripe is approved|payments are live|goal is complete/i.test(audit + questionnaire), false);
console.log("Six-phase evidence map, focused staging coverage, incomplete commercial boundary, and processor-scope disclosures verified.");
