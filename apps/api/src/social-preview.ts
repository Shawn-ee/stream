export type SocialPreviewKind = "room" | "creator";

export type SocialPreviewRoom = {
  slug: string;
  title: string;
  streamer_name: string;
  handle: string;
  bio?: string | null;
  broadcast_state?: string | null;
  broadcast_status_source?: string | null;
  languages?: { code: string; isPrimary: boolean }[];
  tags?: { displayName: string }[];
  avatar_url?: string | null;
  stream_thumbnail_url?: string | null;
};

const publicSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ownedImage = /^\/api\/media\/(?:avatars|stream-thumbnails)\/[a-zA-Z0-9-]+\.webp$/;

export function validSocialPreviewPath(kind: unknown, slug: unknown): kind is SocialPreviewKind {
  return (kind === "room" || kind === "creator") && typeof slug === "string" && publicSlug.test(slug);
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

function absoluteOwnedImage(value: string | null | undefined, origin: string) {
  return value && ownedImage.test(value) ? new URL(value, origin).toString() : null;
}

export function renderSocialPreview(kind: SocialPreviewKind, room: SocialPreviewRoom, origin: string) {
  const creator = room.streamer_name.trim().slice(0, 80);
  const roomTitle = room.title.trim().slice(0, 120);
  const canonical = new URL(`/${kind}/${encodeURIComponent(room.slug)}`, origin).toString();
  const isRoom = kind === "room";
  const title = isRoom ? `${creator} · ${roomTitle}` : `${creator} on Holiwyn`;
  const description = (isRoom
    ? `${room.broadcast_state === "live" && room.broadcast_status_source === "cloudflare" ? "Live now" : "Creator room"} · ${roomTitle}${room.tags?.length ? ` · ${room.tags.slice(0,3).map(tag=>tag.displayName).join(" · ")}` : ""}`
    : room.bio?.trim() || `Discover ${creator} on Holiwyn.`).slice(0, 200);
  const image = absoluteOwnedImage(isRoom ? room.stream_thumbnail_url ?? room.avatar_url : room.avatar_url, origin);
  const language = room.languages?.find(item=>item.isPrimary)?.code ?? "en";
  const type = isRoom ? "website" : "profile";
  const imageTags = image
    ? `<meta property="og:image" content="${escapeHtml(image)}"><meta name="twitter:image" content="${escapeHtml(image)}">`
    : "";
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} | Holiwyn</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:site_name" content="Holiwyn"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:type" content="${type}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}">${imageTags}</head><body><main><p>HOLIWYN</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><a href="${escapeHtml(canonical)}">Open on Holiwyn</a></main></body></html>`;
}
