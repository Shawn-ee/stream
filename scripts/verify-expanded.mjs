import assert from "node:assert/strict";

const base = "http://127.0.0.1:3001";
function session() {
  const cookies = new Map();
  return async (path, { method = "GET", body, expected = 200 } = {}) => {
    const cookie = [...cookies]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
    const csrf = cookies.get("stream_csrf");
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(body ? { "content-type": "application/json" } : {}),
        ...(csrf && method !== "GET" ? { "x-csrf-token": csrf } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    for (const setCookie of response.headers.getSetCookie?.() ?? []) {
      const [pair] = setCookie.split(";");
      const separator = pair.indexOf("=");
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    assert.equal(
      response.status,
      expected,
      `${method} ${path} returned ${response.status}`,
    );
    return response.status === 204 ? null : response.json();
  };
}

const audience = session();
const streamer = session();
const admin = session();
await audience("/api/auth/login", {
  method: "POST",
  body: {
    handle: "demo-audience",
    password: process.env.LOCAL_DEMO_PASSWORD ?? "Local-demo-2026!",
  },
});
await audience("/api/demo/age-acknowledgement", { method: "POST", body: {} });
const categories = await audience("/api/discovery/categories");
assert.ok(categories.categories.includes("Featured"));
const discovery = await audience("/api/rooms?q=Demo&category=Featured");
assert.equal(discovery.rooms.length, 1);
const room = discovery.rooms[0];
await streamer("/api/auth/login", {
  method: "POST",
  body: {
    handle: "demo-streamer",
    password: process.env.LOCAL_DEMO_PASSWORD ?? "Local-demo-2026!",
  },
});
await streamer(`/api/streamer/rooms/${room.slug}/broadcast/local-status`, {
  method: "PUT",
  body: { state: "live" },
});
const profile = await audience(`/api/streamers/${room.streamer_id}`);
assert.equal(profile.streamer.room_slug, room.slug);
assert.ok(profile.streamer.bio);
await audience(`/api/streamers/${room.streamer_id}/follow`, {
  method: "POST",
  body: {},
});
await audience(`/api/rooms/${room.slug}/visit`, {
  method: "POST",
  body: {},
  expected: 204,
});
const history = await audience("/api/me/history");
assert.ok(history.rooms.some((item) => item.slug === room.slug));
const gifts = await audience("/api/gifts");
assert.deepEqual(
  gifts.gifts.map((gift) => gift.coin_cost),
  [1, 5, 10, 20, 50, 100, 1000, 10000],
);
assert.ok(gifts.gifts.every((gift) => gift.symbol && gift.animation_tier));
const actionListing = await audience(`/api/rooms/${room.slug}/actions`);
assert.ok(actionListing.actions.length >= 2);
assert.ok(actionListing.goal.goal_target > 0);
const beforeGift = (await audience("/api/wallet")).balance;
const giftKey = crypto.randomUUID();
await audience(`/api/rooms/${room.slug}/gifts`, {
  method: "POST",
  body: { giftId: gifts.gifts[0].id, quantity: 1, idempotencyKey: giftKey },
});
assert.equal(
  (await audience("/api/wallet")).balance,
  beforeGift - gifts.gifts[0].coin_cost,
);
const duplicateGift = await audience(`/api/rooms/${room.slug}/gifts`, {
  method: "POST",
  body: { giftId: gifts.gifts[0].id, quantity: 1, idempotencyKey: giftKey },
});
assert.equal(duplicateGift.duplicate, true);
assert.equal((await audience("/api/wallet")).balance, beforeGift - 1);
await audience(`/api/rooms/${room.slug}/gifts`, {
  method: "POST",
  expected: 400,
  body: {
    giftId: gifts.gifts[6].id,
    quantity: 1,
    idempotencyKey: crypto.randomUUID(),
  },
});
const publicSupport = await audience(`/api/rooms/${room.slug}/support-feed`);
assert.ok(publicSupport.support.some((item) => item.support_type === "gift"));
await audience(`/api/streamer/rooms/${room.slug}/insights`, { expected: 403 });
await audience("/api/streamer/wallet/summary?period=lifetime", { expected: 403 });
await audience("/api/streamer/wallet/transactions?period=lifetime", { expected: 403 });
await audience(`/api/streamer/rooms/${room.slug}/supporters?period=lifetime`, { expected: 403 });

assert.equal((await streamer("/api/wallet")).balance, gifts.gifts[0].coin_cost);
await streamer(`/api/rooms/${room.slug}/gifts`, {
  method: "POST",
    expected: 400,
  body: {
    giftId: gifts.gifts[0].id,
    quantity: 1,
    idempotencyKey: crypto.randomUUID(),
  },
});
await streamer(`/api/streamer/rooms/${room.slug}/broadcast/local-status`, {
  method: "PUT",
  body: { state: "offline" },
});
const testSdp = "v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\ns=test\r\nt=0 0\r\n";
await audience(`/api/streamer/rooms/${room.slug}/webrtc/publish`, {
  method: "POST",
  body: { sdp: testSdp },
  expected: 403,
});
await streamer(`/api/streamer/rooms/${room.slug}/broadcast/transport`, {
  method: "PUT",
  body: { transport: "browser_webrtc" },
});
assert.equal(
  (await streamer("/api/streamer/studio")).room.broadcast_transport,
  "browser_webrtc",
);
await streamer(`/api/streamer/rooms/${room.slug}/webrtc/publish`, {
  method: "POST",
  body: { sdp: testSdp },
  expected: 503,
});
await streamer(`/api/streamer/rooms/${room.slug}/webrtc/publish/${crypto.randomUUID()}`, {
  method: "PATCH",
  expected: 404,
});
await streamer(`/api/streamer/rooms/${room.slug}/broadcast/transport`, {
  method: "PUT",
  body: { transport: "obs_hls" },
});
await audience(`/api/rooms/${room.slug}/webrtc/play`, {
  method: "POST",
  body: { sdp: testSdp },
  expected: 503,
});
await audience(`/api/rooms/${room.slug}/webrtc/play/${crypto.randomUUID()}`, {
  method: "PATCH",
  expected: 404,
});
await streamer(`/api/streamer/rooms/${room.slug}`, {
  method: "PUT",
  body: {
    title: room.title,
    goalText: "Expanded verifier goal",
    goalTarget: 700,
  },
});
const creatorActions = await streamer(
  `/api/streamer/rooms/${room.slug}/actions`,
);
assert.ok(creatorActions.actions.length >= 2);
const addedAction = await streamer(`/api/streamer/rooms/${room.slug}/actions`, {
  method: "POST",
  body: { title: "Verifier action", coinCost: 33, durationLabel: "Quick test" },
});
await streamer(
  `/api/streamer/rooms/${room.slug}/actions/${addedAction.action.id}`,
  { method: "PUT", body: { isActive: true, displayOrder: 0 } },
);
const profileUpdate = await streamer("/api/streamer/profile", {
  method: "PUT",
  body: {
    bio: "Expanded verifier profile",
    category: "Featured",
    scheduleText: "Local schedule",
  },
});
assert.equal(profileUpdate.profile.bio, "Expanded verifier profile");
assert.equal(
  (await audience("/api/rooms")).rooms.find((item) => item.slug === room.slug)
    .goal_text,
  "Expanded verifier goal",
);
await streamer(`/api/streamer/rooms/${room.slug}/moderation`, {
  method: "POST",
  body: { targetId: "10000000-0000-4000-8000-000000000001", action: "mute" },
});
await streamer(`/api/streamer/rooms/${room.slug}/moderation`, {
  method: "POST",
  body: { targetId: "10000000-0000-4000-8000-000000000001", action: "unmute" },
});
await streamer(`/api/streamer/rooms/${room.slug}/private-show`, {
  method: "PUT",
  body: { active: true, mode: "per_minute", ticketCost: 40, perMinuteCost: 7 },
});
await streamer(`/api/streamer/rooms/${room.slug}/broadcast/local-status`, {
  method: "PUT",
  body: { state: "live" },
});
const studio = await streamer("/api/streamer/studio");
assert.equal(studio.room.private_show_enabled, true);
assert.equal(studio.room.private_show_mode, "per_minute");
assert.equal(studio.room.broadcast_state, "live");
assert.equal(studio.room.goal_target, 700);

const actionBefore = (await audience("/api/wallet")).balance;
const actionKey = crypto.randomUUID();
const actionPurchase = await audience(
  `/api/rooms/${room.slug}/actions/${addedAction.action.id}/purchase`,
  { method: "POST", body: { idempotencyKey: actionKey } },
);
assert.equal(actionPurchase.action.cost, 33);
assert.equal((await audience("/api/wallet")).balance, actionBefore - 33);
const duplicateAction = await audience(
  `/api/rooms/${room.slug}/actions/${addedAction.action.id}/purchase`,
  { method: "POST", body: { idempotencyKey: actionKey } },
);
assert.equal(duplicateAction.duplicate, true);
assert.ok(
  (await audience(`/api/rooms/${room.slug}/actions`)).goal.goal_progress >=
    gifts.gifts[0].coin_cost + 33,
);
const insights = await streamer(`/api/streamer/rooms/${room.slug}/insights`);
assert.equal(insights.stats.gift_total, gifts.gifts[0].coin_cost);
assert.equal(insights.stats.action_total, 33);
assert.equal(insights.stats.action_count, 1);
assert.equal(insights.topSupporter.sender, "Demo Audience");
assert.equal(insights.giftRanking[0].sender, "Demo Audience");
assert.equal(insights.giftRanking[0].gift_total, gifts.gifts[0].coin_cost);
assert.equal(insights.giftRanking[0].gift_count, 1);
assert.ok(insights.recent.some((item) => item.support_type === "action"));
assert.ok(
  (await audience(`/api/rooms/${room.slug}/support-feed`)).support.some(
    (item) => item.support_type === "action",
  ),
);

await audience(`/api/rooms/${room.slug}/playback`, { expected: 403 });
const privateBefore = (await audience("/api/wallet")).balance;
const purchase = await audience(
  `/api/rooms/${room.slug}/private-show/purchase`,
  { method: "POST", body: { idempotencyKey: crypto.randomUUID() } },
);
assert.equal(purchase.cost, 7);
assert.equal((await audience("/api/wallet")).balance, privateBefore - 7);
const privateState = await audience(`/api/rooms/${room.slug}/private-show`);
assert.equal(privateState.session.hasAccess, true);
assert.ok(privateState.session.expiresAt);
const walletHistory = await audience("/api/wallet/history");
assert.ok(
  walletHistory.entries.some(
    (entry) => entry.reference_type === "private_show",
  ),
);
const creatorWallet = await streamer("/api/streamer/wallet/summary?period=lifetime");
assert.equal(creatorWallet.breakdown.gift, gifts.gifts[0].coin_cost);
assert.equal(creatorWallet.breakdown.action, 33);
assert.equal(creatorWallet.breakdown.privateShow, 7);
assert.equal(creatorWallet.periodIncome, gifts.gifts[0].coin_cost + 33 + 7);
assert.equal(creatorWallet.lifetimeIncome, creatorWallet.periodIncome);
const firstTransactionPage = await streamer("/api/streamer/wallet/transactions?period=lifetime&type=all&limit=1");
assert.equal(firstTransactionPage.transactions.length, 1);
assert.equal(firstTransactionPage.transactions[0].supporter, "Demo Audience");
assert.ok(firstTransactionPage.transactions[0].label.en);
assert.equal(firstTransactionPage.transactions[0].status, "completed");
assert.ok(firstTransactionPage.nextCursor);
const secondTransactionPage = await streamer(`/api/streamer/wallet/transactions?period=lifetime&type=all&limit=1&cursor=${encodeURIComponent(firstTransactionPage.nextCursor)}`);
assert.equal(secondTransactionPage.transactions.length, 1);
assert.notEqual(secondTransactionPage.transactions[0].id, firstTransactionPage.transactions[0].id);
const supporters = await streamer(`/api/streamer/rooms/${room.slug}/supporters?period=lifetime&kind=all`);
assert.equal(supporters.supporters[0].displayName, "Demo Audience");
assert.equal(supporters.supporters[0].giftTotal, gifts.gifts[0].coin_cost);
assert.equal(supporters.supporters[0].actionTotal, 33);
assert.equal(supporters.supporters[0].privateShowTotal, 7);
await streamer("/api/streamer/wallet/transactions?period=lifetime&cursor=invalid", { expected: 400 });
await audience(`/api/rooms/${room.slug}/reports`, {
  method: "POST",
  body: { reason: "Expanded local verifier report" },
});

await admin("/api/auth/login", {
  method: "POST",
  body: {
    handle: "demo-admin",
    password: process.env.LOCAL_DEMO_PASSWORD ?? "Local-demo-2026!",
  },
});
await admin(`/api/streamer/rooms/${room.slug}/webrtc/publish`, {
  method: "POST",
  body: { sdp: testSdp },
  expected: 403,
});
const reports = await admin("/api/admin/reports");
const report = reports.reports.find(
  (item) =>
    item.status === "open" && item.reason === "Expanded local verifier report",
);
assert.ok(report);
await admin(`/api/admin/reports/${report.id}`, {
  method: "POST",
  body: { status: "reviewed" },
});
await admin(`/api/admin/rooms/${room.slug}/moderation`, {
  method: "POST",
  body: {
    targetId: "10000000-0000-4000-8000-000000000001",
    action: "mute",
    reason: "expanded verifier",
  },
});
const audit = await admin(`/api/admin/rooms/${room.slug}/moderation`);
assert.ok(audit.events.some((event) => event.action === "mute"));
const transactions = await admin("/api/admin/test-transactions");
assert.ok(
  transactions.transactions.some((entry) => entry.reference_type === "gift"),
);
assert.ok(
  transactions.transactions.some(
    (entry) => entry.reference_type === "private_show",
  ),
);
assert.ok(
  transactions.transactions.some(
    (entry) => entry.reference_type === "room_action",
  ),
);
const users = await admin("/api/admin/users");
assert.equal(users.users.length, 8);
assert.equal(users.users.filter((user) => user.role === "streamer").length, 6);
const broadcasts = await admin("/api/admin/rooms/broadcasts");
assert.ok(
  broadcasts.rooms.some(
    (item) => item.slug === room.slug && item.broadcast_state === "live",
  ),
);

console.log(
  "Expanded audience, creator action menu, goal progress, private-show, wallet, report, and admin workflows verified.",
);
