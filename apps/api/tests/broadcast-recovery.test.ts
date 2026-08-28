import assert from "node:assert/strict";
import test from "node:test";
import {
  broadcastLifecycleEvent,
  statusDuringRecovery,
} from "../src/broadcast-recovery.js";

const offline = {
  state: "offline" as const,
  message: "Broadcast is offline.",
  source: "cloudflare" as const,
};

test("keeps an interrupted browser broadcast connecting during its grace window", () => {
  const result = statusDuringRecovery(offline, 46_000, 1_000);
  assert.equal(result.status.state, "connecting");
  assert.equal(result.status.message, "The creator is reconnecting.");
  assert.equal(result.recoveryComplete, false);
});

test("allows truthful offline state after recovery grace expires", () => {
  const result = statusDuringRecovery(offline, 45_000, 45_001);
  assert.equal(result.status.state, "offline");
  assert.equal(result.recoveryComplete, true);
});

test("a recovered live input immediately completes the recovery window", () => {
  const live = {
    state: "live" as const,
    message: "Broadcast is live.",
    source: "cloudflare" as const,
  };
  const result = statusDuringRecovery(live, 46_000, 1_000);
  assert.equal(result.status.state, "live");
  assert.equal(result.recoveryComplete, true);
});

test("recovery transitions do not masquerade as a new or ended broadcast", () => {
  assert.equal(broadcastLifecycleEvent("live", "connecting", true), "broadcast_interrupted");
  assert.equal(broadcastLifecycleEvent("connecting", "live", true), "broadcast_recovered");
  assert.equal(broadcastLifecycleEvent("connecting", "offline", true), "broadcast_ended");
  assert.equal(broadcastLifecycleEvent("offline", "live", false), "broadcast_started");
});
