import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const streamThumbnailUploadLimitBytes = 6 * 1024 * 1024;
const thumbnailPattern = /^stream-thumbnail-[0-9a-f-]{36}-[0-9a-f-]{36}\.webp$/i;
const acceptedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export class StreamThumbnailUploadError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "StreamThumbnailUploadError";
  }
}

export function streamThumbnailPath(storagePath: string, filename: string) {
  if (!thumbnailPattern.test(filename)) return null;
  return path.join(storagePath, filename);
}

export function streamThumbnailFilenameFromUrl(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/^\/api\/media\/stream-thumbnails\/([^/?#]+)$/);
  return match && thumbnailPattern.test(match[1]) ? match[1] : null;
}

export async function saveStreamThumbnail(options: {
  storagePath: string;
  userId: string;
  mimeType: string;
  buffer: Buffer;
}) {
  if (!acceptedMimeTypes.has(options.mimeType))
    throw new StreamThumbnailUploadError("thumbnail_type_not_allowed");
  if (!options.buffer.length || options.buffer.length > streamThumbnailUploadLimitBytes)
    throw new StreamThumbnailUploadError("thumbnail_size_invalid");
  let output: Buffer;
  try {
    const image = sharp(options.buffer, { failOn: "error", limitInputPixels: 30_000_000 });
    const metadata = await image.metadata();
    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format) || (metadata.pages ?? 1) > 1)
      throw new StreamThumbnailUploadError("thumbnail_image_invalid");
    output = await image
      .rotate()
      .resize(1280, 720, { fit: "cover", position: "attention" })
      .webp({ quality: 84, effort: 4 })
      .toBuffer();
  } catch (error) {
    if (error instanceof StreamThumbnailUploadError) throw error;
    throw new StreamThumbnailUploadError("thumbnail_image_invalid");
  }
  await mkdir(options.storagePath, { recursive: true });
  const filename = `stream-thumbnail-${options.userId}-${randomUUID()}.webp`;
  const target = path.join(options.storagePath, filename);
  const temporary = `${target}.tmp`;
  await writeFile(temporary, output, { flag: "wx", mode: 0o600 });
  await rename(temporary, target);
  return { filename, url: `/api/media/stream-thumbnails/${filename}` };
}

export async function removeStoredStreamThumbnail(storagePath: string, value: string | null | undefined) {
  const filename = streamThumbnailFilenameFromUrl(value);
  if (filename) await rm(path.join(storagePath, filename), { force: true });
}
