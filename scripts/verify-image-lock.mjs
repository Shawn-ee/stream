import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const files = [
  "apps/api/Dockerfile",
  "apps/web/Dockerfile",
  "docker-compose.yml",
  "docker-compose.production.yml",
  "deploy/cloudflare-tunnel.compose.yml",
];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const references = [
    ...content.matchAll(/^FROM\s+(\S+)/gm),
    ...content.matchAll(/^\s*image:\s*(\S+)/gm),
  ].map((match) => match[1]);
  assert.ok(references.length > 0, `${file} has no container image reference`);
  for (const reference of references)
    assert.match(
      reference,
      /^[a-z0-9./_-]+:[a-zA-Z0-9._-]+@sha256:[a-f0-9]{64}$/,
      `${file} contains a floating or malformed image reference: ${reference}`,
    );
}

const lock = readFileSync("deploy/Base-Image-Lock.md", "utf8");
for (const file of files) {
  const content = readFileSync(file, "utf8");
  const digests = [...content.matchAll(/sha256:[a-f0-9]{64}/g)].map(
    ([digest]) => digest,
  );
  for (const digest of digests)
    assert.ok(lock.includes(digest), `${file} digest is absent from the lock record`);
}

console.log("All Dockerfile and Compose image references are digest-locked.");
