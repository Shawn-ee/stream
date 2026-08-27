import {
  createPrivateKey,
  sign,
  type JsonWebKey,
  type KeyObject,
} from "node:crypto";
import {
  config,
  hasCloudflareStreamSigningConfiguration,
  hasCloudflareStreamConfiguration,
  required,
} from "./config.js";

type Fetcher = typeof fetch;
type LiveInputResponse = {
  success?: boolean;
  result?: {
    uid?: string;
    webRTC?: { url?: string };
    webRTCPlayback?: { url?: string };
  };
};

export type WebRtcExchange = {
  answerSdp: string;
  resourceUrl: string | null;
};

type WebRtcEndpoints = { publishUrl: string; playbackUrl: string };

const endpointCache = new Map<
  string,
  { expiresAt: number; request: Promise<WebRtcEndpoints> }
>();
let signingKeyCache:
  | { encodedJwk: string; key: KeyObject }
  | undefined;

type SigningOptions = {
  keyId?: string;
  encodedJwk?: string;
  nowSeconds?: number;
  ttlSeconds?: number;
};

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function privateSigningKey(encodedJwk: string) {
  if (signingKeyCache?.encodedJwk === encodedJwk) return signingKeyCache.key;
  let parsed: JsonWebKey;
  try {
    parsed = JSON.parse(Buffer.from(encodedJwk, "base64").toString("utf8"));
  } catch {
    throw new Error("webrtc_signing_unavailable");
  }
  if (parsed.kty !== "RSA" || !parsed.n || !parsed.e || !parsed.d)
    throw new Error("webrtc_signing_unavailable");
  try {
    const key = createPrivateKey({ key: parsed, format: "jwk" });
    signingKeyCache = { encodedJwk, key };
    return key;
  } catch {
    throw new Error("webrtc_signing_unavailable");
  }
}

export function createSignedStreamToken(
  liveInputId: string,
  options: SigningOptions = {},
) {
  const keyId = options.keyId ?? config.cloudflare.signingKeyId;
  const encodedJwk = options.encodedJwk ?? config.cloudflare.signingJwk;
  if (
    (!options.keyId &&
      !options.encodedJwk &&
      !hasCloudflareStreamSigningConfiguration()) ||
    !keyId ||
    !encodedJwk ||
    liveInputId.length < 16
  )
    throw new Error("webrtc_signing_unavailable");
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const ttlSeconds = options.ttlSeconds ?? 5 * 60;
  if (!Number.isInteger(nowSeconds) || ttlSeconds < 30 || ttlSeconds > 15 * 60)
    throw new Error("webrtc_signing_unavailable");
  const header = base64Url(JSON.stringify({ alg: "RS256", kid: keyId }));
  const payload = base64Url(
    JSON.stringify({ sub: liveInputId, kid: keyId, exp: nowSeconds + ttlSeconds }),
  );
  const unsigned = `${header}.${payload}`;
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(unsigned),
    privateSigningKey(encodedJwk),
  );
  return `${unsigned}.${base64Url(signature)}`;
}

export function createSignedWebRtcPlaybackUrl(
  playbackUrl: string,
  liveInputId: string,
  options: SigningOptions = {},
) {
  const target = safeHttpsUrl(playbackUrl, "whep");
  const segments = target.pathname.split("/");
  const inputIndex = segments.findIndex(
    (segment) => decodeURIComponent(segment) === liveInputId,
  );
  if (inputIndex < 1) throw new Error("webrtc_signing_unavailable");
  segments[inputIndex] = createSignedStreamToken(liveInputId, options);
  target.pathname = segments.join("/");
  target.search = "";
  target.hash = "";
  return target.toString();
}

function validSdp(value: string) {
  return value.length >= 20 && value.length <= 60_000 && value.startsWith("v=0");
}

function safeHttpsUrl(value: string, label: string) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:") throw new Error(`${label}_unavailable`);
  return parsed;
}

async function fetchWebRtcEndpoints(
  liveInputId: string,
  fetcher: Fetcher,
): Promise<WebRtcEndpoints> {
  if (!hasCloudflareStreamConfiguration())
    throw new Error("webrtc_service_unavailable");
  const accountId = required(config.cloudflare.accountId, "CLOUDFLARE_ACCOUNT_ID");
  const token = required(config.cloudflare.apiToken, "CLOUDFLARE_API_TOKEN");
  const response = await fetcher(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/live_inputs/${liveInputId}`,
    {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    },
  );
  const payload = (await response.json()) as LiveInputResponse;
  const publishUrl = payload.result?.webRTC?.url;
  const playbackUrl = payload.result?.webRTCPlayback?.url;
  if (
    !response.ok ||
    payload.success !== true ||
    payload.result?.uid !== liveInputId ||
    !publishUrl ||
    !playbackUrl
  )
    throw new Error("webrtc_service_unavailable");
  return {
    publishUrl: safeHttpsUrl(publishUrl, "whip").toString(),
    playbackUrl: safeHttpsUrl(playbackUrl, "whep").toString(),
  };
}

export async function readWebRtcEndpoints(
  liveInputId: string,
  fetcher: Fetcher = fetch,
) {
  if (fetcher !== fetch) return fetchWebRtcEndpoints(liveInputId, fetcher);
  const cached = endpointCache.get(liveInputId);
  if (cached && cached.expiresAt > Date.now()) return cached.request;
  const request = fetchWebRtcEndpoints(liveInputId, fetcher);
  endpointCache.set(liveInputId, {
    expiresAt: Date.now() + 5 * 60_000,
    request,
  });
  try {
    return await request;
  } catch (error) {
    if (endpointCache.get(liveInputId)?.request === request)
      endpointCache.delete(liveInputId);
    throw error;
  }
}

export async function exchangeWebRtcOffer(
  endpoint: string,
  offerSdp: string,
  fetcher: Fetcher = fetch,
): Promise<WebRtcExchange> {
  if (!validSdp(offerSdp)) throw new Error("invalid_webrtc_offer");
  const target = safeHttpsUrl(endpoint, "webrtc");
  const response = await fetcher(target, {
    method: "POST",
    headers: {
      accept: "application/sdp",
      "content-type": "application/sdp",
    },
    body: offerSdp,
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  const answerSdp = await response.text();
  if (!response.ok || !validSdp(answerSdp))
    throw new Error("webrtc_negotiation_failed");
  const location = response.headers.get("location");
  let resourceUrl: string | null = null;
  if (location) {
    const resolved = new URL(location, target);
    if (resolved.protocol !== "https:" || resolved.hostname !== target.hostname)
      throw new Error("webrtc_negotiation_failed");
    resourceUrl = resolved.toString();
  }
  return { answerSdp, resourceUrl };
}

export async function endWebRtcResource(
  resourceUrl: string | null,
  fetcher: Fetcher = fetch,
) {
  if (!resourceUrl) return;
  const target = safeHttpsUrl(resourceUrl, "webrtc");
  await fetcher(target, {
    method: "DELETE",
    redirect: "manual",
    signal: AbortSignal.timeout(8_000),
  }).catch(() => undefined);
}
