import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("apps/web/src/main.tsx", "utf8");
const navigation = fs.readFileSync("apps/web/src/components/navigation.tsx", "utf8");
const api = fs.readFileSync("apps/api/src/index.ts", "utf8");

const authSurface = app.slice(app.indexOf('<Modal'), app.indexOf('</Modal>'));
assert.doesNotMatch(authSurface, /demo-(?:audience|streamer|admin)/, "public sign-in must not expose role shortcuts");
assert.match(app, /isGuest \? <button[\s\S]{0,180}"Log in"/);
assert.doesNotMatch(app, /className="header-go-live"/, "audience header must not expose Go live");
for (const item of ["Following", "Activity", "Notifications", "Wallet", "Streamer Studio", "Become a creator", "Settings", "Sign out"])
  assert.match(navigation, new RegExp(item));
assert.doesNotMatch(navigation, /View public profile/);
assert.match(app, /<CreatorOnboarding/);

assert.doesNotMatch(app, /<MobileBottomNav\b/);

const loginRouteStart = api.indexOf('api.post<{ Body: { handle?: string; password?: string } }>(');
const loginRoute = api.slice(loginRouteStart, api.indexOf('"/api/auth/session"', loginRouteStart));
assert.match(loginRoute, /Body: \{ handle\?: string; password\?: string \}/);
assert.doesNotMatch(loginRoute, /Body:[^}]*role/, "the server, not the browser, must resolve the account role");
assert.match(loginRoute, /authenticateCredentials\(handle, password\)/);
assert.match(app, /user\.role === "admin"[\s\S]*<AdminPanel/);
assert.match(app, /<StreamerStudio[\s\S]*onLogout/);

assert.doesNotMatch(api, /"\/api\/broadcast\/access\/activate"/);
assert.match(api, /"\/api\/creator\/onboarding\/activate"/);
assert.match(api, /SELECT status FROM creator_accounts WHERE user_id=\$1/);
console.log("Minimal public header, consolidated account menu, creator-only entry, and server-authoritative onboarding verified.");
