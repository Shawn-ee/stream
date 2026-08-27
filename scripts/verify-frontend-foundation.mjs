import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [tokens, primitives, app, index, packageText] = await Promise.all([
  readFile("apps/web/src/design-system.css", "utf8"),
  readFile("apps/web/src/components/ui.tsx", "utf8"),
  readFile("apps/web/src/main.tsx", "utf8"),
  readFile("apps/web/index.html", "utf8"),
  readFile("package.json", "utf8"),
]);
const packageJson = JSON.parse(packageText);

for (const token of [
  "--color-background",
  "--color-surface",
  "--color-surface-hover",
  "--color-surface-secondary",
  "--color-text-primary",
  "--color-text-secondary",
  "--color-text-muted",
  "--color-border",
  "--color-divider",
  "--color-brand-primary",
  "--color-success",
  "--color-warning",
  "--color-error",
  "--color-live",
]) assert.ok(tokens.includes(token), `missing semantic token ${token}`);

assert.match(tokens, /--control-min:\s*2\.75rem/);
assert.match(tokens, /env\(safe-area-inset-top\)/);
assert.match(tokens, /env\(safe-area-inset-bottom\)/);
assert.match(tokens, /:focus-visible/);
assert.match(tokens, /prefers-reduced-motion:\s*reduce/);
for (const breakpoint of [480, 768, 1024, 1440]) {
  assert.ok(tokens.includes(`min-width: ${breakpoint}px`), `missing ${breakpoint}px breakpoint`);
}

for (const component of ["Modal", "BottomSheet", "EmptyState", "Skeleton", "LiveStreamCardSkeleton"]) {
  assert.match(primitives, new RegExp(`export function ${component}\\b`), `missing ${component}`);
}
assert.match(primitives, /role="dialog"/);
assert.match(primitives, /aria-modal="true"/);
assert.match(primitives, /event\.key === "Escape"/);

assert.match(app, /import "\.\/design-system\.css"/);
assert.match(app, /roomsLoading/);
assert.match(app, /<LiveStreamCardSkeleton/);
assert.match(app, /<EmptyState/);
assert.match(index, /<meta name="theme-color" content="#0b1020"/);
assert.equal(packageJson.scripts["verify:frontend-foundation"], "node scripts/verify-frontend-foundation.mjs");
assert.ok(packageJson.scripts["verify:staging"].includes("npm run verify:frontend-foundation"));

console.log("Mobile-first tokens, responsive breakpoints, accessible UI primitives, and discovery states verified.");
