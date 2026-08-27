import assert from "node:assert/strict";

export const productionEnvironmentNames = [
  "POSTGRES_DB",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "DATABASE_URL",
  "REDIS_URL",
  "API_PORT",
  "API_HOST",
  "WEB_ORIGIN",
  "NODE_ENV",
  "SESSION_TTL_HOURS",
  "LOCAL_DEMO_PASSWORD",
  "TRUST_PROXY",
  "REQUEST_BODY_LIMIT_BYTES",
  "RATE_LIMIT_MULTIPLIER",
  "DATABASE_POOL_MAX",
  "METRICS_TOKEN",
  "APP_PORT",
  "PRIVATE_SSH_TUNNEL",
  "CLOUDFLARE_STREAM_ENABLED",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_STREAM_CUSTOMER_CODE",
  "CLOUDFLARE_STREAM_LIVE_INPUT_ID",
  "CLOUDFLARE_STREAM_SIGNING_KEY_ID",
  "CLOUDFLARE_STREAM_SIGNING_JWK",
];

export function parseEnvironment(content) {
  const result = {};
  for (const [index, rawLine] of content.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    assert.ok(separator > 0, `invalid environment syntax on line ${index + 1}`);
    const name = line.slice(0, separator).trim();
    assert.match(name, /^[A-Z][A-Z0-9_]*$/, `invalid variable name on line ${index + 1}`);
    assert.equal(result[name], undefined, `duplicate variable: ${name}`);
    result[name] = line.slice(separator + 1);
  }
  return result;
}

function required(environment, name) {
  const value = environment[name];
  assert.ok(value, `${name} is required`);
  assert.equal(
    value.toLowerCase().includes("replace-with-"),
    false,
    `${name} still contains a placeholder`,
  );
  return value;
}

function boolean(environment, name) {
  const value = required(environment, name);
  assert.ok(["true", "false"].includes(value), `${name} must be true or false`);
  return value === "true";
}

function integer(environment, name, minimum, maximum) {
  const value = required(environment, name);
  assert.match(value, /^\d+$/, `${name} must be an integer`);
  const parsed = Number(value);
  assert.ok(parsed >= minimum && parsed <= maximum, `${name} is outside the allowed range`);
  return parsed;
}

function secret(environment, name, minimumLength) {
  const value = required(environment, name);
  assert.ok(value.length >= minimumLength, `${name} is too short`);
  return value;
}

function url(environment, name) {
  const value = required(environment, name);
  try {
    return new URL(value);
  } catch {
    assert.fail(`${name} is not a valid URL`);
  }
}

