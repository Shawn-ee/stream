export type AudienceRoute =
  | { view: "discovery" }
  | { view: "categories" }
  | { view: "account"; section: "profile" | "security" | "sessions" | "wallet" }
  | { view: "creator-onboarding"; step: "profile" | "identity" | "agreement" | "review" }
  | { view: "creator-status" }
  | { view: "studio" }
  | { view: "room"; slug: string }
  | { view: "creator"; slug: string }
  | { view: "invalid" };

const publicSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseAudienceRoute(pathname: string): AudienceRoute {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/" || normalized === "/discover") return { view: "discovery" };
  if (normalized === "/categories") return { view: "categories" };
  const account = normalized.match(/^\/account\/(profile|security|sessions|wallet)$/);
  if (account) return { view: "account", section: account[1] as "profile" | "security" | "sessions" | "wallet" };
  const onboarding = normalized.match(/^\/creator\/onboarding\/(profile|identity|agreement|review)$/);
  if (onboarding) return { view: "creator-onboarding", step: onboarding[1] as "profile" | "identity" | "agreement" | "review" };
  if (normalized === "/creator/onboarding") return { view: "creator-onboarding", step: "profile" };
  if (normalized === "/creator/status") return { view: "creator-status" };
  if (normalized === "/studio" || normalized === "/broadcast") return { view: "studio" };
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
  if (route.view === "discovery") return "/";
  if (route.view === "categories") return "/categories";
  if (route.view === "account") return `/account/${route.section}`;
  if (route.view === "creator-onboarding") return `/creator/onboarding/${route.step}`;
  if (route.view === "creator-status") return "/creator/status";
  if (route.view === "studio") return "/studio";
  return `/${route.view}/${encodeURIComponent(route.slug)}`;
}
