import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [component, app, styles, packageText] = await Promise.all([
  readFile("apps/web/src/components/creator-onboarding.tsx", "utf8"),
  readFile("apps/web/src/main.tsx", "utf8"),
  readFile("apps/web/src/styles.css", "utf8"),
  readFile("package.json", "utf8"),
]);
const packageJson = JSON.parse(packageText);

assert.match(component, /onboarding-step-\$\{visible\}/);
for (const step of ["profile", "agreement", "identity", "review"])
  assert.match(component, new RegExp(`visible === "${step}"`));
assert.match(styles, /\.creator-onboarding\.workspace[\s\S]*max-width: 920px/);
assert.match(styles, /\.creator-onboarding \.onboarding-heading h1[\s\S]*2\.55rem/);
assert.match(styles, /\.creator-onboarding \.onboarding-form textarea[\s\S]*max-height: 96px/);
assert.match(styles, /\.creator-onboarding \.review-panel dl[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(styles, /@media \(max-width: 767px\)[\s\S]*\.creator-onboarding\.workspace[\s\S]*width: 100%/);
assert.match(styles, /\.creator-onboarding \.onboarding-actions > button[\s\S]*width: 100%/);

assert.match(app, /creator-room-empty-card/);
assert.match(app, /creator-first-room-form/);
assert.match(app, /creator-first-room-submit/);
assert.match(app, /Set the basics now\. Your draft stays private until you publish it\./);
assert.match(styles, /\.creator-room-empty-card[\s\S]*min\(920px, 100%\)/);
assert.match(styles, /\.creator-room-empty \.creator-first-room-submit[\s\S]*justify-self: end/);
assert.match(app, /request\("\/api\/studio\/rooms", \{ method: "POST"/);

assert.equal(packageJson.scripts["verify:creator-setup-layout"], "node scripts/verify-creator-setup-layout.mjs");
assert.ok(packageJson.scripts["preverify:staging"].includes("npm run verify:creator-setup-layout"));
console.log("Compact four-step creator setup, responsive mobile flow, and bounded first-room setup verified.");
