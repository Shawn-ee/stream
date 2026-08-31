import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const nginx = await readFile("deploy/nginx.conf", "utf8");
const route = nginx.match(/location = \/api\/streamer\/avatar\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? "";
const thumbnailRoute = nginx.match(/location = \/api\/streamer\/stream-thumbnail\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? "";
const limits = [...nginx.matchAll(/client_max_body_size\s+([^;]+);/g)].map((match) => match[1]);

assert.match(nginx, /server\s*\{[\s\S]*client_max_body_size 64k;/, "global API body limit must remain bounded");
assert.match(route, /client_max_body_size 6m;/, "avatar route must admit the API's 5 MB file plus multipart overhead");
assert.match(route, /proxy_pass http:\/\/api:3001;/);
assert.match(thumbnailRoute, /client_max_body_size 7m;/, "thumbnail route must admit the API's 6 MB file plus multipart overhead");
assert.match(thumbnailRoute, /proxy_pass http:\/\/api:3001;/);
assert.deepEqual(limits, ["64k", "6m", "7m"], "only the exact bounded global, avatar, and thumbnail limits may be configured");

console.log("Avatar and stream-thumbnail routes have explicit bounded upload allowances.");
