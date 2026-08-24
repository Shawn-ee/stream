import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCloudflareLiveInput } from "../src/broadcast-status.js";

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
