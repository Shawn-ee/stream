import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCloudflareLiveInput } from "../src/broadcast-status.js";
import { hasCloudflareStreamConfiguration } from "../src/config.js";

test("current disconnected state wins over connected history", () => {
  assert.equal(
    normalizeCloudflareLiveInput({
      status: {
        current: { state: "disconnected", reason: "client_disconnect" },
        history: [{ state: "connected" }],
      },
    }).state,
    "offline",
  );
});

test("normalizes current Cloudflare ingest lifecycle states", () => {
  assert.equal(
    normalizeCloudflareLiveInput({ status: { current: { state: "connected" } } })
      .state,
    "live",
  );
  assert.equal(
    normalizeCloudflareLiveInput({ status: { current: { state: "connecting" } } })
      .state,
    "connecting",
  );
  assert.equal(normalizeCloudflareLiveInput({ status: {} }).state, "unavailable");
});

test("requires an explicit enable flag and every server-side Stream field", () => {
  const complete = {
    enabled: true,
    accountId: "a".repeat(32),
    apiToken: "secret-token",
    customerCode: "customer.example.cloudflarestream.com",
    liveInputId: "live-input-id",
  };
  assert.equal(hasCloudflareStreamConfiguration(complete), true);
  assert.equal(
    hasCloudflareStreamConfiguration({ ...complete, enabled: false }),
    false,
  );
  assert.equal(
    hasCloudflareStreamConfiguration({ ...complete, apiToken: "" }),
    false,
  );
});
