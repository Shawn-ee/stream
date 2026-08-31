import { audienceRoutePath } from "./audience-route";

export type ShareKind = "room" | "creator";
export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

export type AudienceShareTarget = {
  kind: ShareKind;
  slug: string;
  creatorName: string;
  roomTitle: string;
};

export function sharePath(target: Pick<AudienceShareTarget, "kind" | "slug">) {
  return audienceRoutePath({ view: target.kind, slug: target.slug });
}

export function sharePayload(target: AudienceShareTarget, origin = window.location.origin) {
  const room = target.kind === "room";
  return {
    title: room ? `${target.creatorName} · ${target.roomTitle}` : `${target.creatorName} on Holiwyn`,
    url: origin + sharePath(target),
  };
}

export async function copyAudienceTarget(target: AudienceShareTarget): Promise<ShareOutcome> {
  const payload = sharePayload(target);
  try {
    await navigator.clipboard.writeText(payload.url);
    return "copied";
  } catch {
    return "failed";
  }
}

export async function shareAudienceTarget(target: AudienceShareTarget, copyOnly = false): Promise<ShareOutcome> {
  if (copyOnly) return copyAudienceTarget(target);
  const payload = sharePayload(target);
  if (typeof navigator.share === "function") {
    try {
      await navigator.share(payload);
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  return copyAudienceTarget(target);
}

export function syncAudienceMetadata(target: AudienceShareTarget | null) {
  const baseline = {
    title: "Holiwyn Live",
    url: window.location.origin + "/",
  };
  const payload = target ? sharePayload(target) : null;
  const metadata = target && payload ? {
    title: payload.title,
    url: payload.url,
  } : baseline;

  document.title = target?.kind === "creator"
    ? metadata.title
    : `${metadata.title}${target ? " | Holiwyn" : ""}`;
  const values = {
    "og-title": metadata.title,
    "og-url": metadata.url,
  };
  for (const [id, value] of Object.entries(values)) document.getElementById(id)?.setAttribute("content", value);
  document.getElementById("canonical")?.setAttribute("href", metadata.url);
}
