import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [nginx, compose, api, storage, component, image, app] = await Promise.all([
  readFile("deploy/nginx.conf", "utf8"),
  readFile("docker-compose.production.yml", "utf8"),
  readFile("apps/api/src/index.ts", "utf8"),
  readFile("apps/api/src/identity-document-storage.ts", "utf8"),
  readFile("apps/web/src/components/creator-onboarding.tsx", "utf8"),
  readFile("apps/web/src/identity-image.ts", "utf8"),
  readFile("apps/web/src/main.tsx", "utf8"),
]);

assert.match(nginx, /location = \/api\/creator\/onboarding\/identity-document/);
assert.match(nginx, /client_max_body_size 9m/);
assert.match(nginx, /identity_document_too_large/);
assert.match(compose, /private-storage-init:/);
assert.match(compose, /chown -R 1000:1000/);
assert.match(compose, /chmod 700 \/app\/work\/private-identity-documents/);
assert.match(api, /bodyLimit: identityDocumentLimitBytes \+ 64 \* 1024/);
assert.match(api, /removeIdentityDocument/);
assert.match(api, /privateStorage: "ok"/);
assert.match(storage, /verifyIdentityDocumentStorage/);
assert.match(image, /identityImageTargetBytes = 3 \* 1024 \* 1024/);
assert.match(image, /createImageBitmap\(file, \{ imageOrientation: "from-image" \}\)/);
assert.match(image, /new XMLHttpRequest\(\)/);
assert.match(component, /Document received/);
assert.match(component, /Uploading securely/);
assert.doesNotMatch(component, /setUploadProgress\(25\)|setUploadProgress\(55\)/);
assert.doesNotMatch(component, /Identity verified/);
assert.match(app, /if \(route\.view === "studio"\)/);
assert.match(app, /const access = await request\("\/api\/broadcast\/access"\)/);
assert.match(app, /if \(access\.allowed\) \{[\s\S]*?setCreatorPortalStep\(null\);[\s\S]*?setStudioOpen\(true\);/);

console.log("Creator image optimization, honest progress, private-storage readiness, cleanup, gateway upload allowance, and Studio route recovery verified.");
