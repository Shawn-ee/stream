import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import test from "node:test";
import {
  createSignedStreamToken,
  createSignedWebRtcPlaybackUrl,
  endWebRtcResource,
  exchangeWebRtcOffer,
} from "../src/cloudflare-webrtc.js";

const offer = "v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\ns=test\r\nt=0 0\r\n";
const answer = "v=0\r\no=- 2 2 IN IP4 127.0.0.1\r\ns=answer\r\nt=0 0\r\n";
const signingPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const encodedJwk = Buffer.from(
  JSON.stringify(signingPair.privateKey.export({ format: "jwk" })),
).toString("base64");
const signing = {
  keyId: "0123456789abcdef0123456789abcdef",
  encodedJwk,
  nowSeconds: 1_800_000_000,
  ttlSeconds: 300,
};

test("creates a short-lived RS256 Stream token without exposing key material", () => {
  const token = createSignedStreamToken(
    "abcdef0123456789abcdef0123456789",
    signing,
  );
  const [headerPart, payloadPart, signaturePart] = token.split(".");
  assert.deepEqual(
    JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8")),
    { alg: "RS256", kid: signing.keyId },
  );
  assert.deepEqual(
    JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")),
    {
      sub: "abcdef0123456789abcdef0123456789",
      kid: signing.keyId,
      exp: 1_800_000_300,
    },
  );
  assert.equal(
    verify(
      "RSA-SHA256",
      Buffer.from(`${headerPart}.${payloadPart}`),
      signingPair.publicKey,
      Buffer.from(signaturePart, "base64url"),
    ),
    true,
  );
  assert.equal(token.includes(encodedJwk), false);
});

test("replaces only the live input segment in the WHEP URL", () => {
  const liveInputId = "abcdef0123456789abcdef0123456789";
  const signedUrl = createSignedWebRtcPlaybackUrl(
    `https://customer.example.test/${liveInputId}/webRTC/play`,
    liveInputId,
    signing,
  );
  const parsed = new URL(signedUrl);
  assert.equal(parsed.protocol, "https:");
  assert.equal(parsed.hostname, "customer.example.test");
  assert.equal(parsed.pathname.endsWith("/webRTC/play"), true);
  assert.equal(parsed.pathname.includes(liveInputId), false);
  assert.equal(parsed.pathname.split("/")[1]?.split(".").length, 3);
  assert.throws(
    () =>
      createSignedWebRtcPlaybackUrl(
        "https://customer.example.test/another-input/webRTC/play",
        liveInputId,
        signing,
      ),
    /webrtc_signing_unavailable/,
  );
});

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
