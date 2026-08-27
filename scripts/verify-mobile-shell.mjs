import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, components, styles, globalStyles, packageText] = await Promise.all([
  readFile("apps/web/src/main.tsx", "utf8"),
  readFile("apps/web/src/components/navigation.tsx", "utf8"),
  readFile("apps/web/src/mobile-shell.css", "utf8"),
  readFile("apps/web/src/styles.css", "utf8"),
  readFile("package.json", "utf8"),
]);
const packageJson = JSON.parse(packageText);

for (const component of ["MobileHeaderActions", "MobileBottomNav"]) {
  assert.match(components, new RegExp(`export function ${component}\\b`), `missing ${component}`);
  assert.match(app, new RegExp(`<${component}\\b`), `${component} is not integrated`);
}

for (const tab of ["home", "discover", "go-live", "inbox", "me"]) {
  assert.match(components, new RegExp(`id: "${tab}"`), `missing ${tab} tab`);
}
assert.match(components, /aria-current=\{active === item\.id \? "page" : undefined\}/);
assert.match(components, /aria-expanded=\{searchOpen\}/);
assert.match(components, /aria-label=\{zh \? "移动导航" : "Mobile navigation"\}/);

assert.match(app, /function navigateMobile\(tab: MobileTab\)/);
assert.match(app, /tab === "discover"[\s\S]*"#live-now"/);
assert.match(app, /tab === "go-live"[\s\S]*"#creator-program"/);
assert.match(app, /"#audience-library"/);
assert.match(app, /scrollIntoView\(\{ block: "start" \}\)/);
assert.match(app, /className=\{`audience-header-center \$\{mobileSearchOpen \? "mobile-search-open" : ""\}`\}/);
assert.match(app, /className="secondary mobile-account-signout"/);
assert.match(app, /id="live-now"/);

for (const rule of [
  /@media \(max-width: 767px\)/,
  /html\s*\{\s*scroll-behavior:\s*auto/,
  /padding-bottom:\s*calc\(5\.5rem \+ env\(safe-area-inset-bottom\)\)/,
  /\.audience-product-header \.product-account\s*\{[\s\S]*display:\s*none/,
  /\.audience-header-center\.mobile-search-open\s*\{[\s\S]*display:\s*flex/,
  /\.mobile-bottom-nav\s*\{[\s\S]*position:\s*fixed/,
  /grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/,
  /env\(safe-area-inset-left\)/,
  /env\(safe-area-inset-right\)/,
  /env\(safe-area-inset-bottom\)/,
  /min-height:\s*3\.25rem/,
  /\.mobile-bottom-nav \.mobile-go-live > span/,
  /\.mobile-account-signout\s*\{[\s\S]*display:\s*inline-flex/,
]) assert.match(styles, rule);

assert.doesNotMatch(components, /fetch\(|request\(|socket|io\(/, "navigation must not duplicate application logic");
assert.match(globalStyles, /body\s*\{[\s\S]*?min-width:\s*0/, "body must not force 320px overflow when a scrollbar is present");
assert.equal(packageJson.scripts["verify:mobile-shell"], "node scripts/verify-mobile-shell.mjs");
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:mobile-shell"));

console.log("Mobile header, expandable search, five-item safe-area navigation, account access, and existing-state routing verified.");
