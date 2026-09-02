import { randomBytes } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  productionEnvironmentNames,
  validateProductionEnvironment,
} from "./production-environment.mjs";

function randomSecret() {
  return randomBytes(36).toString("base64url");
}

export function createTemporaryProductionEnvironment({ appPort }) {
  const postgresPassword = randomSecret();
  const environment = {
    POSTGRES_DB: "stream_mvp",
    POSTGRES_USER: "stream_mvp",
    POSTGRES_PASSWORD: postgresPassword,
    DATABASE_URL: `postgresql://stream_mvp:${encodeURIComponent(postgresPassword)}@postgres:5432/stream_mvp`,
    REDIS_URL: "redis://redis:6379",
    API_PORT: "3001",
    API_HOST: "0.0.0.0",
    WEB_ORIGIN: `http://localhost:${appPort}`,
    NODE_ENV: "production",
    SESSION_TTL_HOURS: "12",
    CREATOR_ONBOARDING_ENABLED: "true",
    CREATOR_AUTO_APPROVAL: "false",
    LOCAL_DEMO_PASSWORD: randomSecret(),
    TRUST_PROXY: "true",
    REQUEST_BODY_LIMIT_BYTES: "65536",
    RATE_LIMIT_MULTIPLIER: "1",
    DATABASE_POOL_MAX: "20",
    METRICS_TOKEN: randomSecret(),
    APP_PORT: String(appPort),
    PRIVATE_SSH_TUNNEL: "true",
    AVATAR_STORAGE_PATH: "/app/work/avatars",
    IDENTITY_DOCUMENT_STORAGE_PATH: "/app/work/private-identity-documents",
    IDENTITY_DOCUMENT_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
    CLOUDFLARE_STREAM_ENABLED: "false",
    CLOUDFLARE_ACCOUNT_ID: "",
    CLOUDFLARE_API_TOKEN: "",
    CLOUDFLARE_STREAM_CUSTOMER_CODE: "",
    CLOUDFLARE_STREAM_LIVE_INPUT_ID: "",
    CLOUDFLARE_STREAM_SIGNING_KEY_ID: "",
    CLOUDFLARE_STREAM_SIGNING_JWK: "",
  };
  validateProductionEnvironment(environment);
  mkdirSync("work", { recursive: true });
  const path = join("work", `.env.production.verify-${process.pid}`);
  const content = productionEnvironmentNames
    .map((name) => `${name}=${environment[name]}`)
    .join("\n") + "\n";
  writeFileSync(path, content, { encoding: "utf8", mode: 0o600, flag: "wx" });
  return {
    environment,
    path,
    cleanup() {
      rmSync(path, { force: true });
    },
  };
}
