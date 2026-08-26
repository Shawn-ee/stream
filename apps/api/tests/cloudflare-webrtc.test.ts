import assert from "node:assert/strict";
import test from "node:test";
import {
  endWebRtcResource,
  exchangeWebRtcOffer,
} from "../src/cloudflare-webrtc.js";

const offer = "v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\ns=test\r\nt=0 0\r\n";
const answer = "v=0\r\no=- 2 2 IN IP4 127.0.0.1\r\ns=answer\r\nt=0 0\r\n";

test("exchanges SDP without returning the fixed provider endpoint", async () => {
  let requestBody = "";
  const result = await exchangeWebRtcOffer(
    "https://media.example.test/private/webRTC/publish",
    offer,
    (async (_input: URL | RequestInfo, init?: RequestInit) => {
      requestBody = String(init?.body ?? "");
      return new Response(answer, {
        status: 201,
        headers: {
          "content-type": "application/sdp",
          location: "/session/opaque-resource",
        },
      });
    }) as typeof fetch,
  );
  assert.equal(requestBody, offer);
  assert.equal(result.answerSdp, answer);
  assert.equal(
    result.resourceUrl,
    "https://media.example.test/session/opaque-resource",
  );
  assert.equal(JSON.stringify(result).includes("/private/webRTC/publish"), false);
});

test("rejects malformed SDP and cross-origin resource locations", async () => {
  await assert.rejects(
    () => exchangeWebRtcOffer("https://media.example.test/publish", "bad"),
    /invalid_webrtc_offer/,
  );
  await assert.rejects(
    () =>
      exchangeWebRtcOffer(
        "https://media.example.test/publish",
        offer,
        (async () =>
          new Response(answer, {
            status: 201,
            headers: { location: "https://attacker.example/session" },
          })) as typeof fetch,
      ),
    /webrtc_negotiation_failed/,
  );
});

test("terminates only the supplied HTTPS provider resource", async () => {
  let method = "";
  await endWebRtcResource(
    "https://media.example.test/session/one",
    (async (_input: URL | RequestInfo, init?: RequestInit) => {
      method = init?.method ?? "";
      return new Response(null, { status: 204 });
    }) as typeof fetch,
  );
  assert.equal(method, "DELETE");
  await assert.rejects(
    () => endWebRtcResource("http://media.example.test/session/one"),
    /webrtc_unavailable/,
  );
});
