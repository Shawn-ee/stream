import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import {
  StreamThumbnailUploadError,
  removeStoredStreamThumbnail,
  saveStreamThumbnail,
  streamThumbnailFilenameFromUrl,
  streamThumbnailPath,
} from "../src/stream-thumbnail-storage.js";

const userId = "10000000-0000-4000-8000-000000000002";

test("normalizes a stream thumbnail to 16:9 metadata-free WebP", async () => {
  const storagePath = await mkdtemp(path.join(os.tmpdir(), "holiwyn-thumbnail-"));
  try {
    const source = await sharp({
      create: { width: 900, height: 1200, channels: 3, background: "#ff4d6d" },
    }).png().toBuffer();
    const saved = await saveStreamThumbnail({ storagePath, userId, mimeType: "image/png", buffer: source });
    assert.match(saved.url, /^\/api\/media\/stream-thumbnails\/stream-thumbnail-/);
    assert.equal(streamThumbnailFilenameFromUrl(saved.url), saved.filename);
    const output = await readFile(path.join(storagePath, saved.filename));
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 640);
    assert.equal(metadata.height, 360);
    assert.equal(metadata.exif, undefined);
    assert.ok(output.length < 512 * 1024);
    await removeStoredStreamThumbnail(storagePath, saved.url);
    await assert.rejects(readFile(path.join(storagePath, saved.filename)));
  } finally {
    await rm(storagePath, { recursive: true, force: true });
  }
});

test("rejects unsupported thumbnail input and path traversal", async () => {
  const storagePath = await mkdtemp(path.join(os.tmpdir(), "holiwyn-thumbnail-"));
  try {
    await assert.rejects(
      saveStreamThumbnail({ storagePath, userId, mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") }),
      (error: unknown) => error instanceof StreamThumbnailUploadError && error.code === "thumbnail_type_not_allowed",
    );
    await assert.rejects(
      saveStreamThumbnail({ storagePath, userId, mimeType: "image/jpeg", buffer: Buffer.from("not an image") }),
      (error: unknown) => error instanceof StreamThumbnailUploadError && error.code === "thumbnail_image_invalid",
    );
    assert.equal(streamThumbnailPath(storagePath, "../secret.webp"), null);
    assert.equal(streamThumbnailFilenameFromUrl("https://example.com/image.webp"), null);
  } finally {
    await rm(storagePath, { recursive: true, force: true });
  }
});
