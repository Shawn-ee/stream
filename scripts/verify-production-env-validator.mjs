import assert from "node:assert/strict";
import {
  parseEnvironment,
  productionEnvironmentNames,
  validateProductionEnvironment,
} from "./production-environment.mjs";

function baseEnvironment() {
  const databasePassword = "database-password-32-characters-minimum";
  return {
    POSTGRES_DB: "stream_mvp",
    POSTGRES_USER: "stream_mvp",
    POSTGRES_PASSWORD: databasePassword,
    DATABASE_URL: `postgresql://stream_mvp:${encodeURIComponent(databasePassword)}@postgres:5432/stream_mvp`,
    REDIS_URL: "redis://redis:6379",
    API_PORT: "3001",
    API_HOST: "0.0.0.0",
    WEB_ORIGIN: "https://private-stage.example",
    NODE_ENV: "production",
    SESSION_TTL_HOURS: "12",
    CREATOR_ONBOARDING_ENABLED: "true",
    CREATOR_AUTO_APPROVAL: "false",
    LOCAL_DEMO_PASSWORD: "synthetic-account-password-24-characters",
    TRUST_PROXY: "true",
    REQUEST_BODY_LIMIT_BYTES: "65536",
    RATE_LIMIT_MULTIPLIER: "1",
    DATABASE_POOL_MAX: "20",
    METRICS_TOKEN: "metrics-token-32-characters-minimum-value",
    APP_PORT: "8080",
    PRIVATE_SSH_TUNNEL: "false",
    AVATAR_STORAGE_PATH: "/app/work/avatars",
    IDENTITY_DOCUMENT_STORAGE_PATH: "/app/work/private-identity-documents",
    IDENTITY_DOCUMENT_ENCRYPTION_KEY: "bG9jYWwtaWRlbnRpdHktZG9jdW1lbnQta2V5LTMyISE=",
    CLOUDFLARE_STREAM_ENABLED: "false",
    CLOUDFLARE_ACCOUNT_ID: "",
    CLOUDFLARE_API_TOKEN: "",
    CLOUDFLARE_STREAM_CUSTOMER_CODE: "",
    CLOUDFLARE_STREAM_LIVE_INPUT_ID: "",
    CLOUDFLARE_STREAM_SIGNING_KEY_ID: "",
    CLOUDFLARE_STREAM_SIGNING_JWK: "",
  };
}

function rejected(update, expected) {
  const environment = { ...baseEnvironment(), ...update };
  assert.throws(() => validateProductionEnvironment(environment), expected);
}

const httpsMode = validateProductionEnvironment(baseEnvironment());
assert.deepEqual(httpsMode, { cloudflareEnabled: false, privateTunnel: false });

const tunnel = baseEnvironment();
tunnel.PRIVATE_SSH_TUNNEL = "true";
tunnel.WEB_ORIGIN = "http://localhost:8080";
assert.equal(validateProductionEnvironment(tunnel).privateTunnel, true);

const cloudflare = baseEnvironment();
cloudflare.CLOUDFLARE_STREAM_ENABLED = "true";
cloudflare.CLOUDFLARE_ACCOUNT_ID = "0123456789abcdef0123456789abcdef";
cloudflare.CLOUDFLARE_API_TOKEN = "test-token-shape-with-more-than-forty-characters";
cloudflare.CLOUDFLARE_STREAM_CUSTOMER_CODE = "customer-code";
cloudflare.CLOUDFLARE_STREAM_LIVE_INPUT_ID = "live-input-id-with-safe-test-shape";
assert.equal(validateProductionEnvironment(cloudflare).cloudflareEnabled, true);

const signedCloudflare = { ...cloudflare };
signedCloudflare.CLOUDFLARE_STREAM_SIGNING_KEY_ID = "abcdef0123456789abcdef0123456789";
signedCloudflare.CLOUDFLARE_STREAM_SIGNING_JWK = Buffer.from(
  JSON.stringify({
    kty: "RSA",
    n: "test",
    e: "AQAB",
    d: "private-test-material".repeat(8),
  }),
).toString("base64");
assert.equal(validateProductionEnvironment(signedCloudflare).cloudflareEnabled, true);
rejected(
  {
    CLOUDFLARE_STREAM_ENABLED: "true",
    CLOUDFLARE_ACCOUNT_ID: cloudflare.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN: cloudflare.CLOUDFLARE_API_TOKEN,
    CLOUDFLARE_STREAM_CUSTOMER_CODE: cloudflare.CLOUDFLARE_STREAM_CUSTOMER_CODE,
    CLOUDFLARE_STREAM_LIVE_INPUT_ID: cloudflare.CLOUDFLARE_STREAM_LIVE_INPUT_ID,
    CLOUDFLARE_STREAM_SIGNING_KEY_ID:
      signedCloudflare.CLOUDFLARE_STREAM_SIGNING_KEY_ID,
  },
  /configured together/,
);

rejected({ POSTGRES_PASSWORD: "short" }, /POSTGRES_PASSWORD is too short/);
rejected({ DATABASE_URL: "postgresql://stream_mvp:wrong@postgres:5432/stream_mvp" }, /DATABASE_URL password/);
rejected({ METRICS_TOKEN: "replace-with-token-value-that-is-long" }, /placeholder/);
rejected({ WEB_ORIGIN: "http://private-stage.example" }, /must use HTTPS/);
rejected({ CREATOR_AUTO_APPROVAL: "sometimes" }, /must be true or false/);
rejected({ AVATAR_STORAGE_PATH: "relative/avatars" }, /must be absolute/);
rejected({ PRIVATE_SSH_TUNNEL: "true", WEB_ORIGIN: "http://private-stage.example:8080" }, /must be localhost/);
rejected({ CLOUDFLARE_API_TOKEN: "unused-secret-must-not-remain" }, /must be blank/);
rejected({ UNKNOWN_SECRET: "value" }, /unknown production variable/);

const parsed = parseEnvironment(
  productionEnvironmentNames.map((name) => `${name}=${baseEnvironment()[name]}`).join("\n"),
);
assert.equal(Object.keys(parsed).length, productionEnvironmentNames.length);
assert.throws(() => parseEnvironment("NODE_ENV=production\nNODE_ENV=development"), /duplicate/);

console.log("Production environment validation and safe failure cases verified.");
