import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const [app,navigation,styles,globalStyles]=await Promise.all([readFile("apps/web/src/main.tsx","utf8"),readFile("apps/web/src/components/navigation.tsx","utf8"),readFile("apps/web/src/discovery.css","utf8"),readFile("apps/web/src/styles.css","utf8")]);
assert.match(app,/<MobileHeaderActions\b/);assert.doesNotMatch(app,/<MobileBottomNav\b|function navigateMobile/);
assert.match(navigation,/aria-expanded=\{searchOpen\}/);assert.match(navigation,/event\.key === "Escape"/);assert.match(navigation,/role="menu"/);
assert.match(app,/className=\{`audience-header-center \$\{mobileSearchOpen \? "mobile-search-open" : ""\}`\}/);assert.match(styles,/@media \(max-width: 767px\)/);
assert.match(globalStyles,/body\s*\{[\s\S]*?min-width:\s*0/);
console.log("Compact mobile header, expandable global search, accessible account menu, and no redundant bottom navigation verified.");
