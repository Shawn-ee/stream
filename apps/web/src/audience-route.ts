export type AudienceRoute =
  | { view: "discovery" }
  | { view: "legacy-discovery" }
  | { view: "account"; section: "profile" | "security" | "sessions" | "preferences" | "wallet" | "following" | "activity" | "notifications" }
  | { view: "creator-onboarding"; step: "intro" | "profile" | "identity" | "agreement" | "review" }
  | { view: "creator-status" }
  | { view: "studio" }
  | { view: "room"; slug: string }
  | { view: "creator"; slug: string }
  | { view: "user"; handle: string }
  | { view: "invalid" };

const publicSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const publicHandle = /^[a-z0-9_-]{3,30}$/;

export function parseAudienceRoute(pathname: string): AudienceRoute {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/" || normalized === "/discover") return { view: "discovery" };
  if (normalized === "/tags" || normalized === "/categories") return { view: "legacy-discovery" };
  const account = normalized.match(/^\/account\/(profile|security|sessions|preferences|wallet|following|activity|notifications)$/);
  if (account) return { view: "account", section: account[1] as Extract<AudienceRoute, { view: "account" }>["section"] };
  const onboarding = normalized.match(/^\/creator\/onboarding\/(profile|identity|agreement|review)$/);
  if (onboarding) return { view: "creator-onboarding", step: onboarding[1] as "profile" | "identity" | "agreement" | "review" };
  if (normalized === "/creator/onboarding") return { view: "creator-onboarding", step: "intro" };
  if (normalized === "/creator/status") return { view: "creator-status" };
  if (normalized === "/studio" || normalized === "/broadcast") return { view: "studio" };
  if (normalized.startsWith("/@")) {
    let handle: string;
    try { handle = decodeURIComponent(normalized.slice(2)).toLowerCase(); } catch { return { view: "invalid" }; }
    return publicHandle.test(handle) ? { view: "user", handle } : { view: "invalid" };
  }
  const match = normalized.match(/^\/(room|rooms|creator)\/([^/]+)$/);
  if (!match) return { view: "invalid" };
  let slug: string;
  try {
    slug = decodeURIComponent(match[2]).toLowerCase();
  } catch {
    return { view: "invalid" };
  }
  if (!publicSlug.test(slug)) return { view: "invalid" };
  return { view: match[1] === "room" || match[1] === "rooms" ? "room" : "creator", slug };
}

export function audienceRoutePath(route: Exclude<AudienceRoute, { view: "invalid" }>) {
  if (route.view === "discovery" || route.view === "legacy-discovery") return "/discover";
  if (route.view === "account") return `/account/${route.section}`;
  if (route.view === "creator-onboarding") return route.step === "intro" ? "/creator/onboarding" : `/creator/onboarding/${route.step}`;
  if (route.view === "creator-status") return "/creator/status";
  if (route.view === "studio") return "/studio";
  if (route.view === "user") return `/@${encodeURIComponent(route.handle)}`;
  return `/${route.view}/${encodeURIComponent(route.slug)}`;
}
