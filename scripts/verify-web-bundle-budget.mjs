import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const assetDirectory = "apps/web/dist/assets";
const files = await readdir(assetDirectory);
const javascriptFiles = files.filter((file) => file.endsWith(".js"));
const cssFiles = files.filter((file) => file.endsWith(".css"));

assert.ok(javascriptFiles.length, "production build must emit JavaScript");
assert.ok(cssFiles.length, "production build must emit CSS");
assert.equal(files.some((file) => file.endsWith(".map")), false, "production source maps are not expected in the public bundle");

async function totalSize(names) {
  const contents = await Promise.all(names.map((name) => readFile(`${assetDirectory}/${name}`)));
  return {
    raw: contents.reduce((sum, value) => sum + value.byteLength, 0),
    gzip: contents.reduce((sum, value) => sum + gzipSync(value).byteLength, 0),
  };
}

const javascript = await totalSize(javascriptFiles);
const css = await totalSize(cssFiles);
const kib = (bytes) => Math.round((bytes / 1024) * 10) / 10;

assert.ok(javascript.raw <= 450 * 1024, `JavaScript budget exceeded: ${kib(javascript.raw)} KiB > 450 KiB`);
assert.ok(css.raw <= 135 * 1024, `CSS budget exceeded: ${kib(css.raw)} KiB > 135 KiB`);
assert.ok(javascript.gzip + css.gzip <= 149 * 1024, `compressed asset budget exceeded: ${kib(javascript.gzip + css.gzip)} KiB > 149 KiB`);

console.log(`Web bundle budget passed: JS ${kib(javascript.raw)} KiB raw/${kib(javascript.gzip)} KiB gzip; CSS ${kib(css.raw)} KiB raw/${kib(css.gzip)} KiB gzip.`);
