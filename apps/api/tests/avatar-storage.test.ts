import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import {
  AvatarUploadError,
  avatarFilenameFromUrl,
  avatarPath,
  removeStoredAvatar,
  saveAvatar,
} from "../src/avatar-storage.js";

const userId = "10000000-0000-4000-8000-000000000002";

test("normalizes an accepted avatar to a bounded metadata-free WebP", async () => {
  const storagePath = await mkdtemp(path.join(os.tmpdir(), "holiwyn-avatar-"));
  try {
    const source = await sharp({
      create: { width: 900, height: 600, channels: 3, background: "#7c5cfc" },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const saved = await saveAvatar({
      storagePath,
      userId,
      mimeType: "image/jpeg",
      buffer: source,
    });
    assert.match(saved.url, /^\/api\/media\/avatars\/avatar-/);
    assert.equal(avatarFilenameFromUrl(saved.url), saved.filename);
    const output = await readFile(path.join(storagePath, saved.filename));
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 512);
    assert.equal(metadata.height, 512);
    assert.equal(metadata.exif, undefined);
    await removeStoredAvatar(storagePath, saved.url);
    await assert.rejects(readFile(path.join(storagePath, saved.filename)));
  } finally {
    await rm(storagePath, { recursive: true, force: true });
  }
});

test("rejects unsupported or invalid image input and path traversal", async () => {
  const storagePath = await mkdtemp(path.join(os.tmpdir(), "holiwyn-avatar-"));
  try {
    await assert.rejects(
      saveAvatar({ storagePath, userId, mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") }),
      (error: unknown) => error instanceof AvatarUploadError && error.code === "avatar_type_not_allowed",
    );
    await assert.rejects(
      saveAvatar({ storagePath, userId, mimeType: "image/png", buffer: Buffer.from("not an image") }),
      (error: unknown) => error instanceof AvatarUploadError && error.code === "avatar_image_invalid",
    );
    await assert.rejects(
      saveAvatar({
        storagePath,
        userId,
        mimeType: "image/png",
        buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'),
      }),
      (error: unknown) => error instanceof AvatarUploadError && error.code === "avatar_image_invalid",
    );
    assert.equal(avatarPath(storagePath, "../secret.webp"), null);
    assert.equal(avatarFilenameFromUrl("https://example.com/avatar.webp"), null);
  } finally {
    await rm(storagePath, { recursive: true, force: true });
  }
});

test("honors the selected avatar crop focus", async () => {
  const storagePath = await mkdtemp(path.join(os.tmpdir(), "holiwyn-avatar-focus-"));
  try {
    const left = await sharp({ create: { width: 500, height: 500, channels: 3, background: "#ff0000" } }).png().toBuffer();
    const right = await sharp({ create: { width: 500, height: 500, channels: 3, background: "#0000ff" } }).png().toBuffer();
    const source = await sharp({ create: { width: 1000, height: 500, channels: 3, background: "#000000" } })
      .composite([{ input: left, left: 0, top: 0 }, { input: right, left: 500, top: 0 }])
      .png()
      .toBuffer();
    const leftCrop = await saveAvatar({ storagePath, userId, mimeType: "image/png", buffer: source, focusX: 0, focusY: 0.5 });
    const rightCrop = await saveAvatar({ storagePath, userId, mimeType: "image/png", buffer: source, focusX: 1, focusY: 0.5 });
    const leftStats = await sharp(await readFile(path.join(storagePath, leftCrop.filename))).stats();
    const rightStats = await sharp(await readFile(path.join(storagePath, rightCrop.filename))).stats();
    assert.ok(leftStats.channels[0].mean > leftStats.channels[2].mean, "left focus should retain the red side");
    assert.ok(rightStats.channels[2].mean > rightStats.channels[0].mean, "right focus should retain the blue side");
  } finally {
    await rm(storagePath, { recursive: true, force: true });
  }
});
