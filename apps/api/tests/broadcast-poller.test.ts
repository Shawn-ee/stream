import assert from "node:assert/strict";
import test from "node:test";
import { createBroadcastPoller } from "../src/broadcast-poller.js";

test("disabled poller never contacts the provider", async () => {
  let calls = 0;
  const poller = createBroadcastPoller({
    enabled: false,
    listRooms: async () => {
      calls += 1;
      return [];
    },
    readStatus: async () => {
      throw new Error("unexpected provider call");
    },
    persistStatus: async () => undefined,
    onError: () => undefined,
  });
  await poller.pollOnce();
  assert.equal(calls, 0);
});

test("polls configured rooms and isolates a room failure", async () => {
  const persisted: string[] = [];
  const errors: Array<string | undefined> = [];
  const poller = createBroadcastPoller({
    enabled: true,
    listRooms: async () => [
      { slug: "first", liveInputId: "input-1" },
      { slug: "second", liveInputId: "input-2" },
    ],
    readStatus: async (inputId) => {
      if (inputId === "input-1") throw new Error("provider unavailable");
      return { state: "live", message: "Broadcast is live.", source: "cloudflare" };
    },
    persistStatus: async (slug) => {
      persisted.push(slug);
    },
    onError: (_error, slug) => errors.push(slug),
  });
  await poller.pollOnce();
  assert.deepEqual(errors, ["first"]);
  assert.deepEqual(persisted, ["second"]);
});
