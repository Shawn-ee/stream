import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const avatarUploadLimitBytes = 5 * 1024 * 1024;
export const avatarOutputSize = 512;
const avatarFilenamePattern = /^avatar-[0-9a-f-]{36}-[0-9a-f-]{36}\.webp$/i;
const acceptedAvatarMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const acceptedAvatarFormats = new Set(["jpeg", "png", "webp"]);

export class AvatarUploadError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "AvatarUploadError";
  }
}

export function avatarFilenameFromUrl(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/^\/api\/media\/avatars\/([^/?#]+)$/);
  return match && avatarFilenamePattern.test(match[1]) ? match[1] : null;
}

export function avatarPath(storagePath: string, filename: string) {
  if (!avatarFilenamePattern.test(filename)) return null;
  return path.join(storagePath, filename);
}

export async function saveAvatar(options: {
  storagePath: string;
  userId: string;
  mimeType: string;
  buffer: Buffer;
  focusX?: number;
  focusY?: number;
}) {
  if (!acceptedAvatarMimeTypes.has(options.mimeType))
    throw new AvatarUploadError("avatar_type_not_allowed");
  if (!options.buffer.length || options.buffer.length > avatarUploadLimitBytes)
    throw new AvatarUploadError("avatar_size_invalid");

  let output: Buffer;
  try {
    const image = sharp(options.buffer, {
      failOn: "error",
      limitInputPixels: 25_000_000,
    });
    const metadata = await image.metadata();
    if (!metadata.format || !acceptedAvatarFormats.has(metadata.format) || (metadata.pages ?? 1) > 1)
      throw new AvatarUploadError("avatar_image_invalid");
    const normalized = await image.rotate().toBuffer();
    const normalizedMetadata = await sharp(normalized).metadata();
    const width = normalizedMetadata.width ?? 0;
    const height = normalizedMetadata.height ?? 0;
    if (!width || !height) throw new AvatarUploadError("avatar_image_invalid");
    const cropSize = Math.min(width, height);
    const focusX = Math.min(1, Math.max(0, options.focusX ?? 0.5));
    const focusY = Math.min(1, Math.max(0, options.focusY ?? 0.5));
    const left = Math.round(Math.min(width - cropSize, Math.max(0, focusX * width - cropSize / 2)));
    const top = Math.round(Math.min(height - cropSize, Math.max(0, focusY * height - cropSize / 2)));
    output = await sharp(normalized)
      .extract({ left, top, width: cropSize, height: cropSize })
      .resize(avatarOutputSize, avatarOutputSize, { withoutEnlargement: false })
      .webp({ quality: 84, effort: 4 })
      .toBuffer();
  } catch (error) {
    if (error instanceof AvatarUploadError) throw error;
    throw new AvatarUploadError("avatar_image_invalid");
  }

  await mkdir(options.storagePath, { recursive: true });
  const filename = `avatar-${options.userId}-${randomUUID()}.webp`;
  const target = path.join(options.storagePath, filename);
  const temporary = `${target}.tmp`;
  await writeFile(temporary, output, { flag: "wx", mode: 0o600 });
  await rename(temporary, target);
  return {
    filename,
    url: `/api/media/avatars/${filename}`,
  };
}

export async function removeStoredAvatar(
  storagePath: string,
  avatarUrl: string | null | undefined,
) {
  const filename = avatarFilenameFromUrl(avatarUrl);
  if (!filename) return;
  await rm(path.join(storagePath, filename), { force: true });
}
