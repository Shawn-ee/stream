export type AudienceRoute =
  | { view: "discovery" }
  | { view: "room"; slug: string }
  | { view: "creator"; slug: string }
  | { view: "invalid" };

const publicSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseAudienceRoute(pathname: string): AudienceRoute {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/") return { view: "discovery" };
  const match = normalized.match(/^\/(room|creator)\/([^/]+)$/);
  if (!match) return { view: "invalid" };
  let slug: string;
  try {
    slug = decodeURIComponent(match[2]).toLowerCase();
  } catch {
    return { view: "invalid" };
  }
  if (!publicSlug.test(slug)) return { view: "invalid" };
  return { view: match[1] === "room" ? "room" : "creator", slug };
}

export function audienceRoutePath(route: Exclude<AudienceRoute, { view: "invalid" }>) {
  if (route.view === "discovery") return "/";
  return `/${route.view}/${encodeURIComponent(route.slug)}`;
}
