import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("apps/web/src/main.tsx", "utf8");
const navigation = fs.readFileSync("apps/web/src/components/navigation.tsx", "utf8");
const api = fs.readFileSync("apps/api/src/index.ts", "utf8");

const authSurface = app.slice(
  app.indexOf('<div className="auth-tabs"'),
  app.indexOf('<form className="login-form"'),
);
assert.doesNotMatch(authSurface, /demo-(?:audience|streamer|admin)/, "public sign-in must not expose role shortcuts");
assert.match(app, /isGuest \? <button[\s\S]{0,180}"Log in"/);
assert.match(app, /window\.location\.pathname === "\/broadcast"/);
assert.match(app, /window\.history\.pushState\([\s\S]{0,160}"\/broadcast"\)/);
for (const item of ["View profile", "Following", "Wallet", "Broadcast dashboard", "Settings", "Language · English", "Sign out"])
  assert.match(navigation, new RegExp(item));
assert.doesNotMatch(navigation, /Become a creator/);
assert.doesNotMatch(app, /id="creator-program"/, "unfinished creator application must not be exposed");

assert.match(navigation, /showCreatorEntry: boolean/);
assert.match(navigation, /item\.id !== "go-live" \|\| showCreatorEntry/);
assert.match(navigation, /gridTemplateColumns: `repeat\(\$\{showCreatorEntry \? 5 : 4\}/);
assert.match(navigation, /en: "Create", zh: "创作"/);

const loginRouteStart = api.indexOf('api.post<{ Body: { handle?: string; password?: string } }>(');
const loginRoute = api.slice(loginRouteStart, api.indexOf('"/api/auth/session"', loginRouteStart));
assert.match(loginRoute, /Body: \{ handle\?: string; password\?: string \}/);
assert.doesNotMatch(loginRoute, /Body:[^}]*role/, "the server, not the browser, must resolve the account role");
assert.match(loginRoute, /authenticateCredentials\(handle, password\)/);
assert.match(app, /user\.role === "admin"[\s\S]*<AdminPanel/);
assert.match(app, /<StreamerStudio[\s\S]*onLogout/);

assert.match(api, /"\/api\/broadcast\/access\/activate"/);
assert.match(api, /config\.broadcastAccessMode === "approval_required"/);
assert.match(api, /role === "streamer" && user\.role === "audience" && config\.broadcastAccessMode === "open"/);
console.log("Minimal public header, consolidated account menu, server-resolved roles, and enforced open broadcast access verified.");
