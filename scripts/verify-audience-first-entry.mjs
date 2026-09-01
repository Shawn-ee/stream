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
assert.match(app, /user\.role === "audience" && user\.ageAcknowledged && !isGuest[\s\S]{0,300}Become a creator/);
assert.match(app, /id="creator-program" className="account-recovery account-creator-program"/);
assert.match(app, /user\.role === "audience" \? <div id="creator-program"/);
assert.doesNotMatch(app, /!isGuest \? <div id="creator-program"><CreatorApplication/, "creator application must not interrupt discovery");

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

console.log("Audience-first public entry, server-resolved roles, authenticated creator application, and approved-role routing verified.");