export function validateProductionEnvironment(environment) {
  const unknown = Object.keys(environment).find(
    (name) => !productionEnvironmentNames.includes(name),
  );
  assert.equal(unknown, undefined, `unknown production variable: ${unknown}`);
  for (const name of productionEnvironmentNames) assert.ok(name in environment, `${name} is missing`);

  assert.equal(required(environment, "NODE_ENV"), "production", "NODE_ENV must be production");
  assert.equal(required(environment, "API_HOST"), "0.0.0.0", "API_HOST must be 0.0.0.0 inside Compose");
  integer(environment, "API_PORT", 1024, 65535);
  integer(environment, "APP_PORT", 1024, 65535);
  integer(environment, "SESSION_TTL_HOURS", 1, 168);
  integer(environment, "REQUEST_BODY_LIMIT_BYTES", 4096, 1048576);
  integer(environment, "DATABASE_POOL_MAX", 2, 50);
  const multiplier = Number(required(environment, "RATE_LIMIT_MULTIPLIER"));
  assert.ok(Number.isFinite(multiplier) && multiplier > 0 && multiplier <= 10, "RATE_LIMIT_MULTIPLIER is outside the allowed range");
  assert.equal(boolean(environment, "TRUST_PROXY"), true, "TRUST_PROXY must be true behind the gateway");

  const databaseName = required(environment, "POSTGRES_DB");
  const databaseUser = required(environment, "POSTGRES_USER");
  assert.match(databaseName, /^[a-zA-Z0-9_]+$/, "POSTGRES_DB contains unsupported characters");
  assert.match(databaseUser, /^[a-zA-Z0-9_]+$/, "POSTGRES_USER contains unsupported characters");
  const databasePassword = secret(environment, "POSTGRES_PASSWORD", 32);
  const localPassword = secret(environment, "LOCAL_DEMO_PASSWORD", 24);
  const metricsToken = secret(environment, "METRICS_TOKEN", 32);
  assert.equal(databasePassword === localPassword, false, "POSTGRES_PASSWORD and LOCAL_DEMO_PASSWORD must differ");
  assert.equal(databasePassword === metricsToken, false, "POSTGRES_PASSWORD and METRICS_TOKEN must differ");
  assert.equal(localPassword === metricsToken, false, "LOCAL_DEMO_PASSWORD and METRICS_TOKEN must differ");

  const databaseUrl = url(environment, "DATABASE_URL");
  assert.ok(["postgres:", "postgresql:"].includes(databaseUrl.protocol), "DATABASE_URL must use PostgreSQL");
  assert.equal(databaseUrl.hostname, "postgres", "DATABASE_URL host must be the Compose postgres service");
  assert.equal(databaseUrl.port || "5432", "5432", "DATABASE_URL must use port 5432");
  assert.equal(decodeURIComponent(databaseUrl.username), databaseUser, "DATABASE_URL user does not match POSTGRES_USER");
  assert.equal(decodeURIComponent(databaseUrl.password), databasePassword, "DATABASE_URL password does not match POSTGRES_PASSWORD");
  assert.equal(decodeURIComponent(databaseUrl.pathname.slice(1)), databaseName, "DATABASE_URL database does not match POSTGRES_DB");

  const redisUrl = url(environment, "REDIS_URL");
  assert.equal(redisUrl.protocol, "redis:", "REDIS_URL must use redis:// inside Compose");
  assert.equal(redisUrl.hostname, "redis", "REDIS_URL host must be the Compose redis service");
  assert.equal(redisUrl.port || "6379", "6379", "REDIS_URL must use port 6379");
  assert.equal(redisUrl.username, "", "REDIS_URL must not contain an inline username");
  assert.equal(redisUrl.password, "", "REDIS_URL must not contain an inline password in this topology");

  const privateTunnel = boolean(environment, "PRIVATE_SSH_TUNNEL");
  const webOrigin = url(environment, "WEB_ORIGIN");
  assert.equal(webOrigin.username, "", "WEB_ORIGIN must not contain credentials");
  assert.equal(webOrigin.password, "", "WEB_ORIGIN must not contain credentials");
  assert.equal(webOrigin.pathname, "/", "WEB_ORIGIN must not contain a path");
  assert.equal(webOrigin.search, "", "WEB_ORIGIN must not contain a query");
  assert.equal(webOrigin.hash, "", "WEB_ORIGIN must not contain a fragment");
  if (privateTunnel) {
    assert.equal(webOrigin.protocol, "http:", "SSH-tunnel WEB_ORIGIN must use local HTTP");
    assert.ok(["localhost", "127.0.0.1"].includes(webOrigin.hostname), "SSH-tunnel WEB_ORIGIN must be localhost");
    assert.equal(webOrigin.port, environment.APP_PORT, "SSH-tunnel WEB_ORIGIN port must match APP_PORT");
  } else {
    assert.equal(webOrigin.protocol, "https:", "Non-tunnel WEB_ORIGIN must use HTTPS");
    assert.equal(["localhost", "127.0.0.1"].includes(webOrigin.hostname), false, "Non-tunnel WEB_ORIGIN must use the approved private hostname");
  }

  const cloudflareEnabled = boolean(environment, "CLOUDFLARE_STREAM_ENABLED");
  const cloudflareNames = [
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_STREAM_CUSTOMER_CODE",
    "CLOUDFLARE_STREAM_LIVE_INPUT_ID",
    "CLOUDFLARE_STREAM_SIGNING_KEY_ID",
    "CLOUDFLARE_STREAM_SIGNING_JWK",
  ];
  if (cloudflareEnabled) {
    const accountId = required(environment, "CLOUDFLARE_ACCOUNT_ID");
    assert.match(accountId, /^[a-f0-9]{32}$/i, "CLOUDFLARE_ACCOUNT_ID has an invalid shape");
    secret(environment, "CLOUDFLARE_API_TOKEN", 40);
    assert.ok(required(environment, "CLOUDFLARE_STREAM_CUSTOMER_CODE").length >= 8, "CLOUDFLARE_STREAM_CUSTOMER_CODE is too short");
    assert.ok(required(environment, "CLOUDFLARE_STREAM_LIVE_INPUT_ID").length >= 16, "CLOUDFLARE_STREAM_LIVE_INPUT_ID is too short");
    const signingKeyId = environment.CLOUDFLARE_STREAM_SIGNING_KEY_ID;
    const signingJwk = environment.CLOUDFLARE_STREAM_SIGNING_JWK;
    assert.equal(Boolean(signingKeyId), Boolean(signingJwk), "Cloudflare Stream signing key fields must be configured together");
    if (signingKeyId && signingJwk) {
      assert.match(signingKeyId, /^[a-f0-9]{32}$/i, "CLOUDFLARE_STREAM_SIGNING_KEY_ID has an invalid shape");
      secret(environment, "CLOUDFLARE_STREAM_SIGNING_JWK", 100);
    }
  } else {
    for (const name of cloudflareNames)
      assert.equal(environment[name], "", `${name} must be blank when Cloudflare Stream is disabled`);
  }

  return { cloudflareEnabled, privateTunnel };
}
