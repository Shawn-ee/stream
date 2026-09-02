export const config = {
  apiPort: Number(process.env.API_PORT ?? 3001),
  apiHost: process.env.API_HOST ?? "127.0.0.1",
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  nodeEnv: process.env.NODE_ENV ?? "development",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS ?? 12),
  trustProxy: process.env.TRUST_PROXY === "true",
  requestBodyLimitBytes: Number(process.env.REQUEST_BODY_LIMIT_BYTES ?? 65536),
  avatarStoragePath: process.env.AVATAR_STORAGE_PATH ?? "work/avatars",
  identityDocumentStoragePath: process.env.IDENTITY_DOCUMENT_STORAGE_PATH ?? "work/private-identity-documents",
  identityDocumentEncryptionKey: process.env.IDENTITY_DOCUMENT_ENCRYPTION_KEY ?? "bG9jYWwtaWRlbnRpdHktZG9jdW1lbnQta2V5LTMyISE=",
  rateLimitMultiplier: Number(process.env.RATE_LIMIT_MULTIPLIER ?? 1),
  databasePoolMax: Number(process.env.DATABASE_POOL_MAX ?? 20),
  metricsToken:
    process.env.METRICS_TOKEN ?? "local-metrics-token-not-for-production",
  localDemoPassword: process.env.LOCAL_DEMO_PASSWORD ?? "Local-demo-2026!",
  creatorOnboardingEnabled: process.env.CREATOR_ONBOARDING_ENABLED !== "false",
  creatorAutoApproval: (process.env.CREATOR_AUTO_APPROVAL ?? (process.env.NODE_ENV === "production" ? "false" : "true")) === "true",
  cloudflare: {
    enabled: process.env.CLOUDFLARE_STREAM_ENABLED === "true",
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    customerCode: process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE,
    liveInputId: process.env.CLOUDFLARE_STREAM_LIVE_INPUT_ID,
    signingKeyId: process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID,
    signingJwk: process.env.CLOUDFLARE_STREAM_SIGNING_JWK,
  },
  localBroadcastStatus: ([
    "live",
    "connecting",
    "offline",
    "unavailable",
  ].includes(process.env.LOCAL_BROADCAST_STATUS ?? "")
    ? process.env.LOCAL_BROADCAST_STATUS
    : "offline") as "live" | "connecting" | "offline" | "unavailable",
};

export function hasCloudflareStreamConfiguration(
  cloudflare = config.cloudflare,
): boolean {
  return Boolean(
    cloudflare.enabled &&
      cloudflare.accountId &&
      cloudflare.apiToken &&
      cloudflare.customerCode &&
      cloudflare.liveInputId,
  );
}

export function hasCloudflareStreamSigningConfiguration(
  cloudflare = config.cloudflare,
): boolean {
  return Boolean(
    cloudflare.signingKeyId &&
      cloudflare.signingKeyId.length >= 16 &&
      cloudflare.signingJwk &&
      cloudflare.signingJwk.length >= 100,
  );
}

export function hasCloudflareQuickLiveConfiguration(): boolean {
  return Boolean(
    hasCloudflareStreamConfiguration() &&
      (config.nodeEnv !== "production" ||
        hasCloudflareStreamSigningConfiguration()),
  );
}

if (!Number.isFinite(config.sessionTtlHours) || config.sessionTtlHours <= 0)
  throw new Error("SESSION_TTL_HOURS must be positive.");
if (
  !Number.isInteger(config.requestBodyLimitBytes) ||
  config.requestBodyLimitBytes < 4096
)
  throw new Error("REQUEST_BODY_LIMIT_BYTES must be at least 4096.");
if (
  !Number.isFinite(config.rateLimitMultiplier) ||
  config.rateLimitMultiplier <= 0
)
  throw new Error("RATE_LIMIT_MULTIPLIER must be positive.");
if (!Number.isInteger(config.databasePoolMax) || config.databasePoolMax < 2)
  throw new Error("DATABASE_POOL_MAX must be an integer of at least 2.");
if (config.nodeEnv === "production" && config.metricsToken.length < 32)
  throw new Error("METRICS_TOKEN must contain at least 32 characters in production.");
if (
  config.nodeEnv === "production" &&
  config.localDemoPassword === "Local-demo-2026!"
)
  throw new Error("LOCAL_DEMO_PASSWORD must be replaced in production.");
if (config.nodeEnv === "production" && (!process.env.IDENTITY_DOCUMENT_STORAGE_PATH || !process.env.IDENTITY_DOCUMENT_ENCRYPTION_KEY))
  throw new Error("Secure private identity-document storage is required in production.");
if (Buffer.from(config.identityDocumentEncryptionKey, "base64").length !== 32)
  throw new Error("IDENTITY_DOCUMENT_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");

export function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is required.`);
  return value;
}
