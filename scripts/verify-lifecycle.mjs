import assert from "node:assert/strict";

const base = "http://127.0.0.1:3001";
const password = process.env.LOCAL_DEMO_PASSWORD ?? "Local-demo-2026!";
function session() {
  const cookies = new Map();
  return async (path, { method = "GET", body, expected = 200 } = {}) => {
    const cookie = [...cookies]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(body ? { "content-type": "application/json" } : {}),
        ...(cookies.get("stream_csrf") && method !== "GET"
          ? { "x-csrf-token": cookies.get("stream_csrf") }
          : {}),
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
const streamer = session();
const audience = session();
await streamer("/api/auth/login", {
  method: "POST",
  body: { handle: "demo-streamer", password },
});
await audience("/api/auth/login", {
  method: "POST",
  body: { handle: "demo-audience", password },
});
for (const state of [
  "connecting",
  "offline",
  "unavailable",
  "live",
  "offline",
]) {
  const result = await streamer(
    "/api/streamer/rooms/demo-streamer/broadcast/local-status",
    { method: "PUT", body: { state } },
  );
  assert.equal(result.broadcast.state, state);
  assert.equal(
    (await audience("/api/rooms/demo-streamer/broadcast")).broadcast.state,
    state,
  );
}
await audience("/api/rooms/demo-streamer/playback", { expected: 409 });
console.log(
  "Local broadcast lifecycle states and safe viewer status verified.",
);
