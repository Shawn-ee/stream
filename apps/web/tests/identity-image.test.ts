import assert from "node:assert/strict";
import test from "node:test";
import { fitIdentityImage, identityImageMaxEdge, identityImageMaxPixels, identityImageSourceLimitBytes, identityImageTargetBytes, identityUploadLimitBytes } from "../src/identity-image.js";

test("identity image policy keeps a strict server limit and a smaller optimization target", () => {
  assert.equal(identityUploadLimitBytes, 8 * 1024 * 1024);
  assert.ok(identityImageTargetBytes < identityUploadLimitBytes);
  assert.ok(identityImageSourceLimitBytes > identityUploadLimitBytes);
  assert.equal(identityImageMaxPixels, 40_000_000);
});

test("identity image dimensions preserve aspect ratio within 2600 pixels", () => {
  assert.deepEqual(fitIdentityImage(5200, 3900), { width: 2600, height: 1950 });
  assert.deepEqual(fitIdentityImage(1200, 1800), { width: 1200, height: 1800 });
  assert.equal(identityImageMaxEdge, 2600);
});
