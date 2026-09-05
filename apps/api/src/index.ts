import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import Fastify, { type FastifyReply } from "fastify";
import { createHash, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createConnection } from "node:net";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { Server } from "socket.io";
import { createPlaybackUrl } from "./cloudflare-stream.js";
import {
  createSignedWebRtcPlaybackUrl,
  endWebRtcResource,
  exchangeWebRtcOffer,
  readWebRtcEndpoints,
} from "./cloudflare-webrtc.js";
import { createBroadcastPoller } from "./broadcast-poller.js";
import {
  broadcastLifecycleEvent,
  broadcastRecoveryMessage,
  statusDuringRecovery,
} from "./broadcast-recovery.js";
import {
  cloudflareBroadcastStatus,
  localBroadcastStatus,
  type BroadcastStatus,
} from "./broadcast-status.js";
import {
  config,
  hasCloudflareQuickLiveConfiguration,
  hasCloudflareStreamConfiguration,
  required,
} from "./config.js";
import {
  closeDatabasePool,
  database,
  databasePoolStats,
} from "./db/pool.js";
import {
  AccountSecurityError,
  authenticateCredentials,
  changeAccountPassword,
  clientLabelForUserAgent,
  createSession,
  listUserSessions,
  registerAudienceAccount,
  RegistrationError,
  revokeOtherUserSessions,
  revokeSession,
  revokeUserSession,
  sessionTokenFromCookieHeader,
  userForSessionToken,
} from "./auth.js";
import { mutationSchemas } from "./validation.js";
import {
  AvatarUploadError,
  avatarPath,
  avatarUploadLimitBytes,
  removeStoredAvatar,
  saveAvatar,
} from "./avatar-storage.js";
import {
  removeStoredStreamThumbnail,
  saveStreamThumbnail,
  streamThumbnailPath,
  StreamThumbnailUploadError,
  streamThumbnailUploadLimitBytes,
} from "./stream-thumbnail-storage.js";
import { renderSocialPreview, validSocialPreviewPath, type SocialPreviewKind } from "./social-preview.js";
import { IdentityDocumentUploadError, identityDocumentLimitBytes, readIdentityDocument, removeIdentityDocument, saveIdentityDocument, verifyIdentityDocumentStorage, type IdentityDocumentType } from "./identity-document-storage.js";

type Role = "audience" | "streamer" | "admin";
type CreatorStatus =
  | "AUDIENCE" | "ONBOARDING_PROFILE" | "ONBOARDING_IDENTITY"
  | "ONBOARDING_AGREEMENT" | "READY_FOR_REVIEW" | "PENDING_REVIEW"
  | "APPROVED" | "ACTIVE" | "REJECTED" | "SUSPENDED";
type DemoUser = {
  id: string;
  handle: string;
  displayName: string;
  role: Role;
  locale: "en" | "zh";
  ageAcknowledged: boolean;
};
type RoomClassificationInput = {
  primaryLanguage: string;
  additionalLanguages: string[];
  tagIds: string[];
};
const identityDocumentViews = new Map<string,{adminId:string;documentId:string;expiresAt:number}>();

const reservedCreatorTagSlugs = new Set(["admin", "featured", "moderation", "system", "trending"]);
const prohibitedCreatorTagTerms = ["child sexual", "minor sexual", "terrorism", "human trafficking"];

function normalizeCreatorTag(raw: string) {
  const displayName = raw.trim().replace(/^#+/, "").replace(/\s+/g, " ");
  if (
    [...displayName].length < 2 ||
    [...displayName].length > 30 ||
    !/^[\p{L}\p{N}][\p{L}\p{N}\s&+.'’_-]*$/u.test(displayName)
  ) return null;
  const normalizedName = displayName.normalize("NFKC").toLocaleLowerCase("en-US");
  let slug = displayName
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  if (!slug) slug = `tag-${createHash("sha256").update(normalizedName).digest("hex").slice(0, 16)}`;
  if (reservedCreatorTagSlugs.has(slug) || prohibitedCreatorTagTerms.some((term) => normalizedName.includes(term))) return null;
  return { displayName, slug };
}

async function validateRoomClassification(client: ReturnType<typeof database>, input: RoomClassificationInput) {
  const languages=[input.primaryLanguage,...input.additionalLanguages];
  if(!/^[a-z]{2}$/.test(input.primaryLanguage)||input.additionalLanguages.length>2||languages.length>3||new Set(languages).size!==languages.length)
    return "invalid_room_languages";
  const supported=await client.query("SELECT language_code FROM supported_languages WHERE enabled=TRUE AND language_code=ANY($1::text[])",[languages]);
  if(supported.rows.length!==languages.length)return "unsupported_room_language";
  if(input.tagIds.length>8||new Set(input.tagIds).size!==input.tagIds.length||input.tagIds.some(id=>!/^[0-9a-f-]{36}$/i.test(id)))return "invalid_room_tags";
  if(input.tagIds.length){
    const allowed=await client.query("SELECT id FROM tags WHERE id=ANY($1::uuid[]) AND status='ACTIVE' AND creator_selectable=TRUE AND tag_type IN ('CONTENT','FORMAT','MOOD')",[input.tagIds]);
    if(allowed.rows.length!==input.tagIds.length)return "unauthorized_room_tag";
  }
  return null;
}

async function replaceRoomClassification(client: ReturnType<typeof database>, roomId:string, input:RoomClassificationInput) {
  const languages=[input.primaryLanguage,...input.additionalLanguages];
  await client.query("DELETE FROM room_languages WHERE room_id=$1",[roomId]);
  for(let index=0;index<languages.length;index++)await client.query("INSERT INTO room_languages(room_id,language_code,is_primary,display_order) VALUES($1,$2,$3,$4)",[roomId,languages[index],index===0,index]);
  await client.query("DELETE FROM room_tags rt USING tags t WHERE rt.tag_id=t.id AND rt.room_id=$1 AND rt.source IN ('CREATOR','PLATFORM') AND t.tag_type IN ('CONTENT','FORMAT','MOOD','COMMUNITY')",[roomId]);
  for(let index=0;index<input.tagIds.length;index++)await client.query("INSERT INTO room_tags(room_id,tag_id,source,display_order) VALUES($1,$2,'CREATOR',$3)",[roomId,input.tagIds[index],index]);
  await client.query("UPDATE live_rooms SET stream_language=$1,stream_tags=(SELECT COALESCE(array_agg(t.display_name ORDER BY rt.display_order),'{}'::text[]) FROM room_tags rt JOIN tags t ON t.id=rt.tag_id WHERE rt.room_id=$2 AND t.status='ACTIVE' AND t.tag_type IN ('CONTENT','FORMAT','MOOD')),updated_at=NOW() WHERE id=$2",[input.primaryLanguage,roomId]);
}

const roomClassificationSelect = `
  COALESCE((SELECT jsonb_agg(jsonb_build_object('code',l.language_code,'nameEn',l.name_en,'nameNative',l.name_native,'isPrimary',rl.is_primary) ORDER BY rl.display_order) FROM room_languages rl JOIN supported_languages l ON l.language_code=rl.language_code WHERE rl.room_id=r.id AND l.enabled=TRUE),'[]'::jsonb) AS languages,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('id',t.id,'slug',t.normalized_slug,'displayName',t.display_name,'type',t.tag_type) ORDER BY rt.display_order) FROM room_tags rt JOIN tags t ON t.id=rt.tag_id WHERE rt.room_id=r.id AND t.status='ACTIVE' AND t.tag_type IN ('CONTENT','FORMAT','MOOD')),'[]'::jsonb) AS tags`;

async function deliverDueScheduleReminders() {
  const client = database();
  await client.connect();
  try {
    return await client.query<{ id:string; user_id:string; room_slug:string }>(
      `INSERT INTO notifications (id,user_id,kind,title,body,room_id,notification_key)
       SELECT gen_random_uuid(),f.follower_id,'schedule_reminder',
              CASE WHEN viewer.locale='zh' THEN '关注的主播即将开播' ELSE 'A creator you follow starts soon' END,
              CASE WHEN viewer.locale='zh'
                THEN creator.display_name || ' 计划在一小时内开播。'
                ELSE creator.display_name || ' is scheduled to go live within the next hour.' END,
              room.id,'schedule_reminder:' || f.streamer_id::text || ':' || EXTRACT(EPOCH FROM profile.next_stream_at)::bigint::text
       FROM follows f
       JOIN users viewer ON viewer.id=f.follower_id
       JOIN users creator ON creator.id=f.streamer_id
       JOIN streamer_profiles profile ON profile.user_id=f.streamer_id
       JOIN live_rooms room ON room.streamer_id=f.streamer_id AND room.publication_status='published'
       JOIN creator_accounts creator_account ON creator_account.user_id=f.streamer_id AND creator_account.status='ACTIVE'
       WHERE f.reminder_enabled=TRUE
         AND profile.next_stream_at>NOW()
         AND profile.next_stream_at<=NOW()+INTERVAL '1 hour'
         AND room.broadcast_state<>'live'
       ON CONFLICT (user_id,notification_key) WHERE notification_key IS NOT NULL DO NOTHING
       RETURNING id,user_id,(SELECT slug FROM live_rooms WHERE id=room_id) AS room_slug`,
    );
  } finally {
    await client.end();
  }
}

type BroadcastTransport = "obs_hls" | "browser_webrtc";
type CreatorWalletPeriod = "session" | "7d" | "30d" | "lifetime";
type CreatorWalletType = "all" | "gift" | "action" | "private_show";
type CreatorPeriodBounds = {
  from: Date | null;
  to: Date | null;
};
type WebRtcResource = {
  resourceUrl: string | null;
  roomSlug: string;
  userId: string | null;
  kind: "publish" | "playback";
  expiresAt: number;
};
const publishResourceTtlMilliseconds = 50_000;
const playbackResourceTtlMilliseconds = 3 * 60_000;
const broadcastRecoveryGraceMilliseconds = 45_000;
const roles: Role[] = ["audience", "streamer", "admin"];

function creatorWalletPeriod(value: unknown): CreatorWalletPeriod | null {
  return value === "session" || value === "7d" || value === "30d" || value === "lifetime"
    ? value
    : null;
}

function creatorWalletType(value: unknown): CreatorWalletType | null {
  return value === "all" || value === "gift" || value === "action" || value === "private_show"
    ? value
    : null;
}

async function creatorPeriodBounds(
  client: ReturnType<typeof database>,
  roomId: string,
  period: CreatorWalletPeriod,
): Promise<CreatorPeriodBounds> {
  if (period === "lifetime") return { from: null, to: null };
  if (period === "7d" || period === "30d") {
    const days = period === "7d" ? 7 : 30;
    return { from: new Date(Date.now() - days * 86_400_000), to: null };
  }
  const session = await client.query<{ started_at: Date | null; ended_at: Date | null }>(
    "SELECT started.created_at AS started_at,ended.created_at AS ended_at FROM live_rooms r LEFT JOIN LATERAL (SELECT e.created_at FROM room_lifecycle_events e WHERE e.room_id=r.id AND e.event_type='broadcast_started' ORDER BY e.created_at DESC LIMIT 1) started ON TRUE LEFT JOIN LATERAL (SELECT e.created_at FROM room_lifecycle_events e WHERE e.room_id=r.id AND e.created_at>started.created_at AND e.state<>'live' ORDER BY e.created_at ASC LIMIT 1) ended ON started.created_at IS NOT NULL WHERE r.id=$1",
    [roomId],
  );
  return {
    from: session.rows[0]?.started_at ?? null,
    to: session.rows[0]?.ended_at ?? null,
  };
}

function encodeCreatorWalletCursor(createdAt: Date, id: string) {
  return Buffer.from(JSON.stringify([createdAt.toISOString(), id]), "utf8").toString("base64url");
}

function decodeCreatorWalletCursor(value: unknown): { createdAt: Date; id: string } | null {
  if (typeof value !== "string" || value.length > 256) return null;
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!Array.isArray(decoded) || decoded.length !== 2) return null;
    const createdAt = new Date(decoded[0]);
    const id = decoded[1];
    if (Number.isNaN(createdAt.getTime()) || typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

function encodeFollowerCursor(createdAt: Date, id: string) {
  return Buffer.from(JSON.stringify([createdAt.toISOString(), id]), "utf8").toString("base64url");
}

function decodeFollowerCursor(value: unknown): { createdAt: Date; id: string } | null {
  if (typeof value !== "string" || value.length > 256) return null;
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!Array.isArray(decoded) || decoded.length !== 2) return null;
    const createdAt = new Date(decoded[0]);
    const id = decoded[1];
    if (Number.isNaN(createdAt.getTime()) || typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}
let realtime: Server | null = null;
const broadcastRecoveryWindows = new Map<string, number>();
const runtimeMetrics = {
  httpRequestsTotal: 0,
  httpErrorsTotal: 0,
  httpRateLimitedTotal: 0,
  httpDurationMillisecondsTotal: 0,
  readinessFailuresTotal: 0,
  realtimeConnectionsTotal: 0,
  realtimeConnectionsCurrent: 0,
  realtimeErrorsTotal: 0,
  chatMessagesTotal: 0,
};

function safeTokenMatch(received: string | undefined, expected: string) {
  if (!received?.startsWith("Bearer ")) return false;
  const actual = Buffer.from(received.slice("Bearer ".length));
  const target = Buffer.from(expected);
  return actual.length === target.length && timingSafeEqual(actual, target);
}

function redisMetric(source: string, name: string) {
  return Number(source.match(new RegExp(`^${name}:(\\d+)\\r?$`, "m"))?.[1] ?? 0);
}

function validTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function prometheusMetrics(redis: {
  usedMemoryBytes: number;
  connectedClients: number;
}) {
  const database = databasePoolStats();
  const lines = [
    "# HELP stream_http_requests_total HTTP requests received by this API process.",
    "# TYPE stream_http_requests_total counter",
    `stream_http_requests_total ${runtimeMetrics.httpRequestsTotal}`,
    "# HELP stream_http_errors_total HTTP responses with status 400 or greater.",
    "# TYPE stream_http_errors_total counter",
    `stream_http_errors_total ${runtimeMetrics.httpErrorsTotal}`,
    "# TYPE stream_http_rate_limited_total counter",
    `stream_http_rate_limited_total ${runtimeMetrics.httpRateLimitedTotal}`,
    "# TYPE stream_http_duration_milliseconds_total counter",
    `stream_http_duration_milliseconds_total ${runtimeMetrics.httpDurationMillisecondsTotal.toFixed(3)}`,
    "# TYPE stream_readiness_failures_total counter",
    `stream_readiness_failures_total ${runtimeMetrics.readinessFailuresTotal}`,
    "# TYPE stream_realtime_connections_total counter",
    `stream_realtime_connections_total ${runtimeMetrics.realtimeConnectionsTotal}`,
    "# TYPE stream_realtime_connections gauge",
    `stream_realtime_connections ${runtimeMetrics.realtimeConnectionsCurrent}`,
    "# TYPE stream_realtime_errors_total counter",
    `stream_realtime_errors_total ${runtimeMetrics.realtimeErrorsTotal}`,
    "# TYPE stream_chat_messages_total counter",
    `stream_chat_messages_total ${runtimeMetrics.chatMessagesTotal}`,
    "# TYPE stream_database_pool_connections gauge",
    `stream_database_pool_connections{state=\"total\"} ${database.total}`,
    `stream_database_pool_connections{state=\"idle\"} ${database.idle}`,
    `stream_database_pool_connections{state=\"waiting\"} ${database.waiting}`,
    "# TYPE stream_database_pool_errors_total counter",
    `stream_database_pool_errors_total ${database.errorsTotal}`,
    "# TYPE stream_process_resident_memory_bytes gauge",
    `stream_process_resident_memory_bytes ${process.memoryUsage().rss}`,
    "# TYPE stream_process_uptime_seconds gauge",
    `stream_process_uptime_seconds ${process.uptime().toFixed(3)}`,
    "# TYPE stream_redis_used_memory_bytes gauge",
    `stream_redis_used_memory_bytes ${redis.usedMemoryBytes}`,
    "# TYPE stream_redis_connected_clients gauge",
    `stream_redis_connected_clients ${redis.connectedClients}`,
  ];
  return `${lines.join("\n")}\n`;
}

async function persistBroadcastStatus(slug: string, status: BroadcastStatus) {
  const client = database();
  await client.connect();
  try {
    await client.query("BEGIN");
    const previous = await client.query<{
      id: string;
      streamer_id: string;
      streamer_name: string;
      broadcast_state: string;
      broadcast_transport: BroadcastTransport;
    }>(
      `SELECT r.id,r.streamer_id,u.display_name AS streamer_name,
              r.broadcast_state,r.broadcast_transport
       FROM live_rooms r JOIN users u ON u.id=r.streamer_id
       WHERE r.slug=$1 FOR UPDATE OF r`,
      [slug],
    );
    if (!previous.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }
    const changed = previous.rows[0].broadcast_state !== status.state;
    const recovering = broadcastRecoveryWindows.has(slug);
    await client.query(
      "UPDATE live_rooms SET status=CASE WHEN $1::broadcast_lifecycle_state='live' THEN 'live'::room_status ELSE 'offline'::room_status END,broadcast_state=$1::broadcast_lifecycle_state,broadcast_checked_at=NOW(),broadcast_status_message=$2,broadcast_status_source=$3,updated_at=NOW() WHERE slug=$4",
      [status.state, status.message, status.source, slug],
    );
    const eventType = broadcastLifecycleEvent(
      previous.rows[0].broadcast_state as BroadcastStatus["state"],
      status.state,
      recovering,
    );
    const lifecycleEventId = changed ? crypto.randomUUID() : null;
    if (changed)
      await client.query(
        "INSERT INTO room_lifecycle_events (id,room_id,state,event_type,message) SELECT $1,id,$2::broadcast_lifecycle_state,$3,$4 FROM live_rooms WHERE slug=$5",
        [lifecycleEventId, status.state, eventType, status.message, slug],
      );
    if (changed && ["broadcast_started", "broadcast_ended"].includes(eventType))
      await client.query(
        `INSERT INTO notifications
         (id,user_id,kind,title,body,room_id,notification_key)
         SELECT gen_random_uuid(),f.follower_id,$1,
                CASE WHEN viewer.locale='zh'
                  THEN CASE WHEN $1='creator_live' THEN '关注的主播开播了' ELSE '直播已结束' END
                  ELSE CASE WHEN $1='creator_live' THEN 'A creator you follow is live' ELSE 'Broadcast ended' END END,
                CASE WHEN viewer.locale='zh'
                  THEN CASE WHEN $1='creator_live' THEN $2 || ' 现在正在直播。' ELSE $2 || ' 的直播已结束。' END
                  ELSE CASE WHEN $1='creator_live' THEN $2 || ' is live now.' ELSE $2 || '''s broadcast has ended.' END END,
                $3,$4
         FROM follows f JOIN users viewer ON viewer.id=f.follower_id
         WHERE f.streamer_id=$5
         ON CONFLICT (user_id,notification_key) WHERE notification_key IS NOT NULL DO NOTHING`,
        [
          eventType === "broadcast_started" ? "creator_live" : "creator_offline",
          previous.rows[0].streamer_name,
          previous.rows[0].id,
          `${eventType}:${lifecycleEventId}`,
          previous.rows[0].streamer_id,
        ],
      );
    await client.query("COMMIT");
    if (changed) {
      const event = {
        slug,
        state: status.state,
        source: status.source,
        transport: previous.rows[0].broadcast_transport,
        message: status.message,
        checkedAt: new Date().toISOString(),
      };
      realtime?.to(`room:${slug}`).emit("broadcast:state", event);
      realtime?.to("discovery").emit("discovery:broadcast", event);
    }
    return { ...status, checkedAt: new Date().toISOString() };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

async function persistPolledBroadcastStatus(slug: string, status: BroadcastStatus) {
  const recoveryDeadline = broadcastRecoveryWindows.get(slug);
  const recovered = statusDuringRecovery(status, recoveryDeadline);
  const result = await persistBroadcastStatus(slug, recovered.status);
  if (recovered.recoveryComplete) broadcastRecoveryWindows.delete(slug);
  return result;
}
export function buildApi() {
  const api = Fastify({
    logger: {
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.body.password",
          "req.body.sdp",
          "res.headers.set-cookie",
        ],
        censor: "[REDACTED]",
      },
    },
    bodyLimit: config.requestBodyLimitBytes,
    trustProxy: config.trustProxy,
  });
  const rateBuckets = new Map<string, { count: number; resetAt: number }>();
  const webRtcResources = new Map<string, WebRtcResource>();
  const expireWebRtcResource = async (sessionId: string, resource: WebRtcResource) => {
    webRtcResources.delete(sessionId);
    await endWebRtcResource(resource.resourceUrl);
    if (resource.kind !== "publish") return;
    if (!broadcastRecoveryWindows.has(resource.roomSlug))
      broadcastRecoveryWindows.set(
        resource.roomSlug,
        Date.now() + broadcastRecoveryGraceMilliseconds,
      );
    const client = database();
    await client.connect();
    try {
      await client.query(
        "UPDATE broadcast_sessions SET state='ended',ended_at=NOW(),failure_code='heartbeat_expired',updated_at=NOW() WHERE id=$1 AND state IN ('connecting','active')",
        [sessionId],
      );
    } finally {
      await client.end();
    }
    await persistBroadcastStatus(resource.roomSlug, {
      state: "connecting",
      message: broadcastRecoveryMessage,
      source: "cloudflare",
    });
  };
  const webRtcResourcePruner = setInterval(() => {
    const now = Date.now();
    for (const [sessionId, resource] of webRtcResources) {
      if (resource.expiresAt > now) continue;
      void expireWebRtcResource(sessionId, resource).catch((error) =>
        api.log.error(
          { name: (error as Error).name, slug: resource.roomSlug },
          "Unable to expire WebRTC resource",
        ),
      );
    }
  }, 10_000);
  webRtcResourcePruner.unref();
  api.addHook("onClose", async () => {
    clearInterval(webRtcResourcePruner);
    const resources = [...webRtcResources.values()];
    webRtcResources.clear();
    await Promise.allSettled(
      resources.map((resource) => endWebRtcResource(resource.resourceUrl)),
    );
  });
  const requestStartedAt = new WeakMap<object, number>();
  void api.register(cors, {
    origin: config.webOrigin,
    credentials: true,
  });
  void api.register(cookie);
  void api.register(multipart, {
    limits: { files: 1, fileSize: identityDocumentLimitBytes, fields: 0 },
  });
  api.addHook("onRequest", async (request) => {
    runtimeMetrics.httpRequestsTotal += 1;
    requestStartedAt.set(request, performance.now());
  });
  api.addHook("preHandler", async (request, reply) => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return;
    const baseLimit =
      request.url === "/api/auth/register"
        ? 5
        : request.url === "/api/auth/login"
        ? 15
        : request.url === "/api/account/password"
          ? 10
        : request.url === "/api/studio/tags"
          ? 20
        : request.url.includes("/identity-document")
          ? 10
        : request.url.includes("/creator-reviews/")
          ? 30
        : request.url.includes("/reports")
          ? 20
          : request.url.includes("/gifts") || request.url.includes("/purchase")
            ? 120
            : 180;
    const credentialHandle =
      request.url === "/api/auth/login" || request.url === "/api/auth/register"
        ? ((request.body as { handle?: string } | undefined)?.handle
            ?.trim()
            .toLowerCase() ?? "missing")
        : "";
    const key = `${request.ip}:${request.method}:${request.routeOptions.url ?? request.url}:${credentialHandle}`;
    const now = Date.now();
    const current = rateBuckets.get(key);
    const bucket =
      !current || current.resetAt <= now
        ? { count: 0, resetAt: now + 60_000 }
        : current;
    bucket.count += 1;
    rateBuckets.set(key, bucket);
    if (bucket.count > Math.ceil(baseLimit * config.rateLimitMultiplier)) {
      runtimeMetrics.httpRateLimitedTotal += 1;
      reply.header(
        "retry-after",
        Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      );
      return reply.code(429).send({ error: "rate_limited" });
    }
  });
  api.addHook("onSend", async (_request, reply, payload) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("referrer-policy", "strict-origin-when-cross-origin");
    reply.header(
      "permissions-policy",
      "camera=(), microphone=(), geolocation=()",
    );
    reply.header("cross-origin-opener-policy", "same-origin");
    return payload;
  });
  api.addHook("onResponse", async (request, reply) => {
    if (reply.statusCode >= 400) runtimeMetrics.httpErrorsTotal += 1;
    const startedAt = requestStartedAt.get(request);
    if (startedAt !== undefined)
      runtimeMetrics.httpDurationMillisecondsTotal += performance.now() - startedAt;
  });
  api.setErrorHandler((error, request, reply) => {
    request.log.error(
      {
        errorName: (error as { name?: string }).name,
        errorCode: (error as { code?: string }).code,
      },
      "Request failed",
    );
    void reply
      .status((error as { statusCode?: number }).statusCode ?? 500)
      .send({
        error: (error as { code?: string }).code ?? "internal_error",
        requestId: request.id,
      });
  });
  async function currentUser(request: {
    cookies: Record<string, string | undefined>;
  }) {
    return userForSessionToken(request.cookies.stream_session);
  }
  async function requireRole(
    request: { cookies: Record<string, string | undefined> },
    reply: {
      code: (statusCode: number) => { send: (payload: unknown) => unknown };
    },
    role: Role,
  ) {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "session_required" });
    if (role === "streamer") {
      const client = database();
      await client.connect();
      try {
        const creator = await client.query<{ status: CreatorStatus }>(
          "SELECT status FROM creator_accounts WHERE user_id=$1",
          [user.id],
        );
        if (creator.rows[0]?.status !== "ACTIVE") {
          return reply.code(403).send({
            error: creator.rows[0]?.status === "SUSPENDED" ? "creator_suspended" : "creator_access_required",
          });
        }
      } finally {
        await client.end();
      }
      return { ...user, role: "streamer" as const };
    }
    if (role === "audience" && (user.role === "audience" || user.role === "streamer"))
      return { ...user, role: "audience" as const };
    if (user.role !== role)
      return reply.code(403).send({ error: "role_required", role });
    return user;
  }
  async function requireAdminPermission(request: { cookies: Record<string,string|undefined> }, reply: FastifyReply, permission: string) {
    const admin = await requireRole(request,reply,"admin") as DemoUser | undefined;
    if (!admin) return;
    const client=database(); await client.connect();
    try {
      const granted=await client.query("SELECT 1 FROM admin_permissions WHERE user_id=$1 AND permission=$2",[admin.id,permission]);
      if(!granted.rows[0]) return reply.code(403).send({error:"admin_permission_required",permission});
      return admin;
    } finally { await client.end(); }
  }
  api.get("/health", async () => ({
    status: "ok",
    service: "stream-mvp-api",
    environment: "local",
  }));
  api.get("/ready", async (_request, reply) => {
    const client = database();
    try {
      await client.connect();
      await client.query("SELECT 1");
      await verifyIdentityDocumentStorage(config.identityDocumentStoragePath);
      const redis = new URL(required(config.redisUrl, "REDIS_URL"));
      await new Promise<void>((resolve, reject) => {
        const socket = createConnection({
          host: redis.hostname,
          port: Number(redis.port || 6379),
        });
        const timer = setTimeout(() => {
          socket.destroy();
          reject(new Error("redis_timeout"));
        }, 1500);
        socket.once("connect", () => {
          clearTimeout(timer);
          socket.end();
          resolve();
        });
        socket.once("error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
      });
      return { status: "ready", database: "ok", redis: "ok", privateStorage: "ok" };
    } catch {
      runtimeMetrics.readinessFailuresTotal += 1;
      return reply.code(503).send({ status: "not_ready" });
    } finally {
      await client.end().catch(() => undefined);
    }
  });
  api.get("/internal/metrics", async (request, reply) => {
    if (!safeTokenMatch(request.headers.authorization, config.metricsToken))
      return reply.code(401).send({ error: "metrics_auth_required" });
    const [redisMemoryInfo, redisClientInfo] = await Promise.all([
      redisPublisher.info("memory"),
      redisPublisher.info("clients"),
    ]);
    reply.header("cache-control", "no-store");
    return reply
      .type("text/plain; version=0.0.4; charset=utf-8")
      .send(
        prometheusMetrics({
          usedMemoryBytes: redisMetric(redisMemoryInfo, "used_memory"),
          connectedClients: redisMetric(redisClientInfo, "connected_clients"),
        }),
      );
  });
  api.addHook("preHandler", async (request, reply) => {
    const publicPlaybackSignal = /^\/api\/rooms\/[^/]+\/webrtc\/play(?:\/[^/?]+)?(?:\?.*)?$/.test(request.url);
    if (
      !["POST", "PUT", "PATCH", "DELETE"].includes(request.method) ||
      ["/api/auth/login", "/api/auth/register"].includes(request.url) ||
      publicPlaybackSignal
    )
      return;
    if (!request.url.startsWith("/api/")) return;
    if (!request.cookies.stream_session) return;
    const cookieToken = request.cookies.stream_csrf;
    const headerToken = request.headers["x-csrf-token"];
    if (
      !cookieToken ||
      typeof headerToken !== "string" ||
      headerToken !== cookieToken
    )
      return reply.code(403).send({ error: "csrf_validation_failed" });
  });
  api.get("/api/auth/session", async (request) => {
    const user=await currentUser(request);if(!user)return {user:null};
    const client=database();await client.connect();try{const creator=await client.query<{status:CreatorStatus}>("SELECT status FROM creator_accounts WHERE user_id=$1",[user.id]);return {user:{...user,creatorStatus:creator.rows[0]?.status??"AUDIENCE"}};}finally{await client.end();}
  });
  api.get("/api/broadcast/access", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "session_required" });
    const client = database();
    await client.connect();
    try {
      const result = await client.query<{ status: CreatorStatus }>(
        "SELECT status FROM creator_accounts WHERE user_id=$1",
        [user.id],
      );
      const status = result.rows[0]?.status ?? "AUDIENCE";
      return { allowed: status === "ACTIVE", status, onboardingEnabled: config.creatorOnboardingEnabled };
    } finally {
      await client.end();
    }
  });
  api.get("/api/creator/onboarding", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "session_required" });
    if (user.role === "admin") return reply.code(403).send({ error: "creator_role_not_eligible" });
    const client = database();
    await client.connect();
    try {
      const account=await client.query("SELECT status,reason_code,activated_at,activation_method,administrative_review_status,updated_at FROM creator_accounts WHERE user_id=$1", [user.id]);
      const draft=await client.query("SELECT creator_handle,display_name,bio,primary_language,timezone,profile_completed_at,updated_at FROM creator_onboarding WHERE user_id=$1", [user.id]);
      const identity=await client.query("SELECT id,document_type,mime_type,file_size,status,uploaded_at,reviewed_at FROM creator_identity_documents WHERE user_id=$1 AND status<>'SUPERSEDED' ORDER BY uploaded_at DESC LIMIT 1", [user.id]);
      const agreement=await client.query("SELECT v.version,v.title,v.content_text,v.effective_at,(a.id IS NOT NULL) AS accepted,COALESCE(a.age_confirmed,FALSE) AS age_confirmed,COALESCE(a.agreement_confirmed,FALSE) AS agreement_confirmed,a.signer_name,a.accepted_at FROM creator_agreement_versions v LEFT JOIN creator_agreement_acceptances a ON a.agreement_version_id=v.id AND a.user_id=$1 WHERE v.is_current=TRUE LIMIT 1", [user.id]);
      const status = account.rows[0]?.status ?? (user.role === "streamer" ? "ACTIVE" : "AUDIENCE");
      return {
        status,
        reasonCode: account.rows[0]?.reason_code ?? null,
        draft: draft.rows[0] ?? null,
        identity: identity.rows[0] ?? { status: "NOT_UPLOADED" },
        agreement: agreement.rows[0] ?? null,
        configuration: {
          onboardingEnabled: config.creatorOnboardingEnabled,
          identityProvider: "direct_private_upload",
          acceptedDocumentTypes: ["passport","national_id","driver_license"],
          acceptedFileTypes: ["application/pdf","image/jpeg","image/png"],
          maximumFileSizeBytes: identityDocumentLimitBytes,
          automaticApproval: config.creatorAutoApproval,
        },
      };
    } finally {
      await client.end();
    }
  });
  api.post("/api/creator/onboarding/start", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "session_required" });
    if (!config.creatorOnboardingEnabled) return reply.code(503).send({ error: "creator_onboarding_unavailable" });
    if (user.role === "admin") return reply.code(403).send({ error: "creator_role_not_eligible" });
    const client = database();
    await client.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<{ status: CreatorStatus }>("SELECT status FROM creator_accounts WHERE user_id=$1 FOR UPDATE", [user.id]);
      if (existing.rows[0]?.status === "SUSPENDED") {
        await client.query("ROLLBACK");
        return reply.code(403).send({ error: "creator_suspended" });
      }
      if (!existing.rows[0]) {
        await client.query("INSERT INTO creator_accounts (user_id,status) VALUES ($1,'ONBOARDING_PROFILE')", [user.id]);
        await client.query("INSERT INTO creator_status_history (id,user_id,from_status,to_status,reason_code,actor_id) VALUES ($1,$2,'AUDIENCE','ONBOARDING_PROFILE','onboarding_started',$2)", [crypto.randomUUID(), user.id]);
        await client.query("INSERT INTO audit_events (id,actor_id,subject_user_id,event_type) VALUES ($1,$2,$2,'creator_onboarding_started')", [crypto.randomUUID(), user.id]);
      }
      await client.query("INSERT INTO creator_onboarding (user_id,creator_handle,display_name,primary_language,timezone) VALUES ($1,$2,$3,$4,'America/Chicago') ON CONFLICT (user_id) DO NOTHING", [user.id, user.handle, user.displayName, user.locale]);
      await client.query("COMMIT");
      return reply.code(existing.rows[0] ? 200 : 201).send({ status: existing.rows[0]?.status ?? "ONBOARDING_PROFILE" });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await client.end();
    }
  });
  api.patch<{
    Body: { creatorHandle: string; displayName: string; bio: string; primaryLanguage: string; timezone: string };
  }>("/api/creator/onboarding/profile", { schema: { body: mutationSchemas.creatorOnboardingProfile } }, async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "session_required" });
    const body = request.body;
    try { new Intl.DateTimeFormat("en", { timeZone: body.timezone }).format(); }
    catch { return reply.code(400).send({ error: "invalid_timezone" }); }
    const client = database();
    await client.connect();
    try {
      await client.query("BEGIN");
      const account = await client.query<{ status: CreatorStatus }>("SELECT status FROM creator_accounts WHERE user_id=$1 FOR UPDATE", [user.id]);
      if (!account.rows[0]) { await client.query("ROLLBACK"); return reply.code(409).send({ error: "creator_onboarding_not_started" }); }
      if (!["ONBOARDING_PROFILE","ONBOARDING_AGREEMENT"].includes(account.rows[0].status)) { await client.query("ROLLBACK"); return reply.code(409).send({ error: "creator_profile_locked" }); }
      const language=await client.query("SELECT 1 FROM supported_languages WHERE language_code=$1 AND enabled=TRUE",[body.primaryLanguage]);
      if(!language.rows[0]){await client.query("ROLLBACK");return reply.code(400).send({error:"unsupported_room_language"});}
      const conflict = await client.query("SELECT 1 FROM users WHERE LOWER(handle)=LOWER($1) AND id<>$2 UNION ALL SELECT 1 FROM creator_onboarding WHERE LOWER(creator_handle)=LOWER($1) AND user_id<>$2 LIMIT 1", [body.creatorHandle, user.id]);
      if (conflict.rows[0]) { await client.query("ROLLBACK"); return reply.code(409).send({ error: "creator_handle_unavailable" }); }
      await client.query("UPDATE creator_onboarding SET creator_handle=$1,display_name=$2,bio=$3,category=NULL,primary_language=$4,timezone=$5,content_tags='{}',profile_completed_at=NOW(),updated_at=NOW() WHERE user_id=$6", [body.creatorHandle,body.displayName.trim(),body.bio.trim(),body.primaryLanguage,body.timezone,user.id]);
      if (account.rows[0].status === "ONBOARDING_PROFILE") {
        await client.query("UPDATE creator_accounts SET status='ONBOARDING_AGREEMENT',updated_at=NOW() WHERE user_id=$1", [user.id]);
        await client.query("INSERT INTO creator_status_history (id,user_id,from_status,to_status,reason_code,actor_id) VALUES ($1,$2,'ONBOARDING_PROFILE','ONBOARDING_AGREEMENT','profile_completed',$2)", [crypto.randomUUID(), user.id]);
      }
      await client.query("INSERT INTO audit_events (id,actor_id,subject_user_id,event_type) VALUES ($1,$2,$2,'creator_profile_draft_completed')", [crypto.randomUUID(), user.id]);
      await client.query("COMMIT");
      return { status: "ONBOARDING_AGREEMENT" };
    } catch (error) { await client.query("ROLLBACK"); if ((error as {code?:string}).code === "23505") return reply.code(409).send({error:"creator_handle_unavailable"}); throw error; }
    finally { await client.end(); }
  });
  api.post<{Querystring:{documentType:IdentityDocumentType}}>("/api/creator/onboarding/identity-document", { bodyLimit: identityDocumentLimitBytes + 64 * 1024 }, async (request, reply) => {
    const user=await currentUser(request); if(!user)return reply.code(401).send({error:"session_required"});
    if(!["passport","national_id","driver_license"].includes(request.query.documentType)) return reply.code(400).send({error:"unsupported_document_type"});
    const eligibility=database();await eligibility.connect();try{const allowed=await eligibility.query("SELECT 1 FROM creator_accounts c WHERE c.user_id=$1 AND c.status IN ('ONBOARDING_IDENTITY','READY_FOR_REVIEW','ACTIVE') AND EXISTS(SELECT 1 FROM creator_agreement_acceptances a JOIN creator_agreement_versions v ON v.id=a.agreement_version_id WHERE a.user_id=c.user_id AND v.is_current=TRUE AND a.age_confirmed=TRUE AND a.agreement_confirmed=TRUE)",[user.id]);if(!allowed.rows[0])return reply.code(409).send({error:"agreement_required_before_document"});}finally{await eligibility.end();}
    let file;
    try { file=await request.file({limits:{files:1,fields:0,fileSize:identityDocumentLimitBytes}}); }
    catch { return reply.code(413).send({error:"identity_document_too_large"}); }
    if(!file)return reply.code(400).send({error:"identity_document_required"});
    let buffer:Buffer;
    try { buffer=await file.toBuffer(); }
    catch { return reply.code(413).send({error:"identity_document_too_large"}); }
    if(file.file.truncated)return reply.code(413).send({error:"identity_document_too_large"});
    let stored;
    try { stored=await saveIdentityDocument({storagePath:config.identityDocumentStoragePath,encryptionKey:config.identityDocumentEncryptionKey,userId:user.id,buffer}); }
    catch(error){ if(error instanceof IdentityDocumentUploadError)return reply.code(error.code==="identity_document_too_large"?413:error.code==="identity_document_storage_unavailable"?503:400).send({error:error.code}); throw error; }
    const client=database();
    let committed=false;
    let transactionStarted=false;
    try{await client.connect();await client.query("BEGIN");transactionStarted=true;
      const account=await client.query<{status:CreatorStatus}>("SELECT status FROM creator_accounts WHERE user_id=$1 FOR UPDATE",[user.id]);
      if(!account.rows[0]||!["ONBOARDING_IDENTITY","READY_FOR_REVIEW","ACTIVE"].includes(account.rows[0].status)){await client.query("ROLLBACK");return reply.code(409).send({error:"identity_document_step_unavailable"});}
      const agreement=await client.query("SELECT 1 FROM creator_agreement_acceptances a JOIN creator_agreement_versions v ON v.id=a.agreement_version_id WHERE a.user_id=$1 AND v.is_current=TRUE AND a.age_confirmed=TRUE AND a.agreement_confirmed=TRUE",[user.id]);
      if(!agreement.rows[0]){await client.query("ROLLBACK");return reply.code(409).send({error:"agreement_required_before_document"});}
      const id=crypto.randomUUID();
      const previous=await client.query<{id:string}>("SELECT id FROM creator_identity_documents WHERE user_id=$1 AND status<>'SUPERSEDED' ORDER BY uploaded_at DESC LIMIT 1 FOR UPDATE",[user.id]);
      await client.query("INSERT INTO creator_identity_documents(id,user_id,storage_reference,document_type,mime_type,file_size,checksum) VALUES($1,$2,$3,$4,$5,$6,$7)",[id,user.id,stored.storageReference,request.query.documentType,stored.mimeType,stored.fileSize,stored.checksum]);
      if(previous.rows[0])await client.query("UPDATE creator_identity_documents SET status='SUPERSEDED',replaced_at=NOW(),superseded_by=$1 WHERE id=$2",[id,previous.rows[0].id]);
      if(account.rows[0].status==="ONBOARDING_IDENTITY"){
        await client.query("UPDATE creator_accounts SET status='READY_FOR_REVIEW',administrative_review_status='NOT_REVIEWED',updated_at=NOW() WHERE user_id=$1",[user.id]);
        await client.query("INSERT INTO creator_status_history(id,user_id,from_status,to_status,reason_code,actor_id) VALUES($1,$2,'ONBOARDING_IDENTITY','READY_FOR_REVIEW','identity_document_uploaded',$2)",[crypto.randomUUID(),user.id]);
      }
      await client.query("INSERT INTO audit_events(id,actor_id,subject_user_id,event_type,metadata) VALUES($1,$2,$2,'identity_document_uploaded',jsonb_build_object('documentId',$3::text,'mimeType',$4::text,'replacement',$5::boolean))",[crypto.randomUUID(),user.id,id,stored.mimeType,Boolean(previous.rows[0])]);
      await client.query("INSERT INTO notifications(id,user_id,kind,title,body,notification_key) VALUES($1,$2,'creator_document','Document received','Your private identity document was received. Upload does not mean it has been verified.',$3) ON CONFLICT DO NOTHING",[crypto.randomUUID(),user.id,`creator-document-received:${id}`]);
      await client.query("COMMIT");committed=true;return reply.code(201).send({document:{id,status:"UPLOADED",documentType:request.query.documentType,mimeType:stored.mimeType,fileSize:stored.fileSize},creatorStatus:account.rows[0].status==="ONBOARDING_IDENTITY"?"READY_FOR_REVIEW":account.rows[0].status});
    }catch(error){if(transactionStarted)await client.query("ROLLBACK").catch(()=>undefined);throw error;}finally{await client.end().catch(()=>undefined);if(!committed)await removeIdentityDocument(config.identityDocumentStoragePath,stored.storageReference).catch(()=>undefined);}
  });
  api.post<{Body:{agreementVersion:string;signerName:string;ageConfirmed:true;agreementConfirmed:true}}>("/api/creator/onboarding/agreement/accept", {schema:{body:mutationSchemas.creatorAgreementAcceptance}}, async(request,reply)=>{
    const user=await currentUser(request); if(!user)return reply.code(401).send({error:"session_required"});
    const client=database();await client.connect();
    try{await client.query("BEGIN");
      const account=await client.query<{status:CreatorStatus}>("SELECT status FROM creator_accounts WHERE user_id=$1 FOR UPDATE",[user.id]);
      if(account.rows[0]?.status!=="ONBOARDING_AGREEMENT"){await client.query("ROLLBACK");return reply.code(409).send({error:"agreement_step_unavailable"});}
      const version=await client.query<{id:string}>("SELECT id FROM creator_agreement_versions WHERE version=$1 AND is_current=TRUE",[request.body.agreementVersion]);
      if(!version.rows[0]){await client.query("ROLLBACK");return reply.code(409).send({error:"agreement_version_outdated"});}
      const auditId=crypto.randomUUID();
      await client.query("INSERT INTO audit_events (id,actor_id,subject_user_id,event_type,metadata) VALUES ($1,$2,$2,'creator_agreement_accepted',jsonb_build_object('version',$3::text,'ageConfirmed',TRUE))",[auditId,user.id,request.body.agreementVersion]);
      await client.query("INSERT INTO creator_agreement_acceptances (id,user_id,agreement_version_id,signer_name,age_confirmed,agreement_confirmed,audit_event_id) VALUES ($1,$2,$3,$4,TRUE,TRUE,$5)",[crypto.randomUUID(),user.id,version.rows[0].id,request.body.signerName.trim(),auditId]);
      await client.query("UPDATE creator_accounts SET status='ONBOARDING_IDENTITY',updated_at=NOW() WHERE user_id=$1",[user.id]);
      await client.query("INSERT INTO creator_status_history (id,user_id,from_status,to_status,reason_code,actor_id) VALUES ($1,$2,'ONBOARDING_AGREEMENT','ONBOARDING_IDENTITY','agreement_accepted',$2)",[crypto.randomUUID(),user.id]);
      await client.query("COMMIT");return {status:"ONBOARDING_IDENTITY"};
    }catch(error){await client.query("ROLLBACK");throw error;}finally{await client.end();}
  });
  api.post("/api/creator/onboarding/activate",async(request,reply)=>{
    const sessionUser=await currentUser(request);if(!sessionUser)return reply.code(401).send({error:"session_required"});
    const client=database();await client.connect();
    try{await client.query("BEGIN");
      const locked=await client.query("SELECT u.id,u.handle,u.display_name,u.role,u.locale,u.test_age_acknowledged_at,u.is_banned,c.status FROM users u JOIN creator_accounts c ON c.user_id=u.id WHERE u.id=$1 FOR UPDATE",[sessionUser.id]);
      const user=locked.rows[0];if(!user){await client.query("ROLLBACK");return reply.code(409).send({error:"creator_onboarding_not_started"});}
      if(user.status==="ACTIVE"){await client.query("COMMIT");return {status:"ACTIVE",user:sessionUser};}
      if(user.is_banned||user.status==="SUSPENDED"){await client.query("ROLLBACK");return reply.code(403).send({error:"creator_suspended"});}
      if(user.status!=="READY_FOR_REVIEW"){await client.query("ROLLBACK");return reply.code(409).send({error:"creator_onboarding_incomplete"});}
      const profile=await client.query("SELECT * FROM creator_onboarding WHERE user_id=$1 AND profile_completed_at IS NOT NULL",[sessionUser.id]);
      const identity=await client.query("SELECT 1 FROM creator_identity_documents WHERE user_id=$1 AND status IN ('UPLOADED','REVIEWED') ORDER BY uploaded_at DESC LIMIT 1",[sessionUser.id]);
      const agreement=await client.query("SELECT 1 FROM creator_agreement_acceptances a JOIN creator_agreement_versions v ON v.id=a.agreement_version_id WHERE a.user_id=$1 AND v.is_current=TRUE AND a.age_confirmed=TRUE AND a.agreement_confirmed=TRUE",[sessionUser.id]);
      if(!profile.rows[0]||!identity.rows[0]||!agreement.rows[0]){await client.query("ROLLBACK");return reply.code(409).send({error:"creator_requirements_incomplete"});}
      await client.query("UPDATE creator_accounts SET status='PENDING_REVIEW',updated_at=NOW() WHERE user_id=$1",[sessionUser.id]);
      await client.query("INSERT INTO creator_status_history (id,user_id,from_status,to_status,reason_code,actor_id) VALUES ($1,$2,'READY_FOR_REVIEW','PENDING_REVIEW','activation_submitted',$2)",[crypto.randomUUID(),sessionUser.id]);
      await client.query("INSERT INTO audit_events (id,actor_id,subject_user_id,event_type) VALUES ($1,$2,$2,'creator_activation_submitted')",[crypto.randomUUID(),sessionUser.id]);
      if(!config.creatorAutoApproval){await client.query("COMMIT");return {status:"PENDING_REVIEW"};}
      await client.query("UPDATE creator_accounts SET status='APPROVED',updated_at=NOW() WHERE user_id=$1",[sessionUser.id]);
      await client.query("INSERT INTO creator_status_history (id,user_id,from_status,to_status,reason_code,actor_id) VALUES ($1,$2,'PENDING_REVIEW','APPROVED','automatic_approval',$2)",[crypto.randomUUID(),sessionUser.id]);
      const draft=profile.rows[0];
      await client.query("UPDATE users SET handle=$1,display_name=$2,updated_at=NOW() WHERE id=$3",[draft.creator_handle,draft.display_name,sessionUser.id]);
      await client.query("INSERT INTO streamer_profiles (user_id,bio,schedule_timezone,is_featured) VALUES ($1,$2,$3,FALSE) ON CONFLICT (user_id) DO UPDATE SET bio=EXCLUDED.bio,schedule_timezone=EXCLUDED.schedule_timezone",[sessionUser.id,draft.bio,draft.timezone]);
      await client.query("UPDATE creator_accounts SET status='ACTIVE',activation_method='AUTOMATIC',activated_at=NOW(),updated_at=NOW() WHERE user_id=$1",[sessionUser.id]);
      await client.query("INSERT INTO creator_status_history (id,user_id,from_status,to_status,reason_code,actor_id) VALUES ($1,$2,'APPROVED','ACTIVE','activation_completed',$2)",[crypto.randomUUID(),sessionUser.id]);
      await client.query("INSERT INTO audit_events (id,actor_id,subject_user_id,event_type) VALUES ($1,$2,$2,'creator_automatic_approval_completed')",[crypto.randomUUID(),sessionUser.id]);
      await client.query("INSERT INTO notifications(id,user_id,kind,title,body,notification_key) VALUES($1,$2,'creator_review','Creator account activated','Your creator account is active. You can now open Streamer Studio.',$3) ON CONFLICT DO NOTHING",[crypto.randomUUID(),sessionUser.id,`creator-activated:${sessionUser.id}`]);
      await client.query("COMMIT");
      return {status:"ACTIVE",user:{id:user.id,handle:draft.creator_handle,displayName:draft.display_name,role:user.role,locale:user.locale,ageAcknowledged:Boolean(user.test_age_acknowledged_at)}};
    }catch(error){await client.query("ROLLBACK");if((error as {code?:string}).code==="23505")return reply.code(409).send({error:"creator_handle_unavailable"});throw error;}finally{await client.end();}
  });
  api.get<{ Params: { filename: string } }>(
    "/api/media/avatars/:filename",
    async (request, reply) => {
      const filePath = avatarPath(config.avatarStoragePath, request.params.filename);
      if (!filePath)
        return reply.code(404).send({ error: "avatar_not_found" });
      try {
        await stat(filePath);
      } catch {
        return reply.code(404).send({ error: "avatar_not_found" });
      }
      reply.header("cache-control", "no-store");
      return reply.type("image/webp").send(createReadStream(filePath));
    },
  );
  api.get<{ Params: { filename: string } }>(
    "/api/media/stream-thumbnails/:filename",
    async (request, reply) => {
      const filePath = streamThumbnailPath(config.avatarStoragePath, request.params.filename);
      if (!filePath) return reply.code(404).send({ error: "thumbnail_not_found" });
      try {
        const file = await stat(filePath);
        reply.header("content-type", "image/webp");
        reply.header("content-length", file.size);
        reply.header("cache-control", "public, max-age=31536000, immutable");
        return reply.send(createReadStream(filePath));
      } catch {
        return reply.code(404).send({ error: "thumbnail_not_found" });
      }
    },
  );
  function setSessionCookies(
    reply: FastifyReply,
    session: Awaited<ReturnType<typeof createSession>>,
  ) {
    const secure = config.nodeEnv === "production";
    reply.setCookie("stream_session", session.token, {
      httpOnly: true,
      secure,
      sameSite: "strict",
      expires: session.expiresAt,
      path: "/",
    });
    reply.setCookie("stream_csrf", session.csrfToken, {
      httpOnly: false,
      secure,
      sameSite: "strict",
      expires: session.expiresAt,
      path: "/",
    });
  }
  api.get<{ Params: { slug: string } }>("/api/streamer/rooms/:slug/moderation", async (request, reply) => {
    const streamer = (await requireRole(request, reply, "streamer")) as DemoUser | undefined;
    if (!streamer) return;
    const client = database();
    await client.connect();
    try {
      const room = await client.query<{ id: string }>("SELECT id FROM live_rooms WHERE slug=$1 AND streamer_id=$2", [request.params.slug, streamer.id]);
      if (!room.rows[0]) return reply.code(404).send({ error: "streamer_room_not_found" });
      const restrictions = await client.query(
        "SELECT u.id AS user_id,u.display_name,r.is_muted,r.is_banned,r.muted_until,r.updated_at FROM room_moderation_restrictions r JOIN users u ON u.id=r.user_id WHERE r.room_id=$1 AND (r.is_banned OR (r.is_muted AND r.muted_until IS NULL) OR r.muted_until>NOW()) ORDER BY r.updated_at DESC LIMIT 100",
        [room.rows[0].id],
      );
      return { restrictions: restrictions.rows };
    } finally {
      await client.end();
    }
  });
  api.post<{
    Body: {
      handle: string;
      displayName: string;
      password: string;
      locale: "en" | "zh";
    };
  }>(
    "/api/auth/register",
    { schema: { body: mutationSchemas.register } },
    async (request, reply) => {
      try {
        const user = await registerAudienceAccount(request.body);
        const session = await createSession(
          user.id,
          clientLabelForUserAgent(request.headers["user-agent"]),
        );
        setSessionCookies(reply, session);
        return reply.code(201).send({ user });
      } catch (error) {
        if (error instanceof RegistrationError) {
          const status = error.code === "handle_unavailable" ? 409 : 400;
          return reply.code(status).send({ error: error.code });
        }
        throw error;
      }
    },
  );
  api.post<{ Body: { handle?: string; password?: string } }>(
    "/api/auth/login",
    { schema: { body: mutationSchemas.login } },
    async (request, reply) => {
      const handle = request.body?.handle?.trim();
      const password = request.body?.password;
      if (!handle || !password)
        return reply.code(400).send({ error: "credentials_required" });
      const user = await authenticateCredentials(handle, password);
      if (!user) return reply.code(401).send({ error: "invalid_credentials" });
      rateBuckets.delete(
        `${request.ip}:POST:/api/auth/login:${handle.toLowerCase()}`,
      );
      const session = await createSession(
        user.id,
        clientLabelForUserAgent(request.headers["user-agent"]),
      );
      setSessionCookies(reply, session);
      return { user };
    },
  );
  api.delete("/api/auth/session", async (request, reply) => {
    await revokeSession(request.cookies.stream_session);
    reply.clearCookie("stream_session", { path: "/" });
    reply.clearCookie("stream_csrf", { path: "/" });
    return reply.code(204).send();
  });
  api.get("/api/account/profile", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "session_required" });
    const client=database();await client.connect();try{
      const profile=await client.query("SELECT bio,avatar_url,is_public FROM user_public_profiles WHERE user_id=$1",[user.id]);
      return { user, publicProfile: profile.rows[0] ? { bio:profile.rows[0].bio,avatarUrl:profile.rows[0].avatar_url,enabled:profile.rows[0].is_public } : {bio:"",avatarUrl:null,enabled:true} };
    }finally{await client.end();}
  });
  api.patch<{
    Body: { displayName?: string; locale?: "en" | "zh"; bio?: string; publicProfileEnabled?: boolean };
  }>(
    "/api/account/profile",
    { schema: { body: mutationSchemas.accountProfile } },
    async (request, reply) => {
      const user = await currentUser(request);
      if (!user) return reply.code(401).send({ error: "session_required" });
      const displayName = request.body.displayName?.trim();
      const bio = request.body.bio?.trim();
      if (request.body.displayName !== undefined && !displayName)
        return reply.code(400).send({ error: "invalid_display_name" });
      const client = database();
      await client.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query(
          `UPDATE users
           SET display_name=COALESCE($1,display_name),
               locale=COALESCE($2,locale),updated_at=NOW()
           WHERE id=$3
           RETURNING id,handle,display_name,role,locale,test_age_acknowledged_at`,
          [displayName ?? null, request.body.locale ?? null, user.id],
        );
        await client.query(
          `INSERT INTO user_public_profiles(user_id,bio,is_public) VALUES($1,COALESCE($2,''),COALESCE($3,TRUE))
           ON CONFLICT(user_id) DO UPDATE SET bio=CASE WHEN $4 THEN EXCLUDED.bio ELSE user_public_profiles.bio END,is_public=CASE WHEN $5 THEN EXCLUDED.is_public ELSE user_public_profiles.is_public END,updated_at=NOW()`,
          [user.id,bio??null,request.body.publicProfileEnabled??null,request.body.bio!==undefined,request.body.publicProfileEnabled!==undefined],
        );
        await client.query(
          "INSERT INTO account_security_events (id,user_id,event_type) VALUES ($1,$2,'profile_updated')",
          [crypto.randomUUID(), user.id],
        );
        await client.query(
          "INSERT INTO audit_events (id,actor_id,subject_user_id,event_type) VALUES ($1,$2,$2,'account_profile_updated')",
          [crypto.randomUUID(), user.id],
        );
        await client.query("COMMIT");
        const updated = result.rows[0];
        const publicProfile=await client.query("SELECT bio,avatar_url,is_public FROM user_public_profiles WHERE user_id=$1",[user.id]);
        return {
          user: {
            id: updated.id,
            handle: updated.handle,
            displayName: updated.display_name,
            role: updated.role,
            locale: updated.locale,
            ageAcknowledged: Boolean(updated.test_age_acknowledged_at),
          },
          publicProfile:{bio:publicProfile.rows[0].bio,avatarUrl:publicProfile.rows[0].avatar_url,enabled:publicProfile.rows[0].is_public},
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        await client.end();
      }
    },
  );
  api.post("/api/account/avatar",{bodyLimit:avatarUploadLimitBytes+64*1024},async(request,reply)=>{
    const user=await currentUser(request);if(!user)return reply.code(401).send({error:"session_required"});
    let upload;try{upload=await request.file({limits:{files:1,fields:0,fileSize:avatarUploadLimitBytes}});}catch{return reply.code(413).send({error:"avatar_too_large"});}
    if(!upload)return reply.code(400).send({error:"avatar_file_required"});
    let saved:Awaited<ReturnType<typeof saveAvatar>>;try{const buffer=await upload.toBuffer();if(upload.file.truncated)return reply.code(413).send({error:"avatar_too_large"});saved=await saveAvatar({storagePath:config.avatarStoragePath,userId:user.id,mimeType:upload.mimetype,buffer});}catch(error){if(error instanceof AvatarUploadError)return reply.code(400).send({error:error.code});throw error;}
    const client=database();await client.connect();let previous:string|null=null;try{await client.query("BEGIN");const current=await client.query<{avatar_url:string|null}>("SELECT avatar_url FROM user_public_profiles WHERE user_id=$1 FOR UPDATE",[user.id]);previous=current.rows[0]?.avatar_url??null;await client.query("INSERT INTO user_public_profiles(user_id,avatar_url) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET avatar_url=$2,updated_at=NOW()",[user.id,saved.url]);await client.query("UPDATE streamer_profiles SET avatar_url=$1 WHERE user_id=$2",[saved.url,user.id]);await client.query("COMMIT");}catch(error){await client.query("ROLLBACK");await removeStoredAvatar(config.avatarStoragePath,saved.url);throw error;}finally{await client.end();}await removeStoredAvatar(config.avatarStoragePath,previous);return {avatarUrl:saved.url};
  });
  api.delete("/api/account/avatar",async(request,reply)=>{
    const user=await currentUser(request);if(!user)return reply.code(401).send({error:"session_required"});
    const client=database();await client.connect();let previous:string|null=null;try{await client.query("BEGIN");const current=await client.query<{avatar_url:string|null}>("SELECT avatar_url FROM user_public_profiles WHERE user_id=$1 FOR UPDATE",[user.id]);previous=current.rows[0]?.avatar_url??null;await client.query("INSERT INTO user_public_profiles(user_id,avatar_url) VALUES($1,NULL) ON CONFLICT(user_id) DO UPDATE SET avatar_url=NULL,updated_at=NOW()",[user.id]);await client.query("UPDATE streamer_profiles SET avatar_url=NULL WHERE user_id=$1",[user.id]);await client.query("COMMIT");}catch(error){await client.query("ROLLBACK");throw error;}finally{await client.end();}await removeStoredAvatar(config.avatarStoragePath,previous);return reply.code(204).send();
  });
  api.get<{Params:{handle:string}}>("/api/users/:handle/public",async(request,reply)=>{
    const viewer=await currentUser(request);const handle=request.params.handle.trim().toLowerCase();if(!/^[a-z0-9_-]{3,30}$/.test(handle))return reply.code(404).send({error:"profile_not_found"});
    const client=database();await client.connect();try{
      const result=await client.query(`SELECT u.id,u.handle,u.display_name,u.created_at,COALESCE(NULLIF(sp.bio,''),pp.bio,'') AS bio,COALESCE(sp.avatar_url,pp.avatar_url) AS avatar_url,COALESCE(pp.is_public,TRUE) AS is_public,ca.status AS creator_status,r.slug AS room_slug,r.title AS room_title,r.broadcast_state,r.broadcast_status_source FROM users u LEFT JOIN user_public_profiles pp ON pp.user_id=u.id LEFT JOIN creator_accounts ca ON ca.user_id=u.id LEFT JOIN streamer_profiles sp ON sp.user_id=u.id LEFT JOIN live_rooms r ON r.streamer_id=u.id AND r.publication_status='published' WHERE u.handle=$1 AND u.is_banned=FALSE`,[handle]);
      const row=result.rows[0];if(!row||(!row.is_public&&row.creator_status!=="ACTIVE"&&viewer?.id!==row.id))return reply.code(404).send({error:"profile_not_found"});
      const blocked=viewer&&viewer.id!==row.id?await client.query("SELECT EXISTS(SELECT 1 FROM user_blocks WHERE blocker_id=$1 AND blocked_id=$2) AS blocked",[viewer.id,row.id]):null;
      return {profile:{id:row.id,handle:row.handle,displayName:row.display_name,avatarUrl:row.avatar_url,bio:row.bio,joinedAt:row.created_at,creatorActive:row.creator_status==="ACTIVE",creatorRoomSlug:row.room_slug,creatorRoomTitle:row.room_title,creatorLive:row.broadcast_state==="live"&&row.broadcast_status_source!=="local",isSelf:viewer?.id===row.id,blocked:Boolean(blocked?.rows[0]?.blocked)}};
    }finally{await client.end();}
  });
  api.put<{Params:{handle:string}}>("/api/users/:handle/block",async(request,reply)=>{
    const viewer=await currentUser(request);if(!viewer)return reply.code(401).send({error:"session_required"});const client=database();await client.connect();try{const target=await client.query("SELECT id FROM users WHERE handle=$1 AND is_banned=FALSE",[request.params.handle.toLowerCase()]);if(!target.rows[0])return reply.code(404).send({error:"profile_not_found"});if(target.rows[0].id===viewer.id)return reply.code(400).send({error:"cannot_block_self"});await client.query("INSERT INTO user_blocks(blocker_id,blocked_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[viewer.id,target.rows[0].id]);return {blocked:true};}finally{await client.end();}
  });
  api.delete<{Params:{handle:string}}>("/api/users/:handle/block",async(request,reply)=>{
    const viewer=await currentUser(request);if(!viewer)return reply.code(401).send({error:"session_required"});const client=database();await client.connect();try{await client.query("DELETE FROM user_blocks b USING users u WHERE b.blocker_id=$1 AND b.blocked_id=u.id AND u.handle=$2",[viewer.id,request.params.handle.toLowerCase()]);return {blocked:false};}finally{await client.end();}
  });
  api.post<{Params:{handle:string};Body:{reason?:string;details?:string}}>("/api/users/:handle/reports",{schema:{body:mutationSchemas.publicProfileReport}},async(request,reply)=>{
    const viewer=await currentUser(request);if(!viewer)return reply.code(401).send({error:"session_required"});const client=database();await client.connect();try{const target=await client.query("SELECT id FROM users WHERE handle=$1 AND is_banned=FALSE",[request.params.handle.toLowerCase()]);if(!target.rows[0])return reply.code(404).send({error:"profile_not_found"});if(target.rows[0].id===viewer.id)return reply.code(400).send({error:"cannot_report_self"});await client.query("INSERT INTO user_profile_reports(id,reported_user_id,reporter_id,reason,details) VALUES($1,$2,$3,$4,$5)",[crypto.randomUUID(),target.rows[0].id,viewer.id,request.body.reason!.trim(),request.body.details?.trim()||null]);return reply.code(201).send({submitted:true});}finally{await client.end();}
  });
  api.get("/api/account/sessions", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "session_required" });
    return {
      sessions: await listUserSessions(
        user.id,
        request.cookies.stream_session,
      ),
    };
  });
  api.delete("/api/account/sessions", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "session_required" });
    return {
      revoked: await revokeOtherUserSessions(
        user.id,
        request.cookies.stream_session,
      ),
    };
  });
  api.delete<{ Params: { sessionId: string } }>(
    "/api/account/sessions/:sessionId",
    async (request, reply) => {
      const user = await currentUser(request);
      if (!user) return reply.code(401).send({ error: "session_required" });
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.params.sessionId))
        return reply.code(400).send({ error: "invalid_session_id" });
      const revoked = await revokeUserSession(
        user.id,
        request.params.sessionId,
        request.cookies.stream_session,
      );
      if (!revoked)
        return reply.code(404).send({ error: "session_not_found" });
      if (revoked.is_current) {
        reply.clearCookie("stream_session", { path: "/" });
        reply.clearCookie("stream_csrf", { path: "/" });
      }
      return reply.code(204).send();
    },
  );
  api.post<{
    Body: { currentPassword: string; newPassword: string };
  }>(
    "/api/account/password",
    { schema: { body: mutationSchemas.passwordChange } },
    async (request, reply) => {
      const user = await currentUser(request);
      if (!user) return reply.code(401).send({ error: "session_required" });
      try {
        await changeAccountPassword(
          user.id,
          request.body.currentPassword,
          request.body.newPassword,
        );
        const session = await createSession(
          user.id,
          clientLabelForUserAgent(request.headers["user-agent"]),
        );
        const auditClient = database();
        await auditClient.connect();
        try {
          await auditClient.query(
            "INSERT INTO audit_events (id,actor_id,subject_user_id,event_type) VALUES ($1,$2,$2,'account_password_changed')",
            [crypto.randomUUID(), user.id],
          );
        } finally {
          await auditClient.end();
        }
        setSessionCookies(reply, session);
        return { changed: true };
      } catch (error) {
        if (error instanceof AccountSecurityError)
          return reply.code(400).send({ error: error.code });
        throw error;
      }
    },
  );
  api.get("/api/creator-applications/me", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "session_required" });
    const client = database();
    await client.connect();
    try {
      const result = await client.query(
        `SELECT id,category,bio,schedule_text,motivation,status,review_reason,
                reviewed_at,created_at,updated_at
         FROM creator_applications
         WHERE applicant_id=$1
         ORDER BY created_at DESC
         LIMIT 1`,
        [user.id],
      );
      return { application: result.rows[0] ?? null };
    } finally {
      await client.end();
    }
  });
  api.post<{
    Body: {
      category: string;
      bio: string;
      scheduleText: string;
      motivation: string;
    };
  }>(
    "/api/creator-applications",
    { schema: { body: mutationSchemas.creatorApplication } },
    async (request, reply) => {
      const applicant = (await requireRole(request, reply, "audience")) as
        | DemoUser
        | undefined;
      if (!applicant) return;
      const client = database();
      await client.connect();
      try {
        await client.query("BEGIN");
        const id = crypto.randomUUID();
        const result = await client.query(
          `INSERT INTO creator_applications
           (id,applicant_id,category,bio,schedule_text,motivation)
           VALUES ($1,$2,$3,$4,$5,$6)
           RETURNING id,category,bio,schedule_text,motivation,status,created_at`,
          [
            id,
            applicant.id,
            request.body.category.trim(),
            request.body.bio.trim(),
            request.body.scheduleText.trim(),
            request.body.motivation.trim(),
          ],
        );
        await client.query(
          "INSERT INTO creator_application_events (id,application_id,actor_id,event_type) VALUES ($1,$2,$3,'submitted')",
          [crypto.randomUUID(), id, applicant.id],
        );
        await client.query("COMMIT");
        return reply.code(201).send({ application: result.rows[0] });
      } catch (error) {
        await client.query("ROLLBACK");
        if ((error as { code?: string }).code === "23505")
          return reply
            .code(409)
            .send({ error: "active_creator_application_exists" });
        throw error;
      } finally {
        await client.end();
      }
    },
  );
  api.delete<{ Params: { applicationId: string } }>(
    "/api/creator-applications/:applicationId",
    async (request, reply) => {
      const user = await currentUser(request);
      if (!user) return reply.code(401).send({ error: "session_required" });
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.params.applicationId))
        return reply.code(400).send({ error: "invalid_application_id" });
      const client = database();
      await client.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query(
          `UPDATE creator_applications
           SET status='withdrawn',updated_at=NOW()
           WHERE id=$1 AND applicant_id=$2 AND status='pending'
           RETURNING id`,
          [request.params.applicationId, user.id],
        );
        if (!result.rows[0]) {
          await client.query("ROLLBACK");
          return reply
            .code(409)
            .send({ error: "application_not_withdrawable" });
        }
        await client.query(
          "INSERT INTO creator_application_events (id,application_id,actor_id,event_type) VALUES ($1,$2,$3,'withdrawn')",
          [crypto.randomUUID(), request.params.applicationId, user.id],
        );
        await client.query("COMMIT");
        return reply.code(204).send();
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        await client.end();
      }
    },
  );
  api.post("/api/demo/age-acknowledgement", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "session_required" });
    const client = database();
    await client.connect();
    try {
      await client.query(
        "UPDATE users SET test_age_acknowledged_at = NOW(), updated_at = NOW() WHERE id = $1",
        [user.id],
      );
    } finally {
      await client.end();
    }
    return {
      user: { ...user, ageAcknowledged: true },
    };
  });
  api.get("/api/audience/home", async (request, reply) => {
    const user = await requireRole(request, reply, "audience");
    return user ? { user } : undefined;
  });
  const defaultDiscoveryPreferences = {
    preferred_languages: [] as string[],
    preferred_tag_slugs: [] as string[],
    prioritize_live: true,
    prioritize_following: true,
    personalization_enabled: true,
  };
  api.get("/api/me/discovery-preferences", async (request, reply) => {
    const viewer = await requireRole(request, reply, "audience") as DemoUser | undefined;
    if (!viewer) return;
    const client = database();
    await client.connect();
    try {
      const result = await client.query(
        "SELECT preferred_languages,preferred_tag_slugs,prioritize_live,prioritize_following,personalization_enabled,updated_at FROM audience_discovery_preferences WHERE user_id=$1",
        [viewer.id],
      );
      return { preferences: result.rows[0] ?? { ...defaultDiscoveryPreferences, updated_at: null } };
    } finally {
      await client.end();
    }
  });
  api.put<{
    Body: {
      preferredLanguages?: unknown;
      preferredTags?: unknown;
      prioritizeLive?: unknown;
      prioritizeFollowing?: unknown;
      personalizationEnabled?: unknown;
    };
  }>("/api/me/discovery-preferences", async (request, reply) => {
    const viewer = await requireRole(request, reply, "audience") as DemoUser | undefined;
    if (!viewer) return;
    const body = request.body ?? {};
    const preferredLanguages = body.preferredLanguages;
    const preferredTags = body.preferredTags;
    if (
      !Array.isArray(preferredLanguages) ||
      preferredLanguages.length > 3 ||
      preferredLanguages.some((item) => typeof item!=="string"||!/^[a-z]{2}$/.test(item)) ||
      new Set(preferredLanguages).size !== preferredLanguages.length
    ) return reply.code(400).send({ error: "invalid_preferred_languages" });
    if (
      !Array.isArray(preferredTags) ||
      preferredTags.length > 20 ||
      preferredTags.some((item) => typeof item !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item)) ||
      new Set(preferredTags).size !== preferredTags.length
    ) return reply.code(400).send({ error: "invalid_preferred_tags" });
    if (
      typeof body.prioritizeLive !== "boolean" ||
      typeof body.prioritizeFollowing !== "boolean" ||
      typeof body.personalizationEnabled !== "boolean"
    ) return reply.code(400).send({ error: "invalid_discovery_preferences" });
    const normalizedTags = preferredTags.map((item) => String(item));
    const client = database();
    await client.connect();
    try {
      const validLanguages=await client.query("SELECT language_code FROM supported_languages WHERE enabled=TRUE AND language_code=ANY($1::text[])",[preferredLanguages]);
      if(validLanguages.rows.length!==preferredLanguages.length)return reply.code(400).send({error:"unsupported_preferred_language"});
      if (normalizedTags.length) {
        const valid = await client.query<{ normalized_slug: string }>(
          "SELECT normalized_slug FROM tags WHERE normalized_slug=ANY($1::text[]) AND status='ACTIVE' AND tag_type IN ('CONTENT','FORMAT','MOOD')",
          [normalizedTags],
        );
        if (valid.rows.length !== normalizedTags.length)
          return reply.code(400).send({ error: "unknown_preferred_tag" });
      }
      const result = await client.query(
        `INSERT INTO audience_discovery_preferences
           (user_id,preferred_languages,preferred_tag_slugs,prioritize_live,prioritize_following,personalization_enabled,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           preferred_languages=EXCLUDED.preferred_languages,
           preferred_tag_slugs=EXCLUDED.preferred_tag_slugs,
           prioritize_live=EXCLUDED.prioritize_live,
           prioritize_following=EXCLUDED.prioritize_following,
           personalization_enabled=EXCLUDED.personalization_enabled,
           updated_at=NOW()
         RETURNING preferred_languages,preferred_tag_slugs,prioritize_live,prioritize_following,personalization_enabled,updated_at`,
        [viewer.id, preferredLanguages, normalizedTags, body.prioritizeLive, body.prioritizeFollowing, body.personalizationEnabled],
      );
      return { preferences: result.rows[0] };
    } finally {
      await client.end();
    }
  });
  api.delete("/api/me/discovery-preferences", async (request, reply) => {
    const viewer = await requireRole(request, reply, "audience") as DemoUser | undefined;
    if (!viewer) return;
    const client = database();
    await client.connect();
    try {
      await client.query("DELETE FROM audience_discovery_preferences WHERE user_id=$1", [viewer.id]);
      return { preferences: { ...defaultDiscoveryPreferences, updated_at: null } };
    } finally {
      await client.end();
    }
  });
  api.get<{ Querystring: { q?: string; languages?: string; tag?: string; tags?: string; following?: string; live?: string } }>(
    "/api/rooms",
    async (request, reply) => {
      const viewer = await currentUser(request);
      const client = database();
      await client.connect();
      try {
        const query = request.query.q?.trim() ?? "";
        const languages = (request.query.languages??"").split(",").map(code=>code.trim()).filter(Boolean);
        const tagSlugs = (request.query.tags ?? request.query.tag ?? "").split(",").map(value=>value.trim()).filter(Boolean);
        const followingOnly = request.query.following === "true";
        const liveOnly = request.query.live === "true";
        if (languages.length>20||new Set(languages).size!==languages.length||languages.some(code=>!/^[a-z]{2}$/.test(code)))
          return reply.code(400).send({ error: "invalid_stream_languages" });
        const enabledLanguages=await client.query("SELECT language_code FROM supported_languages WHERE enabled=TRUE AND language_code=ANY($1::text[])",[languages]);
        if(enabledLanguages.rows.length!==languages.length)return reply.code(400).send({error:"unsupported_stream_language"});
        if(tagSlugs.length>20||new Set(tagSlugs).size!==tagSlugs.length||tagSlugs.some(tag=>!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag)))return reply.code(400).send({error:"invalid_tag_filter"});
        if(followingOnly&&!viewer)return reply.code(401).send({error:"demo_session_required"});
        const preferencesResult = viewer && viewer.role !== "admin"
          ? await client.query<{
              preferred_languages: string[];
              preferred_tag_slugs: string[];
              prioritize_live: boolean;
              prioritize_following: boolean;
              personalization_enabled: boolean;
            }>("SELECT preferred_languages,preferred_tag_slugs,prioritize_live,prioritize_following,personalization_enabled FROM audience_discovery_preferences WHERE user_id=$1", [viewer.id])
          : { rows: [] };
        const preferences = preferencesResult.rows[0] ?? defaultDiscoveryPreferences;
        const personalizationApplied = Boolean(viewer && viewer.role !== "admin" && preferences.personalization_enabled);
        const result = await client.query<{
          slug: string;
          title: string;
          status: string;
          broadcast_state: string;
          follower_count: number;
          live_started_at: Date | null;
          is_following: boolean;
          recent_visit_count: number;
          last_visited_at: Date | null;
          [key: string]: unknown;
        }>(
          `SELECT r.slug,r.public_room_id AS "publicRoomId",r.title,r.status,r.broadcast_state,r.broadcast_checked_at,r.broadcast_status_message,r.broadcast_status_source,r.goal_text,r.stream_thumbnail_url,u.id AS streamer_id,u.handle AS streamer_handle,u.display_name AS streamer_name,p.avatar_url,p.bio,p.schedule_text,p.next_stream_at,p.schedule_timezone,${roomClassificationSelect},COALESCE((SELECT array_agg(rl.language_code ORDER BY rl.display_order) FROM room_languages rl WHERE rl.room_id=r.id),'{}'::text[]) AS language_codes,COALESCE((SELECT array_agg(t.normalized_slug ORDER BY rt.display_order) FROM room_tags rt JOIN tags t ON t.id=rt.tag_id WHERE rt.room_id=r.id AND t.status='ACTIVE' AND t.tag_type IN ('CONTENT','FORMAT','MOOD')),'{}'::text[]) AS tag_slugs,(SELECT COUNT(*)::int FROM follows f WHERE f.streamer_id=u.id) AS follower_count,(SELECT e.created_at FROM room_lifecycle_events e WHERE e.room_id=r.id AND e.event_type='broadcast_started' ORDER BY e.created_at DESC LIMIT 1) AS live_started_at,($4::uuid IS NOT NULL AND EXISTS(SELECT 1 FROM follows own_follow WHERE own_follow.follower_id=$4 AND own_follow.streamer_id=u.id)) AS is_following,(SELECT LEAST(COUNT(*),5)::int FROM room_visits visit WHERE visit.user_id=$4 AND visit.room_id=r.id AND visit.visited_at>NOW()-INTERVAL '30 days') AS recent_visit_count,(SELECT MAX(visit.visited_at) FROM room_visits visit WHERE visit.user_id=$4 AND visit.room_id=r.id AND visit.visited_at>NOW()-INTERVAL '30 days') AS last_visited_at FROM live_rooms r JOIN users u ON u.id=r.streamer_id JOIN streamer_profiles p ON p.user_id=u.id JOIN creator_accounts ca ON ca.user_id=u.id AND ca.status='ACTIVE' WHERE r.publication_status='published' AND ($1='' OR r.public_room_id=$1 OR r.slug ILIKE '%'||$1||'%' OR r.title ILIKE '%'||$1||'%' OR u.display_name ILIKE '%'||$1||'%' OR u.handle ILIKE '%'||$1||'%' OR EXISTS(SELECT 1 FROM room_tags search_rt JOIN tags search_t ON search_t.id=search_rt.tag_id WHERE search_rt.room_id=r.id AND search_t.status='ACTIVE' AND search_t.tag_type IN ('CONTENT','FORMAT','MOOD') AND (search_t.display_name ILIKE '%'||$1||'%' OR search_t.normalized_slug ILIKE '%'||$1||'%')) OR EXISTS(SELECT 1 FROM room_languages search_rl JOIN supported_languages search_l ON search_l.language_code=search_rl.language_code WHERE search_rl.room_id=r.id AND (search_l.language_code=$1 OR search_l.name_en ILIKE '%'||$1||'%' OR search_l.name_native ILIKE '%'||$1||'%'))) AND (cardinality($2::text[])=0 OR EXISTS(SELECT 1 FROM room_languages filter_rl WHERE filter_rl.room_id=r.id AND filter_rl.language_code=ANY($2::text[]))) AND (cardinality($3::text[])=0 OR EXISTS(SELECT 1 FROM room_tags filter_rt JOIN tags filter_t ON filter_t.id=filter_rt.tag_id WHERE filter_rt.room_id=r.id AND filter_t.normalized_slug=ANY($3::text[]) AND filter_t.status='ACTIVE' AND filter_t.tag_type IN ('CONTENT','FORMAT','MOOD'))) AND (NOT $5::boolean OR EXISTS(SELECT 1 FROM follows own_follow WHERE own_follow.follower_id=$4 AND own_follow.streamer_id=u.id)) AND (NOT $6::boolean OR (r.broadcast_state='live' AND r.broadcast_status_source<>'local')) LIMIT 100`,
          [query, languages, tagSlugs, viewer?.id ?? null, followingOnly, liveOnly],
        );
        const rooms = await Promise.all(result.rows.map(async (room) => {
          const presence = realtime ? await roomPresence(room.slug) : { count: 0, users: [] };
          const viewerCount = presence.users.filter((member) => member.role === "audience").length;
          const state = room.broadcast_state ?? room.status;
          const live = state === "live";
          const startedAt = room.live_started_at ? new Date(room.live_started_at).getTime() : 0;
          const freshness = live && startedAt
            ? Math.max(0, 180 - Math.floor((Date.now() - startedAt) / 60_000))
            : 0;
          const recommendationScore =
            (live ? (personalizationApplied && !preferences.prioritize_live ? 250_000 : 1_000_000) : 0) +
            (personalizationApplied && preferences.prioritize_following && room.is_following ? 400_000 : 0) +
            (personalizationApplied && (room.language_codes as string[]).some(code=>preferences.preferred_languages.includes(code)) ? 180_000 : 0) +
            (personalizationApplied && (room.tag_slugs as string[]).some(slug=>preferences.preferred_tag_slugs.includes(slug)) ? 140_000 : 0) +
            (personalizationApplied ? Math.min(5, Number(room.recent_visit_count)) * 12_000 : 0) +
            (personalizationApplied && room.last_visited_at && Date.now() - new Date(room.last_visited_at).getTime() < 60 * 60 * 1000 ? -30_000 : 0) +
            viewerCount * 10_000 +
            Math.round(Math.log2(Math.max(1, Number(room.follower_count) + 1)) * 1_000) +
            freshness;
          const recommendationReasons = personalizationApplied ? [
            live ? "live" : null,
            preferences.prioritize_following && room.is_following ? "following" : null,
            (room.language_codes as string[]).some(code=>preferences.preferred_languages.includes(code)) ? "preferred_language" : null,
            (room.tag_slugs as string[]).some(slug=>preferences.preferred_tag_slugs.includes(slug)) ? "preferred_tag" : null,
            Number(room.recent_visit_count) > 0 ? "recently_watched" : null,
          ].filter(Boolean) : [];
          const { recent_visit_count: _recentVisitCount,last_visited_at:_lastVisitedAt,language_codes:_languageCodes,tag_slugs:_tagSlugs,...publicRoom }=room;
          return { ...publicRoom, viewer_count: viewerCount, recommendation_score: recommendationScore, recommendation_reasons: recommendationReasons, personalization_applied: personalizationApplied };
        }));
        rooms.sort((left, right) =>
          Number(right.recommendation_score) - Number(left.recommendation_score) ||
          String(left.title).localeCompare(String(right.title)) ||
          String(left.slug).localeCompare(String(right.slug)),
        );
        return { rooms };
      } finally {
        await client.end();
      }
    },
  );
  api.get<{ Querystring: { q?: string } }>("/api/search", async (request, reply) => {
    const q=request.query.q?.trim()??"";
    if(!q||q.length>120)return reply.code(400).send({error:"invalid_search_query"});
    const client=database();await client.connect();
    try{
      const rooms=await client.query(`SELECT r.slug,r.public_room_id AS "publicRoomId",r.title,r.broadcast_state,u.handle AS "creatorHandle",u.display_name AS "creatorName" FROM live_rooms r JOIN users u ON u.id=r.streamer_id JOIN creator_accounts ca ON ca.user_id=u.id AND ca.status='ACTIVE' WHERE r.publication_status='published' AND (r.public_room_id=$1 OR r.slug ILIKE '%'||$1||'%' OR r.title ILIKE '%'||$1||'%' OR u.handle ILIKE '%'||$1||'%' OR u.display_name ILIKE '%'||$1||'%') ORDER BY CASE WHEN r.public_room_id=$1 THEN 0 WHEN LOWER(r.slug)=LOWER($1) THEN 1 WHEN LOWER(u.handle)=LOWER($1) THEN 2 WHEN r.broadcast_state='live' AND r.broadcast_status_source<>'local' THEN 3 ELSE 4 END,r.title LIMIT 8`,[q]);
      const tags=await client.query(`SELECT normalized_slug AS slug,display_name AS "displayName" FROM tags WHERE status='ACTIVE' AND tag_type IN ('CONTENT','FORMAT','MOOD') AND (normalized_slug ILIKE '%'||$1||'%' OR display_name ILIKE '%'||$1||'%') ORDER BY CASE WHEN LOWER(normalized_slug)=LOWER($1) THEN 0 ELSE 1 END,display_name LIMIT 5`,[q]);
      return {rooms:rooms.rows,tags:tags.rows};
    }finally{await client.end();}
  });
  api.get("/api/discovery/languages", async () => {
    const client = database();
    await client.connect();
    try {
      const result=await client.query("SELECT language_code AS code,name_en,name_native FROM supported_languages WHERE enabled=TRUE ORDER BY display_order,language_code");
      return {languages:result.rows};
    } finally {
      await client.end();
    }
  });
  api.get<{Querystring:{type?:string}}>("/api/discovery/tags",async(request,reply)=>{
    const type=request.query.type?.toUpperCase()??"PUBLIC";
    if(type==="COMMUNITY")return reply.code(410).send({error:"community_discovery_removed"});
    if(type!=="PUBLIC")return reply.code(400).send({error:"invalid_tag_type"});
    const client=database();await client.connect();try{
      const kinds=["CONTENT","FORMAT","MOOD"];
      const result=await client.query("SELECT t.id,t.normalized_slug AS slug,t.display_name AS \"displayName\",t.tag_type AS type,COUNT(DISTINCT r.id) FILTER(WHERE r.publication_status='published' AND r.updated_at>NOW()-INTERVAL '30 days')::int AS \"recentRoomCount\",COALESCE(SUM(visits.recent),0)::int AS \"recentEngagement\" FROM tags t LEFT JOIN room_tags rt ON rt.tag_id=t.id LEFT JOIN live_rooms r ON r.id=rt.room_id LEFT JOIN creator_accounts ca ON ca.user_id=r.streamer_id LEFT JOIN LATERAL(SELECT COUNT(*)::int AS recent FROM room_visits v WHERE v.room_id=r.id AND v.visited_at>NOW()-INTERVAL '7 days')visits ON TRUE WHERE t.status='ACTIVE' AND t.tag_type=ANY($1::text[]) AND (r.id IS NULL OR (ca.status='ACTIVE' AND r.publication_status='published')) GROUP BY t.id ORDER BY \"recentRoomCount\" DESC,\"recentEngagement\" DESC,t.display_name LIMIT 100",[kinds]);
      return {tags:result.rows};
    }finally{await client.end();}
  });
  api.get("/api/discovery/categories",async(_request,reply)=>reply.code(410).send({error:"categories_removed",replacement:"/api/discovery/tags"}));
  api.get<{ Params: { streamerId: string } }>(
    "/api/streamers/:streamerId",
    async (request, reply) => {
      const client = database();
      await client.connect();
      try {
        const result = await client.query(
          `SELECT u.id,u.handle,u.display_name,p.avatar_url,p.bio,p.schedule_text,p.next_stream_at,p.schedule_timezone,${roomClassificationSelect},COALESCE((SELECT COUNT(*) FROM follows f WHERE f.streamer_id=u.id),0)::int AS follower_count,r.slug AS room_slug,r.status AS room_status,r.broadcast_state,r.broadcast_status_source FROM users u JOIN creator_accounts ca ON ca.user_id=u.id AND ca.status='ACTIVE' JOIN streamer_profiles p ON p.user_id=u.id LEFT JOIN live_rooms r ON r.streamer_id=u.id AND r.publication_status='published' WHERE u.id=$1`,
          [request.params.streamerId],
        );
        if (!result.rows[0])
          return reply.code(404).send({ error: "streamer_not_found" });
        return { streamer: result.rows[0] };
      } finally {
        await client.end();
      }
    },
  );
  api.post<{ Params: { streamerId: string } }>(
    "/api/streamers/:streamerId/follow",
    async (request, reply) => {
      const viewer = (await requireRole(request, reply, "audience")) as
        DemoUser | undefined;
      if (!viewer) return;
      if (viewer.id === request.params.streamerId)
        return reply.code(400).send({ error: "cannot_follow_self" });
      const client = database();
      await client.connect();
      try {
        const target = await client.query<{ id: string; slug: string | null }>(
          "SELECT u.id,r.slug FROM users u JOIN creator_accounts ca ON ca.user_id=u.id AND ca.status='ACTIVE' LEFT JOIN live_rooms r ON r.streamer_id=u.id AND r.publication_status='published' WHERE u.id=$1",
          [request.params.streamerId],
        );
        if (!target.rows[0])
          return reply.code(404).send({ error: "streamer_not_found" });
        const inserted = await client.query(
          "INSERT INTO follows (follower_id,streamer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING follower_id",
          [viewer.id, request.params.streamerId],
        );
        const count = await client.query<{ count: number }>(
          "SELECT COUNT(*)::int AS count FROM follows WHERE streamer_id=$1",
          [request.params.streamerId],
        );
        const followerCount = count.rows[0]?.count ?? 0;
        if (inserted.rows[0] && target.rows[0].slug) {
          const publicEvent = { streamerId: request.params.streamerId, slug: target.rows[0].slug, followerCount };
          realtime?.to("discovery").to(`room:${target.rows[0].slug}`).emit("follow:changed", publicEvent);
          realtime?.to(`user:${viewer.id}`).emit("follow:state", { ...publicEvent, following: true });
        }
        return { following: true, created: Boolean(inserted.rows[0]), followerCount };
      } finally {
        await client.end();
      }
    },
  );
  api.get<{ Params: { streamerId: string } }>(
    "/api/streamers/:streamerId/follow-status",
    async (request, reply) => {
      const viewer = (await requireRole(request, reply, "audience")) as
        | DemoUser
        | undefined;
      if (!viewer) return;
      const client = database();
      await client.connect();
      try {
        const result = await client.query(
          "SELECT EXISTS(SELECT 1 FROM follows WHERE follower_id=$1 AND streamer_id=$2) AS following,COALESCE((SELECT reminder_enabled FROM follows WHERE follower_id=$1 AND streamer_id=$2),FALSE) AS reminder_enabled",
          [viewer.id, request.params.streamerId],
        );
        return result.rows[0];
      } finally {
        await client.end();
      }
    },
  );
  api.get("/api/me/following", async (request, reply) => {
    const viewer = (await requireRole(request, reply, "audience")) as
      | DemoUser
      | undefined;
    if (!viewer) return;
    const client = database();
    await client.connect();
    try {
      const result = await client.query(
        `SELECT r.slug,r.title,r.status,r.broadcast_state,r.broadcast_checked_at,r.broadcast_status_source,
                u.id AS streamer_id,u.display_name AS streamer_name,
                p.avatar_url,p.bio,p.schedule_text,p.next_stream_at,p.schedule_timezone,${roomClassificationSelect},
                f.created_at AS followed_at,f.reminder_enabled
         FROM follows f
         JOIN users u ON u.id=f.streamer_id
         JOIN creator_accounts ca ON ca.user_id=u.id AND ca.status='ACTIVE'
         JOIN streamer_profiles p ON p.user_id=u.id
         JOIN live_rooms r ON r.streamer_id=u.id AND r.publication_status='published'
         WHERE f.follower_id=$1
         ORDER BY (r.broadcast_state='live' AND r.broadcast_status_source='cloudflare') DESC,
                  p.next_stream_at ASC NULLS LAST,f.created_at DESC
         LIMIT 100`,
        [viewer.id],
      );
      return { creators: result.rows };
    } finally {
      await client.end();
    }
  });
  api.patch<{
    Params: { streamerId: string };
    Body: { enabled?: boolean };
  }>("/api/streamers/:streamerId/reminder", async (request, reply) => {
    const viewer = (await requireRole(request, reply, "audience")) as DemoUser | undefined;
    if (!viewer) return;
    if (typeof request.body?.enabled !== "boolean")
      return reply.code(400).send({ error: "invalid_reminder_preference" });
    const client = database();
    await client.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{ reminder_enabled: boolean }>(
        "UPDATE follows SET reminder_enabled=$1 WHERE follower_id=$2 AND streamer_id=$3 RETURNING reminder_enabled",
        [request.body.enabled, viewer.id, request.params.streamerId],
      );
      if (!result.rows[0]) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "follow_required" });
      }
      if (!request.body.enabled)
        await client.query(
          "DELETE FROM notifications WHERE user_id=$1 AND kind IN ('schedule_updated','schedule_reminder') AND read_at IS NULL AND room_id=(SELECT id FROM live_rooms WHERE streamer_id=$2)",
          [viewer.id, request.params.streamerId],
        );
      await client.query("COMMIT");
      realtime?.to(`user:${viewer.id}`).emit("reminder:preference", {
        streamerId: request.params.streamerId,
        enabled: result.rows[0].reminder_enabled,
      });
      return { enabled: result.rows[0].reminder_enabled };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await client.end();
    }
  });
  api.get<{
    Params: { slug: string };
    Querystring: { cursor?: string; limit?: string };
  }>(
    "/api/streamer/rooms/:slug/followers",
    async (request, reply) => {
      const streamer = (await requireRole(request, reply, "streamer")) as DemoUser | undefined;
      if (!streamer) return;
      const rawLimit = Number(request.query.limit ?? 20);
      const limit = Number.isInteger(rawLimit) && rawLimit >= 1 && rawLimit <= 50 ? rawLimit : null;
      const cursor = request.query.cursor ? decodeFollowerCursor(request.query.cursor) : null;
      if (!limit) return reply.code(400).send({ error: "invalid_follower_limit" });
      if (request.query.cursor && !cursor)
        return reply.code(400).send({ error: "invalid_follower_cursor" });
      const client = database();
      await client.connect();
      try {
        const room = await client.query<{ id: string }>(
          "SELECT id FROM live_rooms WHERE slug=$1 AND streamer_id=$2",
          [request.params.slug, streamer.id],
        );
        if (!room.rows[0]) return reply.code(404).send({ error: "streamer_room_not_found" });
        const [count, result] = await Promise.all([
          client.query<{ count: number }>(
            "SELECT COUNT(*)::int AS count FROM follows WHERE streamer_id=$1",
            [streamer.id],
          ),
          client.query<{
            id: string;
            handle: string;
            display_name: string;
            created_at: Date;
          }>(
            "SELECT u.id,u.handle,u.display_name,f.created_at FROM follows f JOIN users u ON u.id=f.follower_id WHERE f.streamer_id=$1 AND ($2::timestamptz IS NULL OR (f.created_at,f.follower_id)<($2::timestamptz,$3::uuid)) ORDER BY f.created_at DESC,f.follower_id DESC LIMIT $4",
            [streamer.id, cursor?.createdAt ?? null, cursor?.id ?? null, limit + 1],
          ),
        ]);
        const hasMore = result.rows.length > limit;
        const rows = result.rows.slice(0, limit);
        return {
          totalCount: count.rows[0]?.count ?? 0,
          followers: rows.map((row) => ({
            id: row.id,
            handle: row.handle,
            displayName: row.display_name,
            followedAt: row.created_at.toISOString(),
            status: "following",
          })),
          nextCursor: hasMore && rows.length
            ? encodeFollowerCursor(rows[rows.length - 1].created_at, rows[rows.length - 1].id)
            : null,
        };
      } finally {
        await client.end();
      }
    },
  );
  api.delete<{ Params: { streamerId: string } }>(
    "/api/streamers/:streamerId/follow",
    async (request, reply) => {
      const viewer = (await requireRole(request, reply, "audience")) as
        DemoUser | undefined;
      if (!viewer) return;
      const client = database();
      await client.connect();
      try {
        const target = await client.query<{ slug: string | null }>(
          "SELECT r.slug FROM users u JOIN creator_accounts ca ON ca.user_id=u.id AND ca.status='ACTIVE' LEFT JOIN live_rooms r ON r.streamer_id=u.id AND r.publication_status='published' WHERE u.id=$1",
          [request.params.streamerId],
        );
        const deleted = await client.query(
          "DELETE FROM follows WHERE follower_id=$1 AND streamer_id=$2 RETURNING follower_id",
          [viewer.id, request.params.streamerId],
        );
        if (deleted.rows[0] && target.rows[0]?.slug) {
          const count = await client.query<{ count: number }>(
            "SELECT COUNT(*)::int AS count FROM follows WHERE streamer_id=$1",
            [request.params.streamerId],
          );
          const publicEvent = {
            streamerId: request.params.streamerId,
            slug: target.rows[0].slug,
            followerCount: count.rows[0]?.count ?? 0,
          };
          realtime?.to("discovery").to(`room:${target.rows[0].slug}`).emit("follow:changed", publicEvent);
          realtime?.to(`user:${viewer.id}`).emit("follow:state", { ...publicEvent, following: false });
        }
        return reply.code(204).send();
      } finally {
        await client.end();
      }
    },
  );
  api.get<{Querystring:{page?:string}}>("/api/me/notifications", async (request, reply) => {
    const viewer = await currentUser(request);
    if (!viewer)
      return reply.code(401).send({ error: "demo_session_required" });
    const client = database();
    await client.connect();
    try {
      const page=Math.max(1,Math.min(1000,Number.parseInt(request.query.page??"1",10)||1));
      const result = await client.query(
        "SELECT n.id,n.kind,n.title,n.body,n.read_at,n.created_at,n.room_id,r.slug AS room_slug,(r.broadcast_state='live' AND r.broadcast_status_source<>'local') AS room_is_live FROM notifications n LEFT JOIN live_rooms r ON r.id=n.room_id WHERE n.user_id=$1 ORDER BY n.created_at DESC,n.id DESC LIMIT 21 OFFSET $2",
        [viewer.id,(page-1)*20],
      );
      return { notifications: result.rows.slice(0,20), page, hasMore:result.rows.length>20 };
    } finally {
      await client.end();
    }
  });
  api.patch<{ Params: { notificationId: string } }>(
    "/api/me/notifications/:notificationId/read",
    async (request, reply) => {
      const user = await currentUser(request);
      if (!user) return reply.code(401).send({ error: "session_required" });
      const client = database();
      await client.connect();
      try {
        const result = await client.query(
          "UPDATE notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=$1 AND user_id=$2 RETURNING id,read_at",
          [request.params.notificationId, user.id],
        );
        if (!result.rows[0])
          return reply.code(404).send({ error: "notification_not_found" });
        return { notification: result.rows[0] };
      } finally {
        await client.end();
      }
    },
  );
  api.post("/api/me/notifications/read-all", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "session_required" });
    const client = database();
    await client.connect();
    try {
      const result = await client.query(
        "UPDATE notifications SET read_at=NOW() WHERE user_id=$1 AND read_at IS NULL",
        [user.id],
      );
      return { updated: result.rowCount ?? 0 };
    } finally {
      await client.end();
    }
  });
  api.get<{Querystring:{page?:string}}>("/api/me/history", async (request, reply) => {
    const viewer = await currentUser(request);
    if (!viewer)
      return reply.code(401).send({ error: "demo_session_required" });
    const client = database();
    await client.connect();
    try {
      const page=Math.max(1,Math.min(1000,Number.parseInt(request.query.page??"1",10)||1));
      const result = await client.query(
        "SELECT * FROM (SELECT DISTINCT ON (r.id) r.slug,r.title,u.display_name AS streamer_name,v.visited_at FROM room_visits v JOIN live_rooms r ON r.id=v.room_id JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' JOIN users u ON u.id=r.streamer_id WHERE v.user_id=$1 AND r.publication_status='published' ORDER BY r.id,v.visited_at DESC) recent ORDER BY visited_at DESC LIMIT 21 OFFSET $2",
        [viewer.id,(page-1)*20],
      );
      return { rooms: result.rows.slice(0,20), page, hasMore:result.rows.length>20 };
    } finally {
      await client.end();
    }
  });
  api.get<{ Params: { slug: string } }>(
    "/api/rooms/:slug",
    async (request, reply) => {
      const client = database();
      await client.connect();
      try {
        const result = await client.query(
          `SELECT r.slug,r.public_room_id AS "publicRoomId",r.title,r.status,r.broadcast_state,r.broadcast_checked_at,r.broadcast_status_message,r.broadcast_status_source,r.broadcast_transport,r.stream_thumbnail_url,u.id AS streamer_id,u.handle AS streamer_handle,u.display_name AS streamer_name,p.avatar_url,p.bio,p.schedule_text,p.next_stream_at,p.schedule_timezone,${roomClassificationSelect} FROM live_rooms r JOIN users u ON u.id=r.streamer_id JOIN creator_accounts ca ON ca.user_id=u.id AND ca.status='ACTIVE' JOIN streamer_profiles p ON p.user_id=u.id WHERE (r.slug=$1 OR r.public_room_id=$1) AND r.publication_status='published'`,
          [request.params.slug],
        );
        if (!result.rows[0])
          return reply.code(404).send({ error: "room_not_found" });
        return { room: result.rows[0] };
      } finally {
        await client.end();
      }
    },
  );
  api.get<{ Params: { kind: string; slug: string } }>(
    "/api/public/social-preview/:kind/:slug",
    async (request, reply) => {
      const { kind, slug } = request.params;
      if (!validSocialPreviewPath(kind, slug)) return reply.code(404).send({ error: "preview_not_found" });
      const client = database();
      await client.connect();
      try {
        const result = await client.query(
          `SELECT r.slug,r.title,r.broadcast_state,r.broadcast_status_source,r.stream_thumbnail_url,u.display_name AS streamer_name,u.handle,p.avatar_url,p.bio,${roomClassificationSelect} FROM live_rooms r JOIN users u ON u.id=r.streamer_id JOIN creator_accounts ca ON ca.user_id=u.id AND ca.status='ACTIVE' JOIN streamer_profiles p ON p.user_id=u.id WHERE r.slug=$1 AND r.publication_status='published'`,
          [slug],
        );
        if (!result.rows[0]) return reply.code(404).send({ error: "preview_not_found" });
        reply.header("cache-control", "public, max-age=60, stale-while-revalidate=300");
        reply.header("vary", "User-Agent, Accept-Encoding");
        return reply.type("text/html; charset=utf-8").send(
          renderSocialPreview(kind as SocialPreviewKind, result.rows[0], config.webOrigin),
        );
      } finally {
        await client.end();
      }
    },
  );
  api.post<{ Params: { slug: string } }>(
    "/api/rooms/:slug/visit",
    async (request, reply) => {
      const viewer = await currentUser(request);
      if (!viewer)
        return reply.code(401).send({ error: "demo_session_required" });
      const client = database();
      await client.connect();
      try {
        const room = await client.query<{ id: string; broadcast_state:string; broadcast_status_source:string }>(
          "SELECT r.id,r.broadcast_state,r.broadcast_status_source FROM live_rooms r JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' WHERE r.slug=$1 AND r.publication_status='published'",
          [request.params.slug],
        );
        if (!room.rows[0])
          return reply.code(404).send({ error: "room_not_found" });
        if(room.rows[0].broadcast_state!=="live"||room.rows[0].broadcast_status_source==="local")
          return reply.code(409).send({error:"room_not_live"});
        await client.query(
          "INSERT INTO room_visits (id,room_id,user_id) VALUES ($1,$2,$3)",
          [crypto.randomUUID(), room.rows[0].id, viewer.id],
        );
        return reply.code(204).send();
      } finally {
        await client.end();
      }
    },
  );
  api.get<{ Params: { slug: string } }>(
    "/api/rooms/:slug/chat-history",
    async (request, reply) => {
      const viewer = await currentUser(request);
      const client = database();
      await client.connect();
      try {
        const result = await client.query(
          "SELECT m.id,m.body,m.created_at,u.id AS sender_id,u.handle AS sender_handle,u.display_name,u.role FROM chat_messages m JOIN live_rooms r ON r.id=m.room_id JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' JOIN users u ON u.id=m.sender_id WHERE r.slug=$1 AND r.publication_status='published' AND r.broadcast_state='live' AND r.broadcast_status_source<>'local' AND m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 40",
          [request.params.slug],
        );
        if (!result.rows.length) {
          const room = await client.query(
            "SELECT r.id,r.broadcast_state,r.broadcast_status_source FROM live_rooms r JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' WHERE r.slug=$1 AND r.publication_status='published'",
            [request.params.slug],
          );
          if (!room.rows[0]) return reply.code(404).send({ error: "room_not_found" });
        }
        const roomState=await client.query("SELECT broadcast_state,broadcast_status_source FROM live_rooms WHERE slug=$1 AND publication_status='published'",[request.params.slug]);
        if(roomState.rows[0]&&(roomState.rows[0].broadcast_state!=="live"||roomState.rows[0].broadcast_status_source==="local"))return {messages:[],archived:true};
        return {
          messages: result.rows.reverse().map((message) => ({
            id: message.id,
            body: message.body,
            createdAt: message.created_at,
            sender: {
              ...(viewer ? { id: message.sender_id } : {}),
              displayName: message.display_name,
              handle: message.sender_handle,
              role: message.role,
            },
          })),
        };
      } finally {
        await client.end();
      }
    },
  );
  api.post<{
    Params: { slug: string };
    Body: { reason?: string; details?: string };
  }>(
    "/api/rooms/:slug/reports",
    { schema: { body: mutationSchemas.report } },
    async (request, reply) => {
    const viewer = (await requireRole(request, reply, "audience")) as
      DemoUser | undefined;
    if (!viewer) return;
    const reason = request.body?.reason?.trim();
    if (!reason || reason.length > 120)
      return reply.code(400).send({ error: "report_reason_required" });
    const client = database();
    await client.connect();
    try {
      const room = await client.query<{ id: string }>(
        "SELECT r.id FROM live_rooms r JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' WHERE r.slug=$1 AND r.publication_status='published'",
        [request.params.slug],
      );
      if (!room.rows[0])
        return reply.code(404).send({ error: "room_not_found" });
      await client.query(
        "INSERT INTO content_reports (id,room_id,reporter_id,reason,details) VALUES ($1,$2,$3,$4,$5)",
        [
          crypto.randomUUID(),
          room.rows[0].id,
          viewer.id,
          reason,
          request.body?.details?.trim().slice(0, 500) ?? null,
        ],
      );
      return { submitted: true };
    } finally {
      await client.end();
    }
    },
  );
  api.get<{ Params: { slug: string } }>(
    "/api/rooms/:slug/broadcast",
    async (request, reply) => {
      const client = database();
      await client.connect();
      try {
        const result = await client.query(
          "SELECT r.broadcast_state,r.broadcast_checked_at,r.broadcast_status_message,r.broadcast_status_source,r.broadcast_transport FROM live_rooms r JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' WHERE r.slug=$1 AND r.publication_status='published'",
          [request.params.slug],
        );
        if (!result.rows[0])
          return reply.code(404).send({ error: "room_not_found" });
        return {
          broadcast: {
            state: result.rows[0].broadcast_state,
            checkedAt:
              result.rows[0].broadcast_checked_at?.toISOString() ?? null,
            message: result.rows[0].broadcast_status_message,
            source: result.rows[0].broadcast_status_source,
            transport: result.rows[0].broadcast_transport,
          },
        };
      } finally {
        await client.end();
      }
    },
  );
  api.put<{
    Params: { slug: string };
    Body: { transport?: BroadcastTransport };
  }>(
    "/api/streamer/rooms/:slug/broadcast/transport",
    async (request, reply) => {
      const streamer = (await requireRole(request, reply, "streamer")) as
        | DemoUser
        | undefined;
      if (!streamer) return;
      const transport = request.body?.transport;
      if (!transport || !["obs_hls", "browser_webrtc"].includes(transport))
        return reply.code(400).send({ error: "invalid_broadcast_transport" });
      const client = database();
      await client.connect();
      try {
        const result = await client.query(
          "UPDATE live_rooms SET broadcast_transport=$1::broadcast_transport_mode,updated_at=NOW() WHERE slug=$2 AND streamer_id=$3 AND broadcast_state<>'live' RETURNING broadcast_transport",
          [transport, request.params.slug, streamer.id],
        );
        if (!result.rows[0])
          return reply.code(409).send({ error: "broadcast_transport_locked" });
        return { transport };
      } finally {
        await client.end();
      }
    },
  );
  api.post<{ Querystring: { focusX?: string; focusY?: string } }>(
    "/api/streamer/avatar",
    { bodyLimit: avatarUploadLimitBytes + 64 * 1024 },
    async (request, reply) => {
      const streamer = (await requireRole(request, reply, "streamer")) as
        | DemoUser
        | undefined;
      if (!streamer) return;

      let upload;
      try {
        upload = await request.file({
          limits: { files: 1, fields: 0, fileSize: avatarUploadLimitBytes },
        });
      } catch {
        return reply.code(413).send({ error: "avatar_too_large" });
      }
      if (!upload)
        return reply.code(400).send({ error: "avatar_file_required" });

      let saved: Awaited<ReturnType<typeof saveAvatar>>;
      try {
        const focusX = Number(request.query.focusX ?? 0.5);
        const focusY = Number(request.query.focusY ?? 0.5);
        if (!Number.isFinite(focusX) || !Number.isFinite(focusY) || focusX < 0 || focusX > 1 || focusY < 0 || focusY > 1)
          return reply.code(400).send({ error: "avatar_focus_invalid" });
        const buffer = await upload.toBuffer();
        if (upload.file.truncated)
          return reply.code(413).send({ error: "avatar_too_large" });
        saved = await saveAvatar({
          storagePath: config.avatarStoragePath,
          userId: streamer.id,
          mimeType: upload.mimetype,
          buffer,
          focusX,
          focusY,
        });
      } catch (error) {
        if (error instanceof AvatarUploadError)
          return reply.code(400).send({ error: error.code });
        throw error;
      }

      const client = database();
      await client.connect();
      let previousAvatarUrl: string | null = null;
      try {
        await client.query("BEGIN");
        const current = await client.query<{ avatar_url: string | null }>(
          "SELECT avatar_url FROM streamer_profiles WHERE user_id=$1 FOR UPDATE",
          [streamer.id],
        );
        if (!current.rows[0]) {
          await client.query("ROLLBACK");
          await removeStoredAvatar(config.avatarStoragePath, saved.url);
          return reply.code(404).send({ error: "streamer_profile_not_found" });
        }
        previousAvatarUrl = current.rows[0].avatar_url;
        await client.query(
          "UPDATE streamer_profiles SET avatar_url=$1 WHERE user_id=$2",
          [saved.url, streamer.id],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        await removeStoredAvatar(config.avatarStoragePath, saved.url);
        throw error;
      } finally {
        await client.end();
      }
      await removeStoredAvatar(config.avatarStoragePath, previousAvatarUrl);
      return { avatarUrl: saved.url };
    },
  );
  api.delete("/api/streamer/avatar", async (request, reply) => {
    const streamer = (await requireRole(request, reply, "streamer")) as
      | DemoUser
      | undefined;
    if (!streamer) return;
    const client = database();
    await client.connect();
    let previousAvatarUrl: string | null = null;
    try {
      await client.query("BEGIN");
      const previous = await client.query<{ avatar_url: string | null }>(
        "SELECT avatar_url FROM streamer_profiles WHERE user_id=$1 FOR UPDATE",
        [streamer.id],
      );
      previousAvatarUrl = previous.rows[0]?.avatar_url ?? null;
      if (!previous.rowCount) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "streamer_profile_not_found" });
      }
      await client.query(
        "UPDATE streamer_profiles SET avatar_url=NULL WHERE user_id=$1",
        [streamer.id],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await client.end();
    }
    await removeStoredAvatar(config.avatarStoragePath, previousAvatarUrl);
    return reply.code(204).send();
  });
  api.post(
    "/api/streamer/stream-thumbnail",
    { bodyLimit: streamThumbnailUploadLimitBytes + 64 * 1024 },
    async (request, reply) => {
      const streamer = (await requireRole(request, reply, "streamer")) as DemoUser | undefined;
      if (!streamer) return;
      let upload;
      try {
        upload = await request.file({ limits: { files: 1, fields: 0, fileSize: streamThumbnailUploadLimitBytes } });
      } catch {
        return reply.code(413).send({ error: "thumbnail_too_large" });
      }
      if (!upload) return reply.code(400).send({ error: "thumbnail_file_required" });
      let saved: Awaited<ReturnType<typeof saveStreamThumbnail>>;
      try {
        const buffer = await upload.toBuffer();
        if (upload.file.truncated) return reply.code(413).send({ error: "thumbnail_too_large" });
        saved = await saveStreamThumbnail({ storagePath: config.avatarStoragePath, userId: streamer.id, mimeType: upload.mimetype, buffer });
      } catch (error) {
        if (error instanceof StreamThumbnailUploadError)
          return reply.code(400).send({ error: error.code });
        throw error;
      }
      const client = database();
      await client.connect();
      let previous: string | null = null;
      try {
        await client.query("BEGIN");
        const current = await client.query<{ stream_thumbnail_url: string | null }>(
          "SELECT stream_thumbnail_url FROM live_rooms WHERE streamer_id=$1 FOR UPDATE",
          [streamer.id],
        );
        if (!current.rows[0]) {
          await client.query("ROLLBACK");
          await removeStoredStreamThumbnail(config.avatarStoragePath, saved.url);
          return reply.code(404).send({ error: "streamer_room_not_found" });
        }
        previous = current.rows[0].stream_thumbnail_url;
        await client.query("UPDATE live_rooms SET stream_thumbnail_url=$1,updated_at=NOW() WHERE streamer_id=$2", [saved.url, streamer.id]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        await removeStoredStreamThumbnail(config.avatarStoragePath, saved.url);
        throw error;
      } finally {
        await client.end();
      }
      await removeStoredStreamThumbnail(config.avatarStoragePath, previous);
      return { thumbnailUrl: saved.url };
    },
  );
  api.delete("/api/streamer/stream-thumbnail", async (request, reply) => {
    const streamer = (await requireRole(request, reply, "streamer")) as DemoUser | undefined;
    if (!streamer) return;
    const client = database();
    await client.connect();
    let previous: string | null = null;
    try {
      await client.query("BEGIN");
      const result = await client.query<{ stream_thumbnail_url: string | null }>(
        "SELECT stream_thumbnail_url FROM live_rooms WHERE streamer_id=$1 FOR UPDATE",
        [streamer.id],
      );
      previous = result.rows[0]?.stream_thumbnail_url ?? null;
      if (!result.rows[0]) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "streamer_room_not_found" });
      }
      await client.query("UPDATE live_rooms SET stream_thumbnail_url=NULL,updated_at=NOW() WHERE streamer_id=$1", [streamer.id]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await client.end();
    }
    await removeStoredStreamThumbnail(config.avatarStoragePath, previous);
    return reply.code(204).send();
  });
  api.post<{
    Params: { slug: string };
    Body: { sdp?: string };
  }>(
    "/api/streamer/rooms/:slug/webrtc/publish",
    async (request, reply) => {
      const streamer = (await requireRole(request, reply, "streamer")) as
        | DemoUser
        | undefined;
      if (!streamer) return;
      if (!hasCloudflareQuickLiveConfiguration())
        return reply.code(503).send({ error: "webrtc_service_unavailable" });
      const offerSdp = request.body?.sdp;
      if (typeof offerSdp !== "string" || offerSdp.length > 60_000)
        return reply.code(400).send({ error: "invalid_webrtc_offer" });
      const client = database();
      await client.connect();
      let sessionId = "";
      let inputId = "";
      try {
        await client.query("BEGIN");
        const room = await client.query<{
          id: string;
          cloudflare_live_input_id: string | null;
          broadcast_state: string;
        }>(
          "SELECT id,cloudflare_live_input_id,broadcast_state FROM live_rooms WHERE slug=$1 AND streamer_id=$2 FOR UPDATE",
          [request.params.slug, streamer.id],
        );
        if (!room.rows[0]) {
          await client.query("ROLLBACK");
          return reply.code(404).send({ error: "streamer_room_not_found" });
        }
        if (!room.rows[0].cloudflare_live_input_id) {
          await client.query("ROLLBACK");
          return reply.code(503).send({ error: "webrtc_service_unavailable" });
        }
        if (room.rows[0].broadcast_state === "live") {
          await client.query("ROLLBACK");
          return reply.code(409).send({ error: "broadcast_already_live" });
        }
        sessionId = crypto.randomUUID();
        inputId = room.rows[0].cloudflare_live_input_id;
        await client.query(
          "UPDATE broadcast_sessions SET state='ended',ended_at=NOW(),failure_code='stale_session',updated_at=NOW() WHERE room_id=$1 AND state IN ('connecting','active') AND updated_at<NOW()-INTERVAL '2 minutes'",
          [room.rows[0].id],
        );
        await client.query(
          "INSERT INTO broadcast_sessions (id,room_id,creator_id,transport,state) VALUES ($1,$2,$3,'browser_webrtc','connecting')",
          [sessionId, room.rows[0].id, streamer.id],
        );
        await client.query(
          "UPDATE live_rooms SET broadcast_transport='browser_webrtc',updated_at=NOW() WHERE id=$1",
          [room.rows[0].id],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        if ((error as { code?: string }).code === "23505")
          return reply.code(409).send({ error: "broadcast_session_active" });
        throw error;
      } finally {
        await client.end();
      }
      await persistBroadcastStatus(request.params.slug, {
        state: "connecting",
        message: "Browser broadcast is connecting.",
        source: "cloudflare",
      });
      try {
        const endpoints = await readWebRtcEndpoints(inputId);
        const exchange = await exchangeWebRtcOffer(endpoints.publishUrl, offerSdp);
        webRtcResources.set(sessionId, {
          resourceUrl: exchange.resourceUrl,
          roomSlug: request.params.slug,
          userId: streamer.id,
          kind: "publish",
          expiresAt: Date.now() + publishResourceTtlMilliseconds,
        });
        const update = database();
        await update.connect();
        try {
          await update.query(
            "UPDATE broadcast_sessions SET state='active',updated_at=NOW() WHERE id=$1",
            [sessionId],
          );
        } finally {
          await update.end();
        }
        reply.header("cache-control", "no-store");
        return { sessionId, answerSdp: exchange.answerSdp };
      } catch {
        const failed = database();
        await failed.connect();
        try {
          await failed.query(
            "UPDATE broadcast_sessions SET state='failed',failure_code='negotiation_failed',ended_at=NOW(),updated_at=NOW() WHERE id=$1",
            [sessionId],
          );
        } finally {
          await failed.end();
        }
        await persistBroadcastStatus(request.params.slug, {
          state: "unavailable",
          message: "Browser broadcast could not connect.",
          source: "cloudflare",
        });
        return reply.code(503).send({ error: "webrtc_service_unavailable" });
      }
    },
  );
  api.delete<{ Params: { slug: string; sessionId: string } }>(
    "/api/streamer/rooms/:slug/webrtc/publish/:sessionId",
    async (request, reply) => {
      const streamer = (await requireRole(request, reply, "streamer")) as
        | DemoUser
        | undefined;
      if (!streamer) return;
      const client = database();
      await client.connect();
      try {
        const result = await client.query(
          "UPDATE broadcast_sessions s SET state='ended',ended_at=NOW(),updated_at=NOW() FROM live_rooms r WHERE s.id=$1 AND s.room_id=r.id AND r.slug=$2 AND s.creator_id=$3 AND s.state IN ('connecting','active') RETURNING s.id",
          [request.params.sessionId, request.params.slug, streamer.id],
        );
        if (!result.rows[0])
          return reply.code(404).send({ error: "broadcast_session_not_found" });
        await client.query(
          "UPDATE live_rooms SET broadcast_transport='obs_hls',updated_at=NOW() WHERE slug=$1",
          [request.params.slug],
        );
      } finally {
        await client.end();
      }
      const resource = webRtcResources.get(request.params.sessionId);
      if (resource?.userId === streamer.id && resource.kind === "publish") {
        webRtcResources.delete(request.params.sessionId);
        await endWebRtcResource(resource.resourceUrl);
      }
      await persistBroadcastStatus(request.params.slug, {
        state: "offline",
        message: "Broadcast ended.",
        source: "cloudflare",
      });
      broadcastRecoveryWindows.delete(request.params.slug);
      return reply.code(204).send();
    },
  );
  api.post<{ Params: { slug: string } }>(
    "/api/streamer/rooms/:slug/broadcast/end",
    async (request, reply) => {
      const streamer = (await requireRole(request, reply, "streamer")) as
        | DemoUser
        | undefined;
      if (!streamer) return;
      const client = database();
      await client.connect();
      let selectedRoom: {
        broadcast_state: BroadcastStatus["state"];
        broadcast_transport: BroadcastTransport;
        broadcast_status_source: BroadcastStatus["source"];
      } | null = null;
      try {
        const room = await client.query<{
          broadcast_state: BroadcastStatus["state"];
          broadcast_transport: BroadcastTransport;
          broadcast_status_source: BroadcastStatus["source"];
        }>(
          "SELECT broadcast_state,broadcast_transport,broadcast_status_source FROM live_rooms WHERE slug=$1 AND streamer_id=$2",
          [request.params.slug, streamer.id],
        );
        if (!room.rows[0])
          return reply.code(404).send({ error: "streamer_room_not_found" });
        selectedRoom = room.rows[0];
        if (
          room.rows[0].broadcast_transport === "obs_hls" &&
          room.rows[0].broadcast_status_source === "cloudflare" &&
          room.rows[0].broadcast_state === "live"
        )
          return reply.code(409).send({ error: "external_broadcast_still_live" });
        await client.query(
          "UPDATE broadcast_sessions s SET state='ended',ended_at=NOW(),failure_code='creator_ended',updated_at=NOW() FROM live_rooms r WHERE s.room_id=r.id AND r.slug=$1 AND s.creator_id=$2 AND s.state IN ('connecting','active')",
          [request.params.slug, streamer.id],
        );
      } finally {
        await client.end();
      }
      if (!selectedRoom)
        return reply.code(404).send({ error: "streamer_room_not_found" });
      const resources = [...webRtcResources.entries()].filter(
        ([, resource]) =>
          resource.kind === "publish" &&
          resource.roomSlug === request.params.slug &&
          resource.userId === streamer.id,
      );
      for (const [sessionId, resource] of resources) {
        webRtcResources.delete(sessionId);
        await endWebRtcResource(resource.resourceUrl);
      }
      broadcastRecoveryWindows.delete(request.params.slug);
      await persistBroadcastStatus(request.params.slug, {
        state: "offline",
        message:
          selectedRoom.broadcast_status_source === "cloudflare"
            ? "Broadcast ended by the creator."
            : "Simulation only: offline. No media is being published by this control.",
        source: selectedRoom.broadcast_status_source,
      });
      return { ended: true };
    },
  );
  api.patch<{ Params: { slug: string; sessionId: string } }>(
    "/api/streamer/rooms/:slug/webrtc/publish/:sessionId",
    async (request, reply) => {
      const streamer = (await requireRole(request, reply, "streamer")) as
        | DemoUser
        | undefined;
      if (!streamer) return;
      const resource = webRtcResources.get(request.params.sessionId);
      if (
        !resource ||
        resource.kind !== "publish" ||
        resource.roomSlug !== request.params.slug ||
        resource.userId !== streamer.id
      )
        return reply.code(404).send({ error: "broadcast_session_not_found" });
      resource.expiresAt = Date.now() + publishResourceTtlMilliseconds;
      const client = database();
      await client.connect();
      try {
        await client.query(
          "UPDATE broadcast_sessions SET failure_code=NULL,updated_at=NOW() WHERE id=$1 AND creator_id=$2 AND state IN ('connecting','active')",
          [request.params.sessionId, streamer.id],
        );
      } finally {
        await client.end();
      }
      return reply.code(204).send();
    },
  );
  api.post<{ Params: { slug: string; sessionId: string } }>(
    "/api/streamer/rooms/:slug/webrtc/publish/:sessionId/resume",
    async (request, reply) => {
      const streamer = (await requireRole(request, reply, "streamer")) as
        | DemoUser
        | undefined;
      if (!streamer) return;
      const client = database();
      await client.connect();
      try {
        const result = await client.query(
          "UPDATE broadcast_sessions s SET state='ended',ended_at=NOW(),failure_code='creator_resume',updated_at=NOW() FROM live_rooms r WHERE s.id=$1 AND s.room_id=r.id AND r.slug=$2 AND s.creator_id=$3 AND s.state IN ('connecting','active') RETURNING s.id",
          [request.params.sessionId, request.params.slug, streamer.id],
        );
        if (!result.rows[0])
          return reply.code(404).send({ error: "broadcast_session_not_found" });
      } finally {
        await client.end();
      }
      const resource = webRtcResources.get(request.params.sessionId);
      if (resource?.userId === streamer.id && resource.kind === "publish") {
        webRtcResources.delete(request.params.sessionId);
        await endWebRtcResource(resource.resourceUrl);
      }
      broadcastRecoveryWindows.set(
        request.params.slug,
        Date.now() + broadcastRecoveryGraceMilliseconds,
      );
      await persistBroadcastStatus(request.params.slug, {
        state: "connecting",
        message: broadcastRecoveryMessage,
        source: "cloudflare",
      });
      return reply.code(204).send();
    },
  );
  api.post<{
    Params: { slug: string; sessionId: string };
    Body: { reason?: string };
  }>(
    "/api/streamer/rooms/:slug/webrtc/publish/:sessionId/interruption",
    async (request, reply) => {
      const streamer = (await requireRole(request, reply, "streamer")) as
        | DemoUser
        | undefined;
      if (!streamer) return;
      const resource = webRtcResources.get(request.params.sessionId);
      if (
        !resource ||
        resource.kind !== "publish" ||
        resource.roomSlug !== request.params.slug ||
        resource.userId !== streamer.id
      )
        return reply.code(404).send({ error: "broadcast_session_not_found" });
      broadcastRecoveryWindows.set(
        request.params.slug,
        Math.max(Date.now(), resource.expiresAt) + broadcastRecoveryGraceMilliseconds,
      );
      const client = database();
      await client.connect();
      try {
        await client.query(
          "UPDATE broadcast_sessions SET failure_code=$1,updated_at=NOW() WHERE id=$2 AND creator_id=$3 AND state IN ('connecting','active')",
          [request.body?.reason === "page_hidden" ? "client_backgrounded" : "client_interrupted", request.params.sessionId, streamer.id],
        );
      } finally {
        await client.end();
      }
      await persistBroadcastStatus(request.params.slug, {
        state: "connecting",
        message: broadcastRecoveryMessage,
        source: "cloudflare",
      });
      return reply.code(204).send();
    },
  );
  api.post<{ Params: { slug: string } }>(
    "/api/streamer/rooms/:slug/broadcast/refresh",
    async (request, reply) => {
      const streamer = (await requireRole(request, reply, "streamer")) as
        DemoUser | undefined;
      if (!streamer) return;
      const client = database();
      await client.connect();
      try {
        const room = await client.query<{
          cloudflare_live_input_id: string | null;
        }>(
          "SELECT cloudflare_live_input_id FROM live_rooms WHERE slug=$1 AND streamer_id=$2",
          [request.params.slug, streamer.id],
        );
        if (!room.rows[0])
          return reply.code(404).send({ error: "streamer_room_not_found" });
        const status: BroadcastStatus = room.rows[0].cloudflare_live_input_id
          ? await cloudflareBroadcastStatus(
              room.rows[0].cloudflare_live_input_id,
            )
          : {
              state: "unavailable",
              message: "Broadcast status is temporarily unavailable.",
              source: "cloudflare",
            };
        return {
          broadcast: await persistBroadcastStatus(request.params.slug, status),
        };
      } finally {
        await client.end();
      }
    },
  );
  api.put<{
    Params: { slug: string };
    Body: { state?: "live" | "connecting" | "offline" | "unavailable" };
  }>(
    "/api/streamer/rooms/:slug/broadcast/local-status",
    async (request, reply) => {
      if (config.nodeEnv === "production")
        return reply.code(404).send({ error: "not_found" });
      const streamer = (await requireRole(request, reply, "streamer")) as
        DemoUser | undefined;
      if (!streamer) return;
      const requested = request.body?.state;
      if (
        requested &&
        !["live", "connecting", "offline", "unavailable"].includes(requested)
      )
        return reply.code(400).send({ error: "invalid_local_broadcast_state" });
      const client = database();
      await client.connect();
      try {
        const room = await client.query(
          "SELECT id FROM live_rooms WHERE slug=$1 AND streamer_id=$2",
          [request.params.slug, streamer.id],
        );
        if (!room.rows[0])
          return reply.code(404).send({ error: "streamer_room_not_found" });
      } finally {
        await client.end();
      }
      const status = requested
        ? {
            ...localBroadcastStatus(),
            state: requested,
            message: `Simulation only: ${requested}. No media is being published by this control.`,
          }
        : localBroadcastStatus();
      return {
        broadcast: await persistBroadcastStatus(request.params.slug, status),
      };
    },
  );
  api.post<{
    Params: { slug: string };
    Body: { sdp?: string };
  }>(
    "/api/rooms/:slug/webrtc/play",
    async (request, reply) => {
      const user = await currentUser(request);
      if (!hasCloudflareQuickLiveConfiguration())
        return reply.code(503).send({ error: "webrtc_service_unavailable" });
      const offerSdp = request.body?.sdp;
      if (typeof offerSdp !== "string" || offerSdp.length > 60_000)
        return reply.code(400).send({ error: "invalid_webrtc_offer" });
      const client = database();
      await client.connect();
      let inputId = "";
      try {
        const result = await client.query<{
          id: string;
          cloudflare_live_input_id: string | null;
          broadcast_state: string;
          broadcast_transport: BroadcastTransport;
        }>(
          "SELECT r.id,r.cloudflare_live_input_id,r.broadcast_state,r.broadcast_transport FROM live_rooms r JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' WHERE r.slug=$1 AND r.publication_status='published'",
          [request.params.slug],
        );
        const room = result.rows[0];
        if (!room) return reply.code(404).send({ error: "room_not_found" });
        if (
          room.broadcast_state !== "live" ||
          room.broadcast_transport !== "browser_webrtc" ||
          !room.cloudflare_live_input_id
        )
          return reply.code(409).send({ error: "webrtc_room_not_live" });
        const privateShow = await client.query<{ id: string }>(
          "SELECT s.id FROM private_show_sessions s WHERE s.room_id=$1 AND s.status='live'",
          [room.id],
        );
        if (privateShow.rows[0] && (!user || user.role === "audience")) {
          if (!user)
            return reply.code(403).send({ error: "private_show_access_required" });
          const access = await client.query(
            "SELECT id FROM private_show_access WHERE session_id=$1 AND viewer_id=$2 AND (expires_at IS NULL OR expires_at>NOW())",
            [privateShow.rows[0].id, user.id],
          );
          if (!access.rows[0])
            return reply
              .code(403)
              .send({ error: "private_show_access_required" });
        }
        inputId = room.cloudflare_live_input_id;
      } finally {
        await client.end();
      }
      try {
        const endpoints = await readWebRtcEndpoints(inputId);
        const signedPlaybackUrl = createSignedWebRtcPlaybackUrl(
          endpoints.playbackUrl,
          inputId,
        );
        const exchange = await exchangeWebRtcOffer(signedPlaybackUrl, offerSdp);
        const sessionId = crypto.randomUUID();
        webRtcResources.set(sessionId, {
          resourceUrl: exchange.resourceUrl,
          roomSlug: request.params.slug,
          userId: user?.id ?? null,
          kind: "playback",
          expiresAt: Date.now() + playbackResourceTtlMilliseconds,
        });
        reply.header("cache-control", "no-store");
        return { sessionId, answerSdp: exchange.answerSdp };
      } catch {
        return reply.code(503).send({ error: "webrtc_service_unavailable" });
      }
    },
  );
  api.delete<{ Params: { slug: string; sessionId: string } }>(
    "/api/rooms/:slug/webrtc/play/:sessionId",
    async (request, reply) => {
      const user = await currentUser(request);
      const resource = webRtcResources.get(request.params.sessionId);
      if (
        !resource ||
        resource.kind !== "playback" ||
        resource.roomSlug !== request.params.slug ||
        resource.userId !== (user?.id ?? null)
      )
        return reply.code(404).send({ error: "playback_session_not_found" });
      webRtcResources.delete(request.params.sessionId);
      await endWebRtcResource(resource.resourceUrl);
      return reply.code(204).send();
    },
  );
  api.patch<{ Params: { slug: string; sessionId: string } }>(
    "/api/rooms/:slug/webrtc/play/:sessionId",
    async (request, reply) => {
      const user = await currentUser(request);
      const resource = webRtcResources.get(request.params.sessionId);
      if (
        !resource ||
        resource.kind !== "playback" ||
        resource.roomSlug !== request.params.slug ||
        resource.userId !== (user?.id ?? null)
      )
        return reply.code(404).send({ error: "playback_session_not_found" });
      resource.expiresAt = Date.now() + playbackResourceTtlMilliseconds;
      return reply.code(204).send();
    },
  );
  api.get<{ Params: { slug: string } }>(
    "/api/rooms/:slug/playback",
    async (request, reply) => {
      const user = await currentUser(request);
      const client = database();
      await client.connect();
      try {
        const publicRoom = await client.query(
          "SELECT r.id FROM live_rooms r JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' WHERE r.slug=$1 AND r.publication_status='published'",
          [request.params.slug],
        );
        if (!publicRoom.rows[0]) return reply.code(404).send({ error: "room_not_found" });
        const result = await client.query<{
          cloudflare_live_input_id: string | null;
          broadcast_state: string;
          broadcast_transport: BroadcastTransport;
        }>(
          "SELECT r.cloudflare_live_input_id,r.broadcast_state,r.broadcast_transport FROM live_rooms r JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' WHERE r.slug=$1 AND r.publication_status='published'",
          [request.params.slug],
        );
        const room = result.rows[0];
        if (!room) return reply.code(404).send({ error: "room_not_found" });
        if (room.broadcast_state !== "live" || !room.cloudflare_live_input_id)
          return reply.code(409).send({ error: "room_not_live" });
        if (room.broadcast_transport !== "obs_hls")
          return reply.code(409).send({ error: "webrtc_playback_required" });
        const privateShow = await client.query<{ id: string }>(
          "SELECT s.id FROM private_show_sessions s JOIN live_rooms r ON r.id=s.room_id WHERE r.slug=$1 AND s.status='live'",
          [request.params.slug],
        );
        if (privateShow.rows[0] && (!user || user.role === "audience")) {
          if (!user)
            return reply.code(403).send({ error: "private_show_access_required" });
          const access = await client.query(
            "SELECT id FROM private_show_access WHERE session_id=$1 AND viewer_id=$2 AND (expires_at IS NULL OR expires_at > NOW())",
            [privateShow.rows[0].id, user.id],
          );
          if (!access.rows[0])
            return reply
              .code(403)
              .send({ error: "private_show_access_required" });
        }
        if (!hasCloudflareStreamConfiguration())
          return reply
            .code(503)
            .send({ error: "broadcast_service_unavailable" });
        try {
          return {
            iframeUrl: await createPlaybackUrl(room.cloudflare_live_input_id),
            expiresInSeconds: 3600,
          };
        } catch {
          return reply
            .code(503)
            .send({ error: "broadcast_service_unavailable" });
        }
      } finally {
        await client.end();
      }
    },
  );
  api.get("/api/wallet", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "demo_session_required" });
    const client = database();
    await client.connect();
    try {
      const result = await client.query<{ balance: string }>(
        "SELECT COALESCE(SUM(amount), 0)::text AS balance FROM wallet_ledger WHERE user_id = $1",
        [user.id],
      );
      return { balance: Number(result.rows[0].balance) };
    } finally {
      await client.end();
    }
  });
  api.get("/api/wallet/history", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "demo_session_required" });
    const client = database();
    await client.connect();
    try {
      const result = await client.query(
        "SELECT entry_type,amount,reference_type,created_at FROM wallet_ledger WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30",
        [user.id],
      );
      return { entries: result.rows };
    } finally {
      await client.end();
    }
  });
  api.get("/api/wallet/orders", async (request, reply) => {
    const user = (await requireRole(request, reply, "audience")) as DemoUser | undefined;
    if (!user) return;
    const client = database();
    await client.connect();
    try {
      const result = await client.query(
        "SELECT id,amount,created_at FROM test_credit_orders WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 30",
        [user.id],
      );
      return { packages: [100, 500, 1000, 5000], orders: result.rows };
    } finally {
      await client.end();
    }
  });
  api.post<{ Body: { amount?: number; idempotencyKey?: string } }>(
    "/api/wallet/orders",
    { schema: { body: mutationSchemas.testCreditOrder } },
    async (request, reply) => {
      const user = (await requireRole(request, reply, "audience")) as DemoUser | undefined;
      if (!user) return;
      const amount = request.body?.amount;
      const idempotencyKey = request.body?.idempotencyKey;
      if (!amount || !idempotencyKey)
        return reply.code(400).send({ error: "test_order_required" });
      const client = database();
      await client.connect();
      try {
        await client.query("BEGIN");
        const existing = await client.query<{ id: string; amount: number; created_at: Date }>(
          "SELECT id,amount,created_at FROM test_credit_orders WHERE idempotency_key=$1 AND user_id=$2",
          [idempotencyKey, user.id],
        );
        if (existing.rows[0]) {
          await client.query("COMMIT");
          return { order: existing.rows[0], duplicate: true };
        }
        const orderId = crypto.randomUUID();
        const created = await client.query<{ id: string; amount: number; created_at: Date }>(
          "INSERT INTO test_credit_orders (id,user_id,amount,idempotency_key) VALUES ($1,$2,$3,$4) RETURNING id,amount,created_at",
          [orderId, user.id, amount, idempotencyKey],
        );
        await client.query(
          "INSERT INTO wallet_ledger (id,user_id,entry_type,amount,idempotency_key,reference_type,reference_id) VALUES ($1,$2,'test_order_credit',$3,$4,'test_order',$5)",
          [crypto.randomUUID(), user.id, amount, `${idempotencyKey}:credit`, orderId],
        );
        await client.query("COMMIT");
        return { order: created.rows[0], duplicate: false };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        await client.end();
      }
    },
  );
  api.get<{ Querystring: { period?: string } }>(
    "/api/streamer/wallet/summary",
    async (request, reply) => {
      const streamer = (await requireRole(request, reply, "streamer")) as DemoUser | undefined;
      if (!streamer) return;
      const period = creatorWalletPeriod(request.query.period ?? "session");
      if (!period) return reply.code(400).send({ error: "invalid_wallet_period" });
      const client = database();
      await client.connect();
      try {
        const room = await client.query<{ id: string }>(
          "SELECT id FROM live_rooms WHERE streamer_id=$1",
          [streamer.id],
        );
        if (!room.rows[0]) return reply.code(404).send({ error: "streamer_room_not_found" });
        const bounds = await creatorPeriodBounds(client, room.rows[0].id, period);
        const [available, lifetime, selected] = await Promise.all([
          client.query<{ balance: number }>(
            "SELECT COALESCE(SUM(amount),0)::int AS balance FROM wallet_ledger WHERE user_id=$1",
            [streamer.id],
          ),
          client.query<{ total: number }>(
            "SELECT COALESCE(SUM(amount),0)::int AS total FROM wallet_ledger WHERE user_id=$1 AND amount>0 AND reference_type IN ('gift','room_action','private_show')",
            [streamer.id],
          ),
          bounds.from
            ? client.query<{ gift: number; action: number; private_show: number; transaction_count: number }>(
                "SELECT COALESCE(SUM(amount) FILTER (WHERE reference_type='gift'),0)::int AS gift,COALESCE(SUM(amount) FILTER (WHERE reference_type='room_action'),0)::int AS action,COALESCE(SUM(amount) FILTER (WHERE reference_type='private_show'),0)::int AS private_show,COUNT(*)::int AS transaction_count FROM wallet_ledger WHERE user_id=$1 AND amount>0 AND reference_type IN ('gift','room_action','private_show') AND created_at>=$2 AND ($3::timestamptz IS NULL OR created_at<$3)",
                [streamer.id, bounds.from, bounds.to],
              )
            : period === "session"
              ? Promise.resolve({ rows: [{ gift: 0, action: 0, private_show: 0, transaction_count: 0 }] })
              : client.query<{ gift: number; action: number; private_show: number; transaction_count: number }>(
                  "SELECT COALESCE(SUM(amount) FILTER (WHERE reference_type='gift'),0)::int AS gift,COALESCE(SUM(amount) FILTER (WHERE reference_type='room_action'),0)::int AS action,COALESCE(SUM(amount) FILTER (WHERE reference_type='private_show'),0)::int AS private_show,COUNT(*)::int AS transaction_count FROM wallet_ledger WHERE user_id=$1 AND amount>0 AND reference_type IN ('gift','room_action','private_show')",
                  [streamer.id],
                ),
        ]);
        const breakdown = selected.rows[0];
        return {
          period,
          from: bounds.from?.toISOString() ?? null,
          to: bounds.to?.toISOString() ?? null,
          generatedAt: new Date().toISOString(),
          availableBalance: available.rows[0].balance,
          lifetimeIncome: lifetime.rows[0].total,
          periodIncome: breakdown.gift + breakdown.action + breakdown.private_show,
          breakdown: {
            gift: breakdown.gift,
            action: breakdown.action,
            privateShow: breakdown.private_show,
          },
          transactionCount: breakdown.transaction_count,
        };
      } finally {
        await client.end();
      }
    },
  );
  api.get<{
    Querystring: { period?: string; type?: string; cursor?: string; limit?: string };
  }>(
    "/api/streamer/wallet/transactions",
    async (request, reply) => {
      const streamer = (await requireRole(request, reply, "streamer")) as DemoUser | undefined;
      if (!streamer) return;
      const period = creatorWalletPeriod(request.query.period ?? "session");
      const transactionType = creatorWalletType(request.query.type ?? "all");
      const rawLimit = Number(request.query.limit ?? 20);
      const limit = Number.isInteger(rawLimit) && rawLimit >= 1 && rawLimit <= 50 ? rawLimit : null;
      const cursor = request.query.cursor ? decodeCreatorWalletCursor(request.query.cursor) : null;
      if (!period) return reply.code(400).send({ error: "invalid_wallet_period" });
      if (!transactionType) return reply.code(400).send({ error: "invalid_wallet_type" });
      if (!limit) return reply.code(400).send({ error: "invalid_wallet_limit" });
      if (request.query.cursor && !cursor) return reply.code(400).send({ error: "invalid_wallet_cursor" });
      const client = database();
      await client.connect();
      try {
        const room = await client.query<{ id: string }>(
          "SELECT id FROM live_rooms WHERE streamer_id=$1",
          [streamer.id],
        );
        if (!room.rows[0]) return reply.code(404).send({ error: "streamer_room_not_found" });
        const bounds = await creatorPeriodBounds(client, room.rows[0].id, period);
        if (period === "session" && !bounds.from) return { period, transactions: [], nextCursor: null };
        const result = await client.query<{
          id: string;
          amount: number;
          reference_type: string;
          created_at: Date;
          supporter: string | null;
          label_en: string | null;
          label_zh: string | null;
          quantity: number | null;
          room_slug: string | null;
          room_title: string | null;
        }>(
          "SELECT w.id,w.amount,w.reference_type,w.created_at,COALESCE(gs.display_name,asu.display_name,psu.display_name) AS supporter,CASE WHEN w.reference_type='gift' THEN gc.name_en WHEN w.reference_type='room_action' THEN ra.title WHEN w.reference_type='private_show' THEN 'Private show access' END AS label_en,CASE WHEN w.reference_type='gift' THEN gc.name_zh WHEN w.reference_type='room_action' THEN ra.title WHEN w.reference_type='private_show' THEN '私密直播访问' END AS label_zh,CASE WHEN w.reference_type='gift' THEN g.quantity ELSE 1 END AS quantity,COALESCE(gr.slug,ar.slug,pr.slug) AS room_slug,COALESCE(gr.title,ar.title,pr.title) AS room_title FROM wallet_ledger w LEFT JOIN gifts g ON w.reference_type='gift' AND g.id=w.reference_id LEFT JOIN gift_catalog gc ON gc.id=g.gift_id LEFT JOIN users gs ON gs.id=g.sender_id LEFT JOIN live_rooms gr ON gr.id=g.room_id LEFT JOIN room_action_purchases rap ON w.reference_type='room_action' AND rap.id=w.reference_id LEFT JOIN room_actions ra ON ra.id=rap.action_id LEFT JOIN users asu ON asu.id=rap.viewer_id LEFT JOIN live_rooms ar ON ar.id=ra.room_id LEFT JOIN private_show_access psa ON w.reference_type='private_show' AND psa.id=w.reference_id LEFT JOIN private_show_sessions pss ON pss.id=psa.session_id LEFT JOIN users psu ON psu.id=psa.viewer_id LEFT JOIN live_rooms pr ON pr.id=pss.room_id WHERE w.user_id=$1 AND w.amount>0 AND w.reference_type IN ('gift','room_action','private_show') AND ($2::timestamptz IS NULL OR w.created_at>=$2) AND ($3::timestamptz IS NULL OR w.created_at<$3) AND ($4='all' OR ($4='gift' AND w.reference_type='gift') OR ($4='action' AND w.reference_type='room_action') OR ($4='private_show' AND w.reference_type='private_show')) AND ($5::timestamptz IS NULL OR (w.created_at,w.id)<($5::timestamptz,$6::uuid)) ORDER BY w.created_at DESC,w.id DESC LIMIT $7",
          [streamer.id, bounds.from, bounds.to, transactionType, cursor?.createdAt ?? null, cursor?.id ?? null, limit + 1],
        );
        const hasMore = result.rows.length > limit;
        const rows = result.rows.slice(0, limit);
        return {
          period,
          transactions: rows.map((row) => ({
            id: row.id,
            amount: row.amount,
            type: row.reference_type === "room_action" ? "action" : row.reference_type,
            createdAt: row.created_at.toISOString(),
            supporter: row.supporter ?? "Viewer",
            label: { en: row.label_en ?? "Support", zh: row.label_zh ?? "支持" },
            quantity: row.quantity ?? 1,
            room: row.room_slug ? { slug: row.room_slug, title: row.room_title } : null,
            status: "completed",
          })),
          nextCursor: hasMore && rows.length
            ? encodeCreatorWalletCursor(rows[rows.length - 1].created_at, rows[rows.length - 1].id)
            : null,
        };
      } finally {
        await client.end();
      }
    },
  );
  api.get<{
    Params: { slug: string };
    Querystring: { period?: string; kind?: string };
  }>(
    "/api/streamer/rooms/:slug/supporters",
    async (request, reply) => {
      const streamer = (await requireRole(request, reply, "streamer")) as DemoUser | undefined;
      if (!streamer) return;
      const period = creatorWalletPeriod(request.query.period ?? "session");
      const kind = request.query.kind ?? "all";
      if (!period) return reply.code(400).send({ error: "invalid_supporter_period" });
      if (kind !== "all" && kind !== "gift") return reply.code(400).send({ error: "invalid_supporter_kind" });
      const client = database();
      await client.connect();
      try {
        const room = await client.query<{ id: string }>(
          "SELECT id FROM live_rooms WHERE slug=$1 AND streamer_id=$2",
          [request.params.slug, streamer.id],
        );
        if (!room.rows[0]) return reply.code(404).send({ error: "streamer_room_not_found" });
        const bounds = await creatorPeriodBounds(client, room.rows[0].id, period);
        if (period === "session" && !bounds.from) return { period, kind, supporters: [] };
        const result = await client.query(
          "SELECT supporter_id,display_name,COALESCE(SUM(amount) FILTER (WHERE support_type='gift'),0)::int AS gift_total,COALESCE(SUM(amount) FILTER (WHERE support_type='action'),0)::int AS action_total,COALESCE(SUM(amount) FILTER (WHERE support_type='private_show'),0)::int AS private_show_total,COALESCE(SUM(quantity) FILTER (WHERE support_type='gift'),0)::int AS gift_quantity,SUM(amount)::int AS total_support,COUNT(*)::int AS support_count,MAX(created_at) AS last_supported_at FROM (SELECT g.sender_id AS supporter_id,u.display_name,g.coin_cost AS amount,g.quantity,'gift'::text AS support_type,g.created_at FROM gifts g JOIN users u ON u.id=g.sender_id WHERE g.room_id=$1 AND ($2::timestamptz IS NULL OR g.created_at>=$2) AND ($3::timestamptz IS NULL OR g.created_at<$3) UNION ALL SELECT p.viewer_id,u.display_name,p.coin_cost,1,'action'::text,p.created_at FROM room_action_purchases p JOIN room_actions a ON a.id=p.action_id JOIN users u ON u.id=p.viewer_id WHERE a.room_id=$1 AND $4='all' AND ($2::timestamptz IS NULL OR p.created_at>=$2) AND ($3::timestamptz IS NULL OR p.created_at<$3) UNION ALL SELECT pa.viewer_id,u.display_name,CASE WHEN ps.mode='ticket' THEN ps.ticket_cost ELSE ps.per_minute_cost END,1,'private_show'::text,pa.purchased_at FROM private_show_access pa JOIN private_show_sessions ps ON ps.id=pa.session_id JOIN users u ON u.id=pa.viewer_id WHERE ps.room_id=$1 AND $4='all' AND ($2::timestamptz IS NULL OR pa.purchased_at>=$2) AND ($3::timestamptz IS NULL OR pa.purchased_at<$3)) support GROUP BY supporter_id,display_name ORDER BY total_support DESC,support_count DESC,last_supported_at DESC LIMIT 25",
          [room.rows[0].id, bounds.from, bounds.to, kind],
        );
        return {
          period,
          kind,
          from: bounds.from?.toISOString() ?? null,
          to: bounds.to?.toISOString() ?? null,
          supporters: result.rows.map((row: any) => ({
            displayName: row.display_name,
            giftTotal: row.gift_total,
            actionTotal: row.action_total,
            privateShowTotal: row.private_show_total,
            giftQuantity: row.gift_quantity,
            totalSupport: row.total_support,
            supportCount: row.support_count,
            lastSupportedAt: row.last_supported_at,
          })),
        };
      } finally {
        await client.end();
      }
    },
  );
  api.get("/api/gifts", async () => {
    const client = database();
    await client.connect();
    try {
      const result = await client.query(
          "SELECT id,name_en,name_zh,coin_cost,animation_key,symbol,animation_tier,display_order FROM gift_catalog WHERE is_active=TRUE ORDER BY display_order,coin_cost LIMIT 100",
      );
      return { gifts: result.rows };
    } finally {
      await client.end();
    }
  });
  api.get<{ Params: { slug: string } }>(
    "/api/rooms/:slug/actions",
    async (request, reply) => {
      const client = database();
      await client.connect();
      try {
        const publicRoom = await client.query(
          "SELECT r.id FROM live_rooms r JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' WHERE r.slug=$1 AND r.publication_status='published'",
          [request.params.slug],
        );
        if (!publicRoom.rows[0]) return reply.code(404).send({ error: "room_not_found" });
        const result = await client.query(
          "SELECT a.id,a.title,a.coin_cost,a.duration_label,a.display_order,r.goal_text,r.goal_target,r.goal_progress FROM room_actions a JOIN live_rooms r ON r.id=a.room_id JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' WHERE r.slug=$1 AND r.publication_status='published' AND a.is_active=TRUE ORDER BY a.display_order LIMIT 50",
          [request.params.slug],
        );
        if (!result.rows.length) {
          const room = await client.query(
            "SELECT r.goal_text,r.goal_target,r.goal_progress FROM live_rooms r JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' WHERE r.slug=$1 AND r.publication_status='published'",
            [request.params.slug],
          );
          if (!room.rows[0])
            return reply.code(404).send({ error: "room_not_found" });
          return { actions: [], goal: room.rows[0] };
        }
        return { actions: result.rows, goal: result.rows[0] };
      } finally {
        await client.end();
      }
    },
  );
  api.post<{
    Params: { slug: string; actionId: string };
    Body: { idempotencyKey?: string };
  }>(
    "/api/rooms/:slug/actions/:actionId/purchase",
    { schema: { body: mutationSchemas.idempotentPurchase } },
    async (request, reply) => {
    const viewer = (await requireRole(request, reply, "audience")) as
      DemoUser | undefined;
    if (!viewer) return;
    const key = request.body?.idempotencyKey;
    if (!key)
      return reply.code(400).send({ error: "idempotency_key_required" });
    const client = database();
    await client.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);
      const existing = await client.query(
        "SELECT id FROM room_action_purchases WHERE idempotency_key=$1",
        [key],
      );
      if (existing.rows[0]) {
        await client.query("COMMIT");
        return { duplicate: true };
      }
      const action = await client.query<{
        id: string;
        coin_cost: number;
        title: string;
        streamer_id: string;
        room_id: string;
        broadcast_state: string;
      }>(
        "SELECT a.id,a.coin_cost,a.title,r.streamer_id,r.id room_id,r.broadcast_state FROM room_actions a JOIN live_rooms r ON r.id=a.room_id JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' WHERE r.slug=$1 AND r.publication_status='published' AND a.id=$2 AND a.is_active=TRUE FOR UPDATE OF a,r",
        [request.params.slug, request.params.actionId],
      );
      const item = action.rows[0];
      if (!item) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "action_not_found" });
      }
      if (item.broadcast_state !== "live") {
        await client.query("ROLLBACK");
        return reply.code(409).send({ error: "broadcast_not_live" });
      }
      const balance = await client.query<{ balance: string }>(
        "SELECT COALESCE(SUM(amount),0)::text balance FROM (SELECT amount FROM wallet_ledger WHERE user_id=$1 FOR UPDATE) AS locked_entries",
        [viewer.id],
      );
      if (Number(balance.rows[0].balance) < item.coin_cost) {
        await client.query("ROLLBACK");
        return reply.code(409).send({ error: "insufficient_test_coins" });
      }
      const id = crypto.randomUUID();
      await client.query(
        "INSERT INTO room_action_purchases (id,action_id,viewer_id,coin_cost,idempotency_key) VALUES ($1,$2,$3,$4,$5)",
        [id, item.id, viewer.id, item.coin_cost, key],
      );
      await client.query(
        "INSERT INTO wallet_ledger (id,user_id,entry_type,amount,idempotency_key,reference_type,reference_id) VALUES ($1,$2,'gift_sent',$3,$4,'room_action',$5),($6,$7,'gift_received',$8,$9,'room_action',$5)",
        [
          crypto.randomUUID(),
          viewer.id,
          -item.coin_cost,
          `${key}:viewer`,
          id,
          crypto.randomUUID(),
          item.streamer_id,
          item.coin_cost,
          `${key}:streamer`,
        ],
      );
      const goal = await client.query(
        "UPDATE live_rooms SET goal_progress=goal_progress+$1 WHERE id=$2 RETURNING goal_text,goal_target,goal_progress",
        [item.coin_cost, item.room_id],
      );
      await client.query("COMMIT");
      const event = {
        id,
        title: item.title,
        cost: item.coin_cost,
        sender: viewer.displayName,
        goal: goal.rows[0],
      };
      realtime
        ?.to(`room:${request.params.slug}`)
        .emit("action:purchased", event);
      return { action: event };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      await client.end();
    }
    },
  );
  api.post<{
    Params: { slug: string };
    Body: {
      giftId?: string;
      idempotencyKey?: string;
      quantity?: number;
      confirmedHighValue?: boolean;
    };
  }>(
    "/api/rooms/:slug/gifts",
    { schema: { body: mutationSchemas.giftPurchase } },
    async (request, reply) => {
    const sender = (await requireRole(request, reply, "audience")) as
      DemoUser | undefined;
    if (!sender) return;
    const giftId = request.body?.giftId;
    const idempotencyKey = request.body?.idempotencyKey;
    const quantity = request.body?.quantity ?? 1;
    if (!giftId || !idempotencyKey)
      return reply
        .code(400)
        .send({ error: "gift_and_idempotency_key_required" });
    const client = database();
    await client.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        idempotencyKey,
      ]);
      const existing = await client.query(
        "SELECT id FROM gifts WHERE idempotency_key = $1",
        [idempotencyKey],
      );
      if (existing.rows[0]) {
        await client.query("COMMIT");
        return { duplicate: true };
      }
      const room = await client.query<{ id: string; streamer_id: string; broadcast_state: string }>(
        "SELECT r.id,r.streamer_id,r.broadcast_state FROM live_rooms r JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' WHERE r.slug=$1 AND r.publication_status='published' FOR UPDATE OF r",
        [request.params.slug],
      );
      const gift = await client.query<{
        id: string;
        coin_cost: number;
        name_en: string;
        name_zh: string;
        animation_key: string;
        symbol: string;
        animation_tier: "small" | "highlight" | "celebration" | "premium";
      }>(
        "SELECT id,coin_cost,name_en,name_zh,animation_key,symbol,animation_tier FROM gift_catalog WHERE id=$1 AND is_active=TRUE",
        [giftId],
      );
      if (!room.rows[0] || !gift.rows[0]) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "room_or_gift_not_found" });
      }
      if (room.rows[0].streamer_id === sender.id) {
        await client.query("ROLLBACK");
        return reply.code(400).send({ error: "cannot_gift_self" });
      }
      if (room.rows[0].broadcast_state !== "live") {
        await client.query("ROLLBACK");
        return reply.code(409).send({ error: "broadcast_not_live" });
      }
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        `${room.rows[0].id}:${sender.id}:${giftId}:gift-combo`,
      ]);
      const previousCombo = await client.query<{
        combo_count: number;
        combo_expires_at: Date | null;
      }>(
        `SELECT combo_count,combo_expires_at FROM gifts
         WHERE room_id=$1 AND sender_id=$2 AND gift_id=$3
         ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
        [room.rows[0].id, sender.id, giftId],
      );
      const comboCount =
        previousCombo.rows[0]?.combo_expires_at &&
        previousCombo.rows[0].combo_expires_at.getTime() > Date.now()
          ? Math.min(10_000, previousCombo.rows[0].combo_count + quantity)
          : quantity;
      const totalCost = gift.rows[0].coin_cost * quantity;
      if (totalCost >= 1_000 && request.body?.confirmedHighValue !== true) {
        await client.query("ROLLBACK");
        return reply
          .code(400)
          .send({ error: "high_value_confirmation_required" });
      }
      const balance = await client.query<{ balance: string }>(
        "SELECT COALESCE(SUM(amount), 0)::text AS balance FROM (SELECT amount FROM wallet_ledger WHERE user_id = $1 FOR UPDATE) AS locked_entries",
        [sender.id],
      );
      if (Number(balance.rows[0].balance) < totalCost) {
        await client.query("ROLLBACK");
        return reply.code(409).send({ error: "insufficient_test_coins" });
      }
      const id = crypto.randomUUID();
      await client.query(
        "INSERT INTO gifts (id,room_id,sender_id,recipient_id,gift_id,coin_cost,idempotency_key,quantity,combo_count,combo_expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()+INTERVAL '10 seconds')",
        [
          id,
          room.rows[0].id,
          sender.id,
          room.rows[0].streamer_id,
          giftId,
          totalCost,
          idempotencyKey,
          quantity,
          comboCount,
        ],
      );
      await client.query(
        "INSERT INTO wallet_ledger (id,user_id,entry_type,amount,idempotency_key,reference_type,reference_id) VALUES ($1,$2,'gift_sent',$3,$4,'gift',$5),($6,$7,'gift_received',$8,$9,'gift',$5)",
        [
          crypto.randomUUID(),
          sender.id,
          -totalCost,
          `${idempotencyKey}:sent`,
          id,
          crypto.randomUUID(),
          room.rows[0].streamer_id,
          totalCost,
          `${idempotencyKey}:received`,
        ],
      );
      const goal = await client.query(
        "UPDATE live_rooms SET goal_progress=goal_progress+$1 WHERE id=$2 RETURNING goal_text,goal_target,goal_progress",
        [totalCost, room.rows[0].id],
      );
      await client.query("COMMIT");
      const event = {
        eventId: id,
        giftTransactionId: id,
        giftId: gift.rows[0].id,
        name: gift.rows[0].name_en,
        nameEn: gift.rows[0].name_en,
        nameZh: gift.rows[0].name_zh,
        symbol: gift.rows[0].symbol,
        unitCost: gift.rows[0].coin_cost,
        quantity,
        comboCount,
        comboWindowSeconds: 10,
        cost: totalCost,
        animationKey: gift.rows[0].animation_key,
        animationTier: gift.rows[0].animation_tier,
        sender: sender.displayName,
        goal: goal.rows[0],
      };
      realtime?.to(`room:${request.params.slug}`).emit("gift:sent", event);
      return { gift: event };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await client.end();
    }
    },
  );
  api.post<{
    Params: { slug: string; giftTransactionId: string };
    Body: { message?: "thank_you" | "celebrate" };
  }>(
    "/api/streamer/rooms/:slug/gifts/:giftTransactionId/acknowledge",
    async (request, reply) => {
      const creator = (await requireRole(request, reply, "streamer")) as
        | DemoUser
        | undefined;
      if (!creator) return;
      const message = request.body?.message ?? "thank_you";
      if (!["thank_you", "celebrate"].includes(message))
        return reply.code(400).send({ error: "invalid_acknowledgement" });
      const client = database();
      await client.connect();
      try {
        const gift = await client.query<{
          id: string;
          sender_name: string;
        }>(
          `SELECT g.id,u.display_name AS sender_name
           FROM gifts g
           JOIN live_rooms r ON r.id=g.room_id
           JOIN users u ON u.id=g.sender_id
           WHERE g.id=$1 AND r.slug=$2 AND r.streamer_id=$3`,
          [request.params.giftTransactionId, request.params.slug, creator.id],
        );
        if (!gift.rows[0])
          return reply.code(404).send({ error: "gift_not_found" });
        const id = crypto.randomUUID();
        const inserted = await client.query(
          `INSERT INTO gift_acknowledgements (id,gift_id,creator_id,message_key)
           VALUES ($1,$2,$3,$4) ON CONFLICT (gift_id) DO NOTHING RETURNING id`,
          [id, gift.rows[0].id, creator.id, message],
        );
        if (!inserted.rows[0]) return { duplicate: true };
        const event = {
          acknowledgementId: id,
          giftTransactionId: gift.rows[0].id,
          creator: creator.displayName,
          sender: gift.rows[0].sender_name,
          message,
        };
        realtime
          ?.to(`room:${request.params.slug}`)
          .emit("gift:acknowledged", event);
        return { acknowledgement: event };
      } finally {
        await client.end();
      }
    },
  );
  api.post<{
    Params: { slug: string };
    Body: {
      targetId?: string;
      action?: "mute" | "ban" | "unmute" | "unban";
      reason?: string;
    };
  }>("/api/admin/rooms/:slug/moderation", async (request, reply) => {
    const admin = (await requireRole(request, reply, "admin")) as
      DemoUser | undefined;
    if (!admin) return;
    const { targetId, action, reason } = request.body ?? {};
    const normalizedReason = reason?.trim();
    if (
      !targetId ||
      !action ||
      !["mute", "ban", "unmute", "unban"].includes(action) ||
      !normalizedReason ||
      normalizedReason.length < 2 ||
      normalizedReason.length > 500
    )
      return reply.code(400).send({ error: "invalid_moderation_action" });
    const client = database();
    await client.connect();
    try {
      const room = await client.query<{ id: string }>(
        "SELECT id FROM live_rooms WHERE slug = $1",
        [request.params.slug],
      );
      if (!room.rows[0])
        return reply.code(404).send({ error: "room_not_found" });
      const flag =
        action === "mute" || action === "unmute" ? "is_muted" : "is_banned";
      const value = action === "mute" || action === "ban";
      const target = await client.query<{ id: string; display_name: string }>(
        `UPDATE users SET ${flag} = $1, updated_at = NOW() WHERE id = $2 AND role<>'admin' RETURNING id, display_name`,
        [value, targetId],
      );
      if (!target.rows[0])
        return reply.code(404).send({ error: "target_not_found" });
      await client.query(
        "INSERT INTO moderation_events (id, room_id, actor_id, target_id, action, reason) VALUES ($1,$2,$3,$4,$5,$6)",
        [
          crypto.randomUUID(),
          room.rows[0].id,
          admin.id,
          targetId,
          action,
          normalizedReason,
        ],
      );
      const event = {
        action,
        targetId,
        targetName: target.rows[0].display_name,
        reason: normalizedReason,
      };
      realtime
        ?.to(`room:${request.params.slug}`)
        .emit("moderation:action", event);
      return { event };
    } finally {
      await client.end();
    }
  });
  api.post<{
    Params: { slug: string };
    Body: {
      targetId?: string;
      messageId?: string;
      action?: "mute" | "unmute" | "timeout" | "ban" | "unban" | "delete";
      durationSeconds?: number;
    };
  }>("/api/streamer/rooms/:slug/moderation", async (request, reply) => {
    const streamer = (await requireRole(request, reply, "streamer")) as
      DemoUser | undefined;
    if (!streamer) return;
    const { targetId, messageId, action, durationSeconds } = request.body ?? {};
    if (!action || !["mute", "unmute", "timeout", "ban", "unban", "delete"].includes(action))
      return reply
        .code(400)
        .send({ error: "invalid_creator_moderation_action" });
    const client = database();
    await client.connect();
    try {
      const room = await client.query<{ id: string }>(
        "SELECT id FROM live_rooms WHERE slug=$1 AND streamer_id=$2",
        [request.params.slug, streamer.id],
      );
      if (!room.rows[0])
        return reply.code(404).send({ error: "streamer_room_not_found" });
      if (action === "delete") {
        if (!messageId) return reply.code(400).send({ error: "message_id_required" });
        const deleted = await client.query<{ id: string; sender_id: string; display_name: string }>(
          "UPDATE chat_messages m SET deleted_at=NOW(),deleted_by=$1 FROM users u WHERE m.id=$2 AND m.room_id=$3 AND m.deleted_at IS NULL AND u.id=m.sender_id RETURNING m.id,m.sender_id,u.display_name",
          [streamer.id, messageId, room.rows[0].id],
        );
        if (!deleted.rows[0]) return reply.code(404).send({ error: "chat_message_not_found" });
        await client.query(
          "INSERT INTO moderation_events (id,room_id,actor_id,target_id,action,reason) VALUES ($1,$2,$3,$4,$5,$6)",
          [crypto.randomUUID(), room.rows[0].id, streamer.id, deleted.rows[0].sender_id, "creator_delete_message", "creator live-chat moderation"],
        );
        const event = { action: "creator_delete_message", messageId, targetId: deleted.rows[0].sender_id, targetName: deleted.rows[0].display_name };
        realtime?.to(`room:${request.params.slug}`).emit("chat:deleted", event);
        return { event };
      }
      if (!targetId) return reply.code(400).send({ error: "audience_target_required" });
      const target = await client.query<{ display_name: string }>(
        "SELECT display_name FROM users WHERE id=$1 AND role='audience'",
        [targetId],
      );
      if (!target.rows[0])
        return reply.code(404).send({ error: "audience_target_not_found" });
      const timeoutSeconds = action === "timeout" ? Math.min(86_400, Math.max(30, Math.round(durationSeconds ?? 600))) : null;
      const muted = action === "mute" || action === "timeout";
      const banned = action === "ban";
      await client.query(
        "INSERT INTO room_moderation_restrictions (room_id,user_id,is_muted,is_banned,muted_until) VALUES ($1,$2,$3,$4,CASE WHEN $5::int IS NULL THEN NULL ELSE NOW()+($5::text || ' seconds')::interval END) ON CONFLICT (room_id,user_id) DO UPDATE SET is_muted=CASE WHEN $6 IN ('mute','timeout') THEN TRUE WHEN $6='unmute' THEN FALSE ELSE room_moderation_restrictions.is_muted END,is_banned=CASE WHEN $6='ban' THEN TRUE WHEN $6='unban' THEN FALSE ELSE room_moderation_restrictions.is_banned END,muted_until=CASE WHEN $6='timeout' THEN NOW()+($5::text || ' seconds')::interval WHEN $6 IN ('mute','unmute') THEN NULL ELSE room_moderation_restrictions.muted_until END,updated_at=NOW()",
        [room.rows[0].id, targetId, muted, banned, timeoutSeconds, action],
      );
      await client.query(
        "INSERT INTO moderation_events (id,room_id,actor_id,target_id,action,reason) VALUES ($1,$2,$3,$4,$5,$6)",
        [
          crypto.randomUUID(),
          room.rows[0].id,
          streamer.id,
          targetId,
          `creator_${action}`,
          action === "timeout" ? `timeout_${timeoutSeconds}_seconds` : "creator live-chat moderation",
        ],
      );
      const event = {
        action: `creator_${action}`,
        targetId,
        targetName: target.rows[0].display_name,
      };
      realtime
        ?.to(`room:${request.params.slug}`)
        .emit("moderation:action", event);
      return { event };
    } finally {
      await client.end();
    }
  });
  api.put<{
    Params: { slug: string };
    Body: { slowModeSeconds?: number; blockedTerms?: string[] };
  }>("/api/streamer/rooms/:slug/chat-settings", async (request, reply) => {
    const streamer = (await requireRole(request, reply, "streamer")) as DemoUser | undefined;
    if (!streamer) return;
    const slowModeSeconds = request.body?.slowModeSeconds;
    const blockedTerms = request.body?.blockedTerms?.map((term) => term.trim().toLocaleLowerCase()).filter(Boolean);
    if (
      (slowModeSeconds === undefined && blockedTerms === undefined) ||
      (slowModeSeconds !== undefined && (!Number.isInteger(slowModeSeconds) || slowModeSeconds < 0 || slowModeSeconds > 300)) ||
      (blockedTerms && (blockedTerms.length > 50 || blockedTerms.some((term) => term.length > 60)))
    ) return reply.code(400).send({ error: "invalid_chat_settings" });
    const client = database();
    await client.connect();
    try {
      const result = await client.query(
        "UPDATE live_rooms SET chat_slow_mode_seconds=COALESCE($1,chat_slow_mode_seconds),blocked_terms=COALESCE($2,blocked_terms),updated_at=NOW() WHERE slug=$3 AND streamer_id=$4 RETURNING chat_slow_mode_seconds,blocked_terms",
        [slowModeSeconds ?? null, blockedTerms ? Array.from(new Set(blockedTerms)) : null, request.params.slug, streamer.id],
      );
      if (!result.rows[0]) return reply.code(404).send({ error: "streamer_room_not_found" });
      const event = { slowModeSeconds: result.rows[0].chat_slow_mode_seconds, blockedTermsCount: result.rows[0].blocked_terms.length };
      realtime?.to(`room:${request.params.slug}`).emit("chat:settings", event);
      return { settings: result.rows[0] };
    } finally {
      await client.end();
    }
  });
  api.put<{
    Params: { slug: string };
    Body: {
      active?: boolean;
      mode?: "ticket" | "per_minute";
      ticketCost?: number;
      perMinuteCost?: number;
    };
  }>("/api/streamer/rooms/:slug/private-show", async (request, reply) => {
    const streamer = (await requireRole(request, reply, "streamer")) as
      DemoUser | undefined;
    if (!streamer) return;
    const body = request.body ?? {};
    const mode = body.mode ?? "ticket";
    const ticketCost = body.ticketCost ?? 100;
    const perMinuteCost = body.perMinuteCost ?? 10;
    if (
      !["ticket", "per_minute"].includes(mode) ||
      ticketCost < 1 ||
      perMinuteCost < 1
    )
      return reply.code(400).send({ error: "invalid_private_show_settings" });
    const client = database();
    await client.connect();
    try {
      const room = await client.query<{ id: string }>(
        "SELECT id FROM live_rooms WHERE slug = $1 AND streamer_id = $2",
        [request.params.slug, streamer.id],
      );
      if (!room.rows[0])
        return reply.code(404).send({ error: "streamer_room_not_found" });
      await client.query(
        "UPDATE live_rooms SET private_show_enabled = $1, private_show_mode = $2, private_show_ticket_cost = $3, private_show_per_minute_cost = $4, updated_at = NOW() WHERE id = $5",
        [
          Boolean(body.active),
          mode,
          ticketCost,
          perMinuteCost,
          room.rows[0].id,
        ],
      );
      if (body.active) {
        await client.query(
          "UPDATE private_show_sessions SET status = 'ended', ended_at = NOW() WHERE room_id = $1 AND status = 'live'",
          [room.rows[0].id],
        );
        await client.query(
          "INSERT INTO private_show_sessions (id, room_id, mode, ticket_cost, per_minute_cost, status, started_at) VALUES ($1,$2,$3,$4,$5,'live',NOW())",
          [
            crypto.randomUUID(),
            room.rows[0].id,
            mode,
            ticketCost,
            perMinuteCost,
          ],
        );
      } else
        await client.query(
          "UPDATE private_show_sessions SET status = 'ended', ended_at = NOW() WHERE room_id = $1 AND status = 'live'",
          [room.rows[0].id],
        );
      realtime?.to(`room:${request.params.slug}`).emit("private-show:state", {
        active: Boolean(body.active),
        mode,
        ticketCost,
        perMinuteCost,
      });
      return { active: Boolean(body.active), mode, ticketCost, perMinuteCost };
    } finally {
      await client.end();
    }
  });
  api.get<{ Params: { slug: string } }>(
    "/api/rooms/:slug/private-show",
    async (request, reply) => {
      const viewer = await currentUser(request);
      const client = database();
      await client.connect();
      try {
        const publicRoom = await client.query(
          "SELECT r.id FROM live_rooms r JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' WHERE r.slug=$1 AND r.publication_status='published'",
          [request.params.slug],
        );
        if (!publicRoom.rows[0])
          return reply.code(404).send({ error: "room_not_found" });
        const result = await client.query<{
          id: string;
          mode: "ticket" | "per_minute";
          ticket_cost: number;
          per_minute_cost: number;
          status: string;
        }>(
          "SELECT s.id,s.mode,s.ticket_cost,s.per_minute_cost,s.status FROM private_show_sessions s JOIN live_rooms r ON r.id=s.room_id JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' WHERE r.slug=$1 AND r.publication_status='published' AND s.status='live'",
          [request.params.slug],
        );
        const session = result.rows[0];
        if (!session) return { active: false };
        const access = viewer
          ? await client.query<{ expires_at: Date | null }>(
              "SELECT expires_at FROM private_show_access WHERE session_id=$1 AND viewer_id=$2 AND (expires_at IS NULL OR expires_at > NOW())",
              [session.id, viewer.id],
            )
          : { rows: [] as { expires_at: Date | null }[] };
        return {
          active: true,
          session: {
            ...session,
            hasAccess: Boolean(access.rows[0]),
            expiresAt: access.rows[0]?.expires_at?.toISOString() ?? null,
          },
        };
      } finally {
        await client.end();
      }
    },
  );
  api.post<{ Params: { slug: string }; Body: { idempotencyKey?: string } }>(
    "/api/rooms/:slug/private-show/purchase",
    { schema: { body: mutationSchemas.idempotentPurchase } },
    async (request, reply) => {
      const viewer = (await requireRole(request, reply, "audience")) as
        DemoUser | undefined;
      if (!viewer) return;
      const key = request.body?.idempotencyKey;
      if (!key)
        return reply.code(400).send({ error: "idempotency_key_required" });
      const client = database();
      await client.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);
        const existing = await client.query(
          "SELECT id FROM private_show_access WHERE idempotency_key=$1",
          [key],
        );
        if (existing.rows[0]) {
          await client.query("COMMIT");
          return { duplicate: true };
        }
        const session = await client.query<{
          id: string;
          mode: "ticket" | "per_minute";
          ticket_cost: number;
          per_minute_cost: number;
          streamer_id: string;
        }>(
          "SELECT s.id,s.mode,s.ticket_cost,s.per_minute_cost,r.streamer_id FROM private_show_sessions s JOIN live_rooms r ON r.id=s.room_id JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' WHERE r.slug=$1 AND r.publication_status='published' AND s.status='live' FOR UPDATE OF s,r",
          [request.params.slug],
        );
        const show = session.rows[0];
        if (!show) {
          await client.query("ROLLBACK");
          return reply.code(409).send({ error: "private_show_not_active" });
        }
        const cost =
          show.mode === "ticket" ? show.ticket_cost : show.per_minute_cost;
        const balance = await client.query<{ balance: string }>(
          "SELECT COALESCE(SUM(amount),0)::text AS balance FROM (SELECT amount FROM wallet_ledger WHERE user_id=$1 FOR UPDATE) entries",
          [viewer.id],
        );
        if (Number(balance.rows[0].balance) < cost) {
          await client.query("ROLLBACK");
          return reply.code(409).send({ error: "insufficient_test_coins" });
        }
        const accessId = crypto.randomUUID();
        const expiry =
          show.mode === "per_minute" ? new Date(Date.now() + 60_000) : null;
        await client.query(
          "INSERT INTO private_show_access (id,session_id,viewer_id,expires_at,idempotency_key) VALUES ($1,$2,$3,$4,$5)",
          [accessId, show.id, viewer.id, expiry, key],
        );
        await client.query(
          "INSERT INTO wallet_ledger (id,user_id,entry_type,amount,idempotency_key,reference_type,reference_id) VALUES ($1,$2,'gift_sent',$3,$4,'private_show',$5),($6,$7,'gift_received',$8,$9,'private_show',$5)",
          [
            crypto.randomUUID(),
            viewer.id,
            -cost,
            `${key}:viewer`,
            accessId,
            crypto.randomUUID(),
            show.streamer_id,
            cost,
            `${key}:streamer`,
          ],
        );
        await client.query("COMMIT");
        realtime
          ?.to(`room:${request.params.slug}`)
          .emit("private-show:purchase", {
            viewer: viewer.displayName,
            mode: show.mode,
          });
        return { access: true, expiresAt: expiry, cost };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        await client.end();
      }
    },
  );
  api.get<{ Params: { slug: string } }>(
    "/api/admin/rooms/:slug/moderation",
    async (request, reply) => {
      const admin = await requireRole(request, reply, "admin");
      if (!admin) return;
      const client = database();
      await client.connect();
      try {
        const result = await client.query(
          "SELECT m.action, m.reason, m.created_at, u.display_name AS target_name FROM moderation_events m JOIN live_rooms r ON r.id = m.room_id LEFT JOIN users u ON u.id = m.target_id WHERE r.slug = $1 ORDER BY m.created_at DESC LIMIT 100",
          [request.params.slug],
        );
        return { events: result.rows };
      } finally {
        await client.end();
      }
    },
  );
  api.get("/api/streamer/studio", async (request, reply) => {
    const user = (await requireRole(request, reply, "streamer")) as
      DemoUser | undefined;
    if (!user) return;
    const client = database();
    await client.connect();
    try {
      const result = await client.query(
        `SELECT r.slug,r.title,r.status,r.publication_status,r.broadcast_state,r.broadcast_checked_at,r.broadcast_status_message,r.broadcast_status_source,r.broadcast_transport,r.goal_text,r.goal_target,r.goal_progress,r.private_show_enabled,r.private_show_mode,r.private_show_ticket_cost,r.private_show_per_minute_cost,r.stream_thumbnail_url,r.chat_slow_mode_seconds,r.blocked_terms,p.avatar_url,p.bio,p.schedule_text,p.next_stream_at,p.schedule_timezone,${roomClassificationSelect},COALESCE((SELECT SUM(amount) FROM wallet_ledger w WHERE w.user_id=r.streamer_id AND w.reference_type IN ('gift','private_show','room_action')),0)::int AS test_earnings,COALESCE((SELECT COUNT(*) FROM follows f WHERE f.streamer_id=r.streamer_id),0)::int AS followers FROM live_rooms r JOIN streamer_profiles p ON p.user_id=r.streamer_id WHERE r.streamer_id=$1`,
        [user.id],
      );
      return {
        user,
        room: result.rows[0] ?? null,
        broadcastControls: {
          localFallbackEnabled: config.nodeEnv !== "production",
          cloudflareConfigured: hasCloudflareStreamConfiguration(),
          browserQuickLiveAvailable: hasCloudflareQuickLiveConfiguration(),
        },
      };
    } finally {
      await client.end();
    }
  });
  api.post<{Body:{name:string}}>(
    "/api/studio/tags",
    {schema:{body:mutationSchemas.studioTagCreate}},
    async(request,reply)=>{
      const creator=(await requireRole(request,reply,"streamer")) as DemoUser|undefined;
      if(!creator)return;
      const normalized=normalizeCreatorTag(request.body.name);
      if(!normalized)return reply.code(400).send({error:"invalid_creator_tag"});
      const client=database();await client.connect();
      try{
        await client.query("BEGIN");
        const existing=await client.query("SELECT id,normalized_slug AS slug,display_name AS \"displayName\",tag_type AS type,status,creator_selectable FROM tags WHERE normalized_slug=$1 FOR UPDATE",[normalized.slug]);
        if(existing.rows[0]){
          const tag=existing.rows[0];
          if(tag.status!=="ACTIVE"||!tag.creator_selectable||!["CONTENT","FORMAT","MOOD"].includes(tag.type)){
            await client.query("ROLLBACK");
            return reply.code(400).send({error:"creator_tag_unavailable"});
          }
          await client.query("COMMIT");
          const {status:_status,creator_selectable:_selectable,...publicTag}=tag;
          return {tag:publicTag,created:false};
        }
        const inserted=await client.query("INSERT INTO tags(id,canonical_name,normalized_slug,display_name,tag_type,status,creator_selectable) VALUES($1,$2,$3,$2,'CONTENT','ACTIVE',TRUE) RETURNING id,normalized_slug AS slug,display_name AS \"displayName\",tag_type AS type",[crypto.randomUUID(),normalized.displayName,normalized.slug]);
        await client.query("INSERT INTO audit_events(id,actor_id,subject_user_id,event_type,metadata) VALUES($1,$2,$2,'creator_tag_created',jsonb_build_object('tagId',$3::uuid,'slug',$4::text))",[crypto.randomUUID(),creator.id,inserted.rows[0].id,inserted.rows[0].slug]);
        await client.query("COMMIT");
        return reply.code(201).send({tag:inserted.rows[0],created:true});
      }catch(error){await client.query("ROLLBACK");throw error;}finally{await client.end();}
    },
  );
  api.post<{Body:RoomClassificationInput&{title:string}}>(
    "/api/studio/rooms",
    {schema:{body:mutationSchemas.studioRoomCreate}},
    async(request,reply)=>{
      const creator=(await requireRole(request,reply,"streamer")) as DemoUser|undefined;
      if(!creator)return;
      const client=database();await client.connect();
      try{await client.query("BEGIN");
        const classificationError=await validateRoomClassification(client,request.body);
        if(classificationError){await client.query("ROLLBACK");return reply.code(400).send({error:classificationError});}
        const existing=await client.query("SELECT slug,publication_status FROM live_rooms WHERE streamer_id=$1",[creator.id]);
        if(existing.rows[0]){await client.query("ROLLBACK");return reply.code(409).send({error:"creator_room_exists",room:existing.rows[0]});}
        const profile=await client.query("SELECT 1 FROM streamer_profiles WHERE user_id=$1",[creator.id]);
        if(!profile.rows[0]){await client.query("ROLLBACK");return reply.code(409).send({error:"creator_profile_missing"});}
        const roomId=crypto.randomUUID();
        const created=await client.query("INSERT INTO live_rooms (id,streamer_id,slug,title,status,publication_status,stream_language,cloudflare_live_input_id) VALUES ($1,$2,$3,$4,'offline','draft',$5,$6) RETURNING slug,public_room_id AS \"publicRoomId\",title,publication_status,broadcast_state",[roomId,creator.id,creator.handle,request.body.title.trim(),request.body.primaryLanguage,config.cloudflare.liveInputId??null]);
        await replaceRoomClassification(client,roomId,request.body);
        await client.query("INSERT INTO audit_events (id,actor_id,subject_user_id,event_type,metadata) VALUES ($1,$2,$2,'room_created',jsonb_build_object('slug',$3::text,'publicationStatus','draft'))",[crypto.randomUUID(),creator.id,created.rows[0].slug]);
        await client.query("COMMIT");return reply.code(201).send({room:{...created.rows[0],languages:[request.body.primaryLanguage,...request.body.additionalLanguages],tagIds:request.body.tagIds}});
      }catch(error){await client.query("ROLLBACK");if((error as {code?:string}).code==="23505")return reply.code(409).send({error:"creator_room_exists"});throw error;}finally{await client.end();}
    }
  );
  api.post<{Params:{slug:string}}>("/api/studio/rooms/:slug/publish",async(request,reply)=>{
    const creator=(await requireRole(request,reply,"streamer")) as DemoUser|undefined;if(!creator)return;
    const client=database();await client.connect();
    try{const result=await client.query("UPDATE live_rooms SET publication_status='published',updated_at=NOW() WHERE slug=$1 AND streamer_id=$2 AND publication_status='draft' RETURNING slug,title,publication_status,broadcast_state",[request.params.slug,creator.id]);
      if(!result.rows[0])return reply.code(409).send({error:"room_not_publishable"});
      await client.query("INSERT INTO audit_events (id,actor_id,subject_user_id,event_type,metadata) VALUES ($1,$2,$2,'room_published',jsonb_build_object('slug',$3::text))",[crypto.randomUUID(),creator.id,request.params.slug]);
      return {room:result.rows[0]};
    }finally{await client.end();}
  });
  api.get<{ Params: { slug: string } }>(
    "/api/streamer/rooms/:slug/insights",
    async (request, reply) => {
      const streamer = (await requireRole(request, reply, "streamer")) as
        DemoUser | undefined;
      if (!streamer) return;
      const client = database();
      await client.connect();
      try {
        const room = await client.query<{
          id: string;
          goal_text: string;
          goal_target: number;
          goal_progress: number;
        }>(
          "SELECT id,goal_text,goal_target,goal_progress FROM live_rooms WHERE slug=$1 AND streamer_id=$2",
          [request.params.slug, streamer.id],
        );
        if (!room.rows[0])
          return reply.code(404).send({ error: "streamer_room_not_found" });
        const stats = await client.query(
          "SELECT COALESCE((SELECT SUM(coin_cost) FROM gifts WHERE room_id=$1),0)::int AS gift_total,COALESCE((SELECT SUM(p.coin_cost) FROM room_action_purchases p JOIN room_actions a ON a.id=p.action_id WHERE a.room_id=$1),0)::int AS action_total,COALESCE((SELECT COUNT(*) FROM room_action_purchases p JOIN room_actions a ON a.id=p.action_id WHERE a.room_id=$1),0)::int AS action_count",
          [room.rows[0].id],
        );
        const recent = await client.query(
          "SELECT * FROM (SELECT u.display_name AS sender,gc.name_en AS label,g.coin_cost,'gift'::text AS support_type,g.created_at FROM gifts g JOIN users u ON u.id=g.sender_id JOIN gift_catalog gc ON gc.id=g.gift_id WHERE g.room_id=$1 UNION ALL SELECT u.display_name AS sender,a.title AS label,p.coin_cost,'action'::text AS support_type,p.created_at FROM room_action_purchases p JOIN room_actions a ON a.id=p.action_id JOIN users u ON u.id=p.viewer_id WHERE a.room_id=$1) support ORDER BY created_at DESC LIMIT 8",
          [room.rows[0].id],
        );
        const top = await client.query(
          "SELECT sender,COALESCE(SUM(coin_cost),0)::int AS total FROM (SELECT u.display_name AS sender,g.coin_cost FROM gifts g JOIN users u ON u.id=g.sender_id WHERE g.room_id=$1 UNION ALL SELECT u.display_name AS sender,p.coin_cost FROM room_action_purchases p JOIN room_actions a ON a.id=p.action_id JOIN users u ON u.id=p.viewer_id WHERE a.room_id=$1) support GROUP BY sender ORDER BY total DESC,sender LIMIT 1",
          [room.rows[0].id],
        );
        const giftRanking = await client.query(
          "SELECT u.display_name AS sender,COALESCE(SUM(g.coin_cost),0)::int AS gift_total,COALESCE(SUM(g.quantity),0)::int AS gift_count FROM gifts g JOIN users u ON u.id=g.sender_id WHERE g.room_id=$1 GROUP BY u.id,u.display_name ORDER BY gift_total DESC,gift_count DESC,u.display_name LIMIT 10",
          [room.rows[0].id],
        );
        return {
          goal: room.rows[0],
          stats: stats.rows[0],
          recent: recent.rows,
          topSupporter: top.rows[0] ?? null,
          giftRanking: giftRanking.rows,
        };
      } finally {
        await client.end();
      }
    },
  );
  api.get<{ Params: { slug: string } }>(
    "/api/streamer/rooms/:slug/session-summary",
    async (request, reply) => {
      const streamer = (await requireRole(request, reply, "streamer")) as
        DemoUser | undefined;
      if (!streamer) return;
      const client = database();
      await client.connect();
      try {
        const period = await client.query<{
          id: string;
          broadcast_state: string;
          started_at: Date | null;
          ended_at: Date | null;
        }>(
          "SELECT r.id,r.broadcast_state,started.created_at AS started_at,ended.created_at AS ended_at FROM live_rooms r LEFT JOIN LATERAL (SELECT e.created_at FROM room_lifecycle_events e WHERE e.room_id=r.id AND e.event_type='broadcast_started' ORDER BY e.created_at DESC LIMIT 1) started ON TRUE LEFT JOIN LATERAL (SELECT e.created_at FROM room_lifecycle_events e WHERE e.room_id=r.id AND e.created_at>started.created_at AND e.state<>'live' ORDER BY e.created_at ASC LIMIT 1) ended ON started.created_at IS NOT NULL WHERE r.slug=$1 AND r.streamer_id=$2",
          [request.params.slug, streamer.id],
        );
        const room = period.rows[0];
        if (!room)
          return reply.code(404).send({ error: "streamer_room_not_found" });
        if (!room.started_at) return { summary: null };
        const bounds = [room.id, room.started_at, room.ended_at];
        const totals = await client.query<{
          gift_total: number;
          action_total: number;
          action_count: number;
        }>(
          "SELECT COALESCE((SELECT SUM(g.coin_cost) FROM gifts g WHERE g.room_id=$1 AND g.created_at>=$2 AND ($3::timestamptz IS NULL OR g.created_at<$3)),0)::int AS gift_total,COALESCE((SELECT SUM(p.coin_cost) FROM room_action_purchases p JOIN room_actions a ON a.id=p.action_id WHERE a.room_id=$1 AND p.created_at>=$2 AND ($3::timestamptz IS NULL OR p.created_at<$3)),0)::int AS action_total,COALESCE((SELECT COUNT(*) FROM room_action_purchases p JOIN room_actions a ON a.id=p.action_id WHERE a.room_id=$1 AND p.created_at>=$2 AND ($3::timestamptz IS NULL OR p.created_at<$3)),0)::int AS action_count",
          bounds,
        );
        const top = await client.query<{ sender: string; total: number }>(
          "SELECT sender,SUM(coin_cost)::int AS total FROM (SELECT u.display_name AS sender,g.coin_cost FROM gifts g JOIN users u ON u.id=g.sender_id WHERE g.room_id=$1 AND g.created_at>=$2 AND ($3::timestamptz IS NULL OR g.created_at<$3) UNION ALL SELECT u.display_name AS sender,p.coin_cost FROM room_action_purchases p JOIN room_actions a ON a.id=p.action_id JOIN users u ON u.id=p.viewer_id WHERE a.room_id=$1 AND p.created_at>=$2 AND ($3::timestamptz IS NULL OR p.created_at<$3)) support GROUP BY sender ORDER BY total DESC,sender LIMIT 1",
          bounds,
        );
        const engagement = await client.query<{
          chat_messages: number;
          unique_chatters: number;
          supporter_count: number;
          new_followers: number;
        }>(
          "SELECT (SELECT COUNT(*)::int FROM chat_messages m WHERE m.room_id=$1 AND m.deleted_at IS NULL AND m.created_at>=$2 AND ($3::timestamptz IS NULL OR m.created_at<$3)) AS chat_messages,(SELECT COUNT(DISTINCT m.sender_id)::int FROM chat_messages m WHERE m.room_id=$1 AND m.deleted_at IS NULL AND m.created_at>=$2 AND ($3::timestamptz IS NULL OR m.created_at<$3)) AS unique_chatters,(SELECT COUNT(DISTINCT supporter_id)::int FROM (SELECT g.sender_id AS supporter_id FROM gifts g WHERE g.room_id=$1 AND g.created_at>=$2 AND ($3::timestamptz IS NULL OR g.created_at<$3) UNION SELECT p.viewer_id AS supporter_id FROM room_action_purchases p JOIN room_actions a ON a.id=p.action_id WHERE a.room_id=$1 AND p.created_at>=$2 AND ($3::timestamptz IS NULL OR p.created_at<$3)) s) AS supporter_count,(SELECT COUNT(*)::int FROM follows f JOIN live_rooms lr ON lr.streamer_id=f.streamer_id WHERE lr.id=$1 AND f.created_at>=$2 AND ($3::timestamptz IS NULL OR f.created_at<$3)) AS new_followers",
          bounds,
        );
        const stats = totals.rows[0];
        const activity = engagement.rows[0];
        const endedAt = room.ended_at?.toISOString() ?? null;
        const durationEnd = room.ended_at?.getTime() ?? Date.now();
        return {
          summary: {
            status:
              room.broadcast_state === "live" && !room.ended_at
                ? "live"
                : "completed",
            startedAt: room.started_at.toISOString(),
            endedAt,
            durationSeconds: Math.max(
              0,
              Math.round((durationEnd - room.started_at.getTime()) / 1000),
            ),
            giftTotal: stats.gift_total,
            actionTotal: stats.action_total,
            actionCount: stats.action_count,
            totalSupport: stats.gift_total + stats.action_total,
            topSupporter: top.rows[0] ?? null,
            supporterCount: activity.supporter_count,
            chatMessages: activity.chat_messages,
            uniqueChatters: activity.unique_chatters,
            newFollowers: activity.new_followers,
          },
        };
      } finally {
        await client.end();
      }
    },
  );
  api.get<{ Params: { slug: string } }>(
    "/api/rooms/:slug/support-feed",
    async (request, reply) => {
      const client = database();
      await client.connect();
      try {
        const publicRoom = await client.query(
          "SELECT r.id FROM live_rooms r JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' WHERE r.slug=$1 AND r.publication_status='published'",
          [request.params.slug],
        );
        if (!publicRoom.rows[0])
          return reply.code(404).send({ error: "room_not_found" });
        const result = await client.query(
          "SELECT * FROM (SELECT u.display_name AS sender,gc.name_en AS label,g.coin_cost,'gift'::text AS support_type,g.created_at FROM gifts g JOIN users u ON u.id=g.sender_id JOIN gift_catalog gc ON gc.id=g.gift_id JOIN live_rooms r ON r.id=g.room_id JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' WHERE r.slug=$1 AND r.publication_status='published' UNION ALL SELECT u.display_name AS sender,a.title AS label,p.coin_cost,'action'::text AS support_type,p.created_at FROM room_action_purchases p JOIN room_actions a ON a.id=p.action_id JOIN users u ON u.id=p.viewer_id JOIN live_rooms r ON r.id=a.room_id JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' WHERE r.slug=$1 AND r.publication_status='published') support ORDER BY created_at DESC LIMIT 6",
          [request.params.slug],
        );
        return { support: result.rows };
      } finally {
        await client.end();
      }
    },
  );
  api.put<{
    Body: {
      bio?: string;
      scheduleText?: string;
      nextStreamAt?: string | null;
      scheduleTimezone?: string;
    };
  }>(
    "/api/streamer/profile",
    async (request, reply) => {
      const streamer = (await requireRole(request, reply, "streamer")) as
        DemoUser | undefined;
      if (!streamer) return;
      const bio = request.body?.bio?.trim();
      const schedule = request.body?.scheduleText?.trim();
      const nextStreamSupplied = request.body?.nextStreamAt !== undefined;
      const nextStreamAt = request.body?.nextStreamAt;
      const scheduleTimezone = request.body?.scheduleTimezone?.trim();
      const nextStreamTimestamp =
        typeof nextStreamAt === "string" ? Date.parse(nextStreamAt) : null;
      if (
        (!bio && !schedule && !nextStreamSupplied && !scheduleTimezone) ||
        (bio && bio.length > 500) ||
        (schedule && schedule.length > 160) ||
        (scheduleTimezone && !validTimeZone(scheduleTimezone)) ||
        (typeof nextStreamAt === "string" &&
          (!Number.isFinite(nextStreamTimestamp) ||
            nextStreamTimestamp! < Date.now() - 5 * 60_000 ||
            nextStreamTimestamp! > Date.now() + 2 * 365 * 24 * 60 * 60_000))
      )
        return reply.code(400).send({ error: "invalid_profile_metadata" });
      const client = database();
      await client.connect();
      try {
        await client.query("BEGIN");
        const before = await client.query<{ next_stream_at: Date | null }>(
          "SELECT next_stream_at FROM streamer_profiles WHERE user_id=$1 FOR UPDATE",
          [streamer.id],
        );
        const update = await client.query(
          `UPDATE streamer_profiles
           SET bio=COALESCE($1,bio),schedule_text=COALESCE($2,schedule_text),
               next_stream_at=CASE WHEN $3 THEN $4::timestamptz ELSE next_stream_at END,
               schedule_timezone=COALESCE($5,schedule_timezone)
           WHERE user_id=$6
           RETURNING bio,schedule_text,next_stream_at,schedule_timezone`,
          [
            bio ?? null,
            schedule ?? null,
            nextStreamSupplied,
            typeof nextStreamAt === "string"
              ? new Date(nextStreamTimestamp!).toISOString()
              : null,
            scheduleTimezone ?? null,
            streamer.id,
          ],
        );
        const room = await client.query<{ id: string; slug: string }>(
          "SELECT id,slug FROM live_rooms WHERE streamer_id=$1",
          [streamer.id],
        );
        const changedSchedule = nextStreamSupplied &&
          (before.rows[0]?.next_stream_at?.toISOString() ?? null) !==
            (update.rows[0]?.next_stream_at?.toISOString() ?? null);
        let notified: { user_id: string; id: string; kind:string }[] = [];
        if (changedSchedule && update.rows[0]?.next_stream_at && new Date(update.rows[0].next_stream_at).getTime() > Date.now() && room.rows[0]) {
          const created = await client.query<{ user_id: string; id: string; kind:string }>(
            `INSERT INTO notifications
               (id,user_id,kind,title,body,room_id,notification_key)
             SELECT gen_random_uuid(),f.follower_id,CASE WHEN $4::timestamptz<=NOW()+INTERVAL '1 hour' THEN 'schedule_reminder' ELSE 'schedule_updated' END,
                    CASE WHEN $4::timestamptz<=NOW()+INTERVAL '1 hour' THEN CASE WHEN viewer.locale='zh' THEN '关注的主播即将开播' ELSE 'A creator you follow starts soon' END ELSE CASE WHEN viewer.locale='zh' THEN '主播更新了直播时间' ELSE 'Creator schedule updated' END END,
                    CASE WHEN viewer.locale='zh'
                      THEN CASE WHEN $4::timestamptz<=NOW()+INTERVAL '1 hour' THEN $1 || ' 计划在一小时内开播。' ELSE $1 || ' 发布了新的下一场直播时间。' END
                      ELSE CASE WHEN $4::timestamptz<=NOW()+INTERVAL '1 hour' THEN $1 || ' is scheduled to go live within the next hour.' ELSE $1 || ' published a new upcoming stream time.' END END,
                    $2,CASE WHEN $4::timestamptz<=NOW()+INTERVAL '1 hour' THEN 'schedule_reminder:' ELSE 'schedule_updated:' END || $3::uuid::text || ':' || EXTRACT(EPOCH FROM $4::timestamptz)::bigint::text
             FROM follows f JOIN users viewer ON viewer.id=f.follower_id
             WHERE f.streamer_id=$3::uuid AND f.reminder_enabled=TRUE
             ON CONFLICT (user_id,notification_key) WHERE notification_key IS NOT NULL DO NOTHING
             RETURNING user_id,id,kind`,
            [streamer.displayName, room.rows[0].id, streamer.id, update.rows[0].next_stream_at],
          );
          notified = created.rows;
        } else if (changedSchedule && !update.rows[0]?.next_stream_at && room.rows[0]) {
          await client.query(
            "DELETE FROM notifications WHERE room_id=$1 AND kind IN ('schedule_updated','schedule_reminder') AND read_at IS NULL",
            [room.rows[0].id],
          );
        }
        await client.query("COMMIT");
        if (changedSchedule && room.rows[0]) {
          const event = {
            streamerId: streamer.id,
            slug: room.rows[0].slug,
            nextStreamAt: update.rows[0]?.next_stream_at?.toISOString() ?? null,
            scheduleTimezone: update.rows[0]?.schedule_timezone ?? scheduleTimezone ?? "UTC",
          };
          realtime?.to("discovery").emit("schedule:changed", event);
          for (const item of notified)
            realtime?.to(`user:${item.user_id}`).emit("notification:new", {
              id: item.id,
              kind: item.kind,
              roomSlug: room.rows[0].slug,
            });
        }
        return { profile: update.rows[0] };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        await client.end();
      }
    },
  );
  api.put<{
    Params: { slug: string };
    Body: {
      title?: string;
      goalText?: string;
      goalTarget?: number;
      primaryLanguage?: string;
      additionalLanguages?: string[];
      tagIds?: string[];
    };
  }>("/api/streamer/rooms/:slug", async (request, reply) => {
    const streamer = (await requireRole(request, reply, "streamer")) as
      DemoUser | undefined;
    if (!streamer) return;
    const title = request.body?.title?.trim();
    const goal = request.body?.goalText?.trim();
    const goalTarget = request.body?.goalTarget;
    const legacyBody=request.body as unknown as Record<string,unknown>;
    if("category" in legacyBody||"streamLanguage" in legacyBody||"streamTags" in legacyBody)return reply.code(400).send({error:"legacy_room_classification_removed"});
    const classificationSpecified=request.body?.primaryLanguage!==undefined||request.body?.additionalLanguages!==undefined||request.body?.tagIds!==undefined;
    const classification=classificationSpecified?{primaryLanguage:request.body.primaryLanguage??"",additionalLanguages:request.body.additionalLanguages??[],tagIds:request.body.tagIds??[]}:null;
    if (
      (!title && !goal && goalTarget === undefined && !classification) ||
      (title && title.length > 120) ||
      (goal && goal.length > 300) ||
      (classification&&(!Array.isArray(classification.additionalLanguages)||!Array.isArray(classification.tagIds))) ||
      (goalTarget !== undefined &&
        (!Number.isInteger(goalTarget) ||
          goalTarget < 1 ||
          goalTarget > 1000000))
    )
      return reply.code(400).send({ error: "invalid_room_metadata" });
    const client = database();
    await client.connect();
    try {
      await client.query("BEGIN");
      if(classification){const classificationError=await validateRoomClassification(client,classification);if(classificationError){await client.query("ROLLBACK");return reply.code(400).send({error:classificationError});}}
      const update = await client.query(
        "UPDATE live_rooms SET title=COALESCE($1,title),goal_text=COALESCE($2,goal_text),goal_target=COALESCE($3,goal_target),updated_at=NOW() WHERE slug=$4 AND streamer_id=$5 RETURNING id,title,goal_text,goal_target,goal_progress,stream_thumbnail_url",
        [
          title ?? null,
          goal ?? null,
          goalTarget ?? null,
          request.params.slug,
          streamer.id,
        ],
      );
      if (!update.rows[0]) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "streamer_room_not_found" });
      }
      if(classification)await replaceRoomClassification(client,update.rows[0].id,classification);
      const complete=await client.query(`SELECT r.title,r.goal_text,r.goal_target,r.goal_progress,r.stream_thumbnail_url,${roomClassificationSelect} FROM live_rooms r WHERE r.id=$1`,[update.rows[0].id]);
      await client.query("COMMIT");
      return { room: complete.rows[0] };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await client.end();
    }
  });
  api.get<{ Params: { slug: string } }>(
    "/api/streamer/rooms/:slug/actions",
    async (request, reply) => {
      const streamer = (await requireRole(request, reply, "streamer")) as
        DemoUser | undefined;
      if (!streamer) return;
      const client = database();
      await client.connect();
      try {
        const result = await client.query(
          "SELECT a.id,a.title,a.coin_cost,a.duration_label,a.is_active,a.display_order FROM room_actions a JOIN live_rooms r ON r.id=a.room_id WHERE r.slug=$1 AND r.streamer_id=$2 ORDER BY a.display_order,a.created_at LIMIT 50",
          [request.params.slug, streamer.id],
        );
        return { actions: result.rows };
      } finally {
        await client.end();
      }
    },
  );
  api.post<{
    Params: { slug: string };
    Body: { title?: string; coinCost?: number; durationLabel?: string };
  }>(
    "/api/streamer/rooms/:slug/actions",
    { schema: { body: mutationSchemas.createRoomAction } },
    async (request, reply) => {
    const streamer = (await requireRole(request, reply, "streamer")) as
      DemoUser | undefined;
    if (!streamer) return;
    const title = request.body?.title?.trim();
    const coinCost = request.body?.coinCost;
    const durationLabel = request.body?.durationLabel?.trim() || null;
    if (
      !title ||
      title.length > 80 ||
      typeof coinCost !== "number" ||
      !Number.isInteger(coinCost) ||
      coinCost < 1 ||
      coinCost > 1000000 ||
      (durationLabel && durationLabel.length > 60)
    )
      return reply.code(400).send({ error: "invalid_room_action" });
    const client = database();
    await client.connect();
    try {
      const room = await client.query<{ id: string }>(
        "SELECT id FROM live_rooms WHERE slug=$1 AND streamer_id=$2",
        [request.params.slug, streamer.id],
      );
      if (!room.rows[0])
        return reply.code(404).send({ error: "streamer_room_not_found" });
      const created = await client.query(
        "INSERT INTO room_actions (id,room_id,title,coin_cost,duration_label,display_order) VALUES ($1,$2,$3,$4,$5,(SELECT COALESCE(MAX(display_order),0)+1 FROM room_actions WHERE room_id=$2)) RETURNING id,title,coin_cost,duration_label,is_active,display_order",
        [crypto.randomUUID(), room.rows[0].id, title, coinCost!, durationLabel],
      );
      return { action: created.rows[0] };
    } finally {
      await client.end();
    }
    },
  );
  api.put<{
    Params: { slug: string; actionId: string };
    Body: {
      title?: string;
      coinCost?: number;
      durationLabel?: string | null;
      isActive?: boolean;
      displayOrder?: number;
    };
  }>(
    "/api/streamer/rooms/:slug/actions/:actionId",
    { schema: { body: mutationSchemas.updateRoomAction } },
    async (request, reply) => {
    const streamer = (await requireRole(request, reply, "streamer")) as
      DemoUser | undefined;
    if (!streamer) return;
    const body = request.body ?? {};
    const title = body.title?.trim();
    const durationLabel =
      body.durationLabel === null ? null : body.durationLabel?.trim();
    if (
      (title !== undefined && (!title || title.length > 80)) ||
      (body.coinCost !== undefined &&
        (!Number.isInteger(body.coinCost) ||
          body.coinCost < 1 ||
          body.coinCost > 1000000)) ||
      (durationLabel !== undefined &&
        durationLabel !== null &&
        durationLabel.length > 60) ||
      (body.isActive !== undefined && typeof body.isActive !== "boolean") ||
      (body.displayOrder !== undefined &&
        (!Number.isInteger(body.displayOrder) ||
          body.displayOrder < 0 ||
          body.displayOrder > 1000))
    )
      return reply.code(400).send({ error: "invalid_room_action" });
    const client = database();
    await client.connect();
    try {
      const update = await client.query(
        "UPDATE room_actions a SET title=COALESCE($1,a.title),coin_cost=COALESCE($2,a.coin_cost),duration_label=CASE WHEN $3::text IS NULL THEN a.duration_label ELSE $3 END,is_active=COALESCE($4,a.is_active),display_order=COALESCE($5,a.display_order) FROM live_rooms r WHERE a.room_id=r.id AND r.slug=$6 AND r.streamer_id=$7 AND a.id=$8 RETURNING a.id,a.title,a.coin_cost,a.duration_label,a.is_active,a.display_order",
        [
          title ?? null,
          body.coinCost ?? null,
          durationLabel === undefined ? null : durationLabel,
          body.isActive ?? null,
          body.displayOrder ?? null,
          request.params.slug,
          streamer.id,
          request.params.actionId,
        ],
      );
      if (!update.rows[0])
        return reply.code(404).send({ error: "room_action_not_found" });
      return { action: update.rows[0] };
    } finally {
      await client.end();
    }
    },
  );
  api.get<{Querystring:{filter?:string;search?:string;page?:string;limit?:string;sort?:string}}>("/api/admin/creator-reviews",async(request,reply)=>{
    const admin=await requireAdminPermission(request,reply,"creator_review.read");if(!admin)return;
    const limit=Math.min(50,Math.max(1,Number(request.query.limit??20)||20)),page=Math.max(1,Number(request.query.page??1)||1);
    const filter=request.query.filter??"all",search=(request.query.search??"").trim();
    const clauses=["($1='' OR u.display_name ILIKE '%'||$1||'%' OR u.handle ILIKE '%'||$1||'%' OR o.creator_handle ILIKE '%'||$1||'%' OR u.id::text=$1)"];
    if(filter==="new")clauses.push("c.status='READY_FOR_REVIEW'");
    else if(filter==="auto_unreviewed")clauses.push("c.status='ACTIVE' AND c.activation_method='AUTOMATIC' AND c.administrative_review_status='NOT_REVIEWED'");
    else if(filter==="pending")clauses.push("c.status='PENDING_REVIEW'");
    else if(filter==="uploaded")clauses.push("d.status='UPLOADED'");
    else if(filter==="needs_reupload")clauses.push("d.status='NEEDS_REUPLOAD'");
    else if(filter==="active")clauses.push("c.status='ACTIVE'");
    else if(filter==="rejected")clauses.push("c.status='REJECTED'");
    else if(filter==="suspended")clauses.push("c.status='SUSPENDED'");
    const client=database();await client.connect();try{
      const result=await client.query(`SELECT u.id AS user_id,u.handle AS account_handle,u.display_name,c.status AS creator_status,c.activation_method,c.administrative_review_status,c.activated_at,c.updated_at,o.creator_handle,o.profile_completed_at,d.id AS document_id,d.status AS document_status,d.uploaded_at,ag.accepted_at,ag.agreement_version,COUNT(*) OVER()::int AS total FROM creator_accounts c JOIN users u ON u.id=c.user_id LEFT JOIN creator_onboarding o ON o.user_id=u.id LEFT JOIN LATERAL (SELECT * FROM creator_identity_documents x WHERE x.user_id=u.id AND x.status<>'SUPERSEDED' ORDER BY x.uploaded_at DESC LIMIT 1)d ON TRUE LEFT JOIN LATERAL (SELECT a.accepted_at,v.version AS agreement_version FROM creator_agreement_acceptances a JOIN creator_agreement_versions v ON v.id=a.agreement_version_id WHERE a.user_id=u.id AND v.is_current=TRUE ORDER BY a.accepted_at DESC LIMIT 1)ag ON TRUE WHERE ${clauses.join(" AND ")} ORDER BY c.updated_at DESC,u.id LIMIT $2 OFFSET $3`,[search,limit,(page-1)*limit]);
      return {items:result.rows,page,limit,total:result.rows[0]?.total??0};
    }finally{await client.end();}
  });
  api.get<{Params:{creatorId:string}}>("/api/admin/creator-reviews/:creatorId",async(request,reply)=>{
    const admin=await requireAdminPermission(request,reply,"creator_review.read");if(!admin)return;
    const client=database();await client.connect();try{
      const summary=await client.query("SELECT u.id AS user_id,u.handle AS account_handle,u.display_name,u.created_at AS account_created_at,u.is_banned,c.status AS creator_status,c.reason_code,c.activation_method,c.activated_at,c.administrative_review_status,o.creator_handle,o.display_name AS creator_name,o.bio,o.primary_language,o.timezone,o.profile_completed_at,ag.age_confirmed,ag.agreement_confirmed,ag.accepted_at,ag.audit_event_id,ag.agreement_version,d.id AS document_id,d.document_type,d.mime_type,d.file_size,d.status AS document_status,d.uploaded_at,d.reviewed_at,d.reviewed_by,d.review_reason_code FROM users u JOIN creator_accounts c ON c.user_id=u.id LEFT JOIN creator_onboarding o ON o.user_id=u.id LEFT JOIN LATERAL (SELECT a.age_confirmed,a.agreement_confirmed,a.accepted_at,a.audit_event_id,v.version AS agreement_version FROM creator_agreement_acceptances a JOIN creator_agreement_versions v ON v.id=a.agreement_version_id WHERE a.user_id=u.id AND v.is_current=TRUE ORDER BY a.accepted_at DESC LIMIT 1)ag ON TRUE LEFT JOIN LATERAL(SELECT * FROM creator_identity_documents x WHERE x.user_id=u.id AND x.status<>'SUPERSEDED' ORDER BY x.uploaded_at DESC LIMIT 1)d ON TRUE WHERE u.id=$1",[request.params.creatorId]);
      const history=await client.query("SELECT from_status,to_status,reason_code,actor_id,created_at FROM creator_status_history WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",[request.params.creatorId]);
      const decisions=await client.query("SELECT action,reason_code,user_facing_reason,reviewer_id,created_at FROM creator_review_decisions WHERE creator_user_id=$1 ORDER BY created_at DESC LIMIT 100",[request.params.creatorId]);
      const resources=await client.query("SELECT r.slug,r.title,r.publication_status,r.broadcast_state,r.created_at FROM live_rooms r WHERE r.streamer_id=$1 ORDER BY r.created_at DESC LIMIT 50",[request.params.creatorId]);
      if(!summary.rows[0])return reply.code(404).send({error:"creator_review_not_found"});
      return {creator:summary.rows[0],history:history.rows,decisions:decisions.rows,resources:resources.rows};
    }finally{await client.end();}
  });
  api.post<{Params:{creatorId:string};Body:{documentId:string}}>("/api/admin/creator-reviews/:creatorId/document-view",async(request,reply)=>{
    const admin=await requireAdminPermission(request,reply,"creator_document.view");if(!admin)return;
    const client=database();await client.connect();try{
      const document=await client.query("SELECT id FROM creator_identity_documents WHERE id=$1 AND user_id=$2 AND status<>'DELETED'",[request.body?.documentId,request.params.creatorId]);if(!document.rows[0])return reply.code(404).send({error:"identity_document_not_found"});
      const token=crypto.randomUUID(),auditId=crypto.randomUUID();identityDocumentViews.set(token,{adminId:admin.id,documentId:request.body.documentId,expiresAt:Date.now()+60_000});
      await client.query("INSERT INTO audit_events(id,actor_id,subject_user_id,event_type,metadata) VALUES($1,$2,$3,'identity_document_view_authorized',jsonb_build_object('documentId',$4::text,'requestId',$5::text))",[auditId,admin.id,request.params.creatorId,request.body.documentId,request.id]);
      return {viewPath:`/api/admin/creator-documents/view/${token}`,expiresInSeconds:60,auditEventId:auditId};
    }finally{await client.end();}
  });
  api.get<{Params:{token:string}}>("/api/admin/creator-documents/view/:token",async(request,reply)=>{
    const admin=await requireAdminPermission(request,reply,"creator_document.view");if(!admin)return;
    const grant=identityDocumentViews.get(request.params.token);identityDocumentViews.delete(request.params.token);
    if(!grant||grant.adminId!==admin.id||grant.expiresAt<Date.now())return reply.code(404).send({error:"document_view_expired"});
    const client=database();await client.connect();try{const result=await client.query("SELECT user_id,storage_reference,mime_type FROM creator_identity_documents WHERE id=$1 AND status<>'DELETED'",[grant.documentId]);if(!result.rows[0])return reply.code(404).send({error:"identity_document_not_found"});
      await client.query("INSERT INTO audit_events(id,actor_id,subject_user_id,event_type,metadata) VALUES($1,$2,$3,'identity_document_viewed',jsonb_build_object('documentId',$4::text,'requestId',$5::text))",[crypto.randomUUID(),admin.id,result.rows[0].user_id,grant.documentId,request.id]);
      const buffer=await readIdentityDocument({storagePath:config.identityDocumentStoragePath,encryptionKey:config.identityDocumentEncryptionKey,storageReference:result.rows[0].storage_reference});reply.header("cache-control","no-store");reply.header("content-disposition","inline");return reply.type(result.rows[0].mime_type).send(buffer);
    }finally{await client.end();}
  });
  api.post<{Params:{creatorId:string};Body:{action:string;reasonCode:string;userFacingReason?:string;internalNotes?:string;idempotencyKey:string}}>("/api/admin/creator-reviews/:creatorId/actions",async(request,reply)=>{
    const action=request.body?.action;const permission=["SUSPENDED","REACTIVATED"].includes(action)?"creator_access.suspend":"creator_review.decide";
    const admin=await requireAdminPermission(request,reply,permission);if(!admin)return;
    if(!["DOCUMENT_REVIEWED","REUPLOAD_REQUESTED","APPROVED","REJECTED","SUSPENDED","REACTIVATED"].includes(action)||!request.body.reasonCode?.trim()||!request.body.idempotencyKey?.trim())return reply.code(400).send({error:"invalid_creator_review_action"});
    const client=database();await client.connect();try{await client.query("BEGIN");
      const duplicate=await client.query("SELECT action,next_creator_status FROM creator_review_decisions WHERE reviewer_id=$1 AND idempotency_key=$2",[admin.id,request.body.idempotencyKey]);if(duplicate.rows[0]){await client.query("COMMIT");return {decision:duplicate.rows[0],idempotent:true};}
      const account=await client.query<{status:CreatorStatus}>("SELECT status FROM creator_accounts WHERE user_id=$1 FOR UPDATE",[request.params.creatorId]);if(!account.rows[0]){await client.query("ROLLBACK");return reply.code(404).send({error:"creator_review_not_found"});}
      const document=await client.query<{id:string,status:string}>("SELECT id,status FROM creator_identity_documents WHERE user_id=$1 AND status<>'SUPERSEDED' ORDER BY uploaded_at DESC LIMIT 1 FOR UPDATE",[request.params.creatorId]);
      let next=account.rows[0].status;
      if(action==="DOCUMENT_REVIEWED"){if(!document.rows[0]||document.rows[0].status!=="UPLOADED"){await client.query("ROLLBACK");return reply.code(409).send({error:"document_transition_invalid"});}await client.query("UPDATE creator_identity_documents SET status='REVIEWED',reviewed_at=NOW(),reviewed_by=$1,review_reason_code=$2,internal_notes=$3 WHERE id=$4",[admin.id,request.body.reasonCode,request.body.internalNotes??null,document.rows[0].id]);await client.query("UPDATE creator_accounts SET administrative_review_status='REVIEWED',updated_at=NOW() WHERE user_id=$1",[request.params.creatorId]);}
      else if(action==="REUPLOAD_REQUESTED"){if(!document.rows[0]){await client.query("ROLLBACK");return reply.code(409).send({error:"document_required"});}await client.query("UPDATE creator_identity_documents SET status='NEEDS_REUPLOAD',reviewed_at=NOW(),reviewed_by=$1,review_reason_code=$2,internal_notes=$3 WHERE id=$4",[admin.id,request.body.reasonCode,request.body.internalNotes??null,document.rows[0].id]);await client.query("UPDATE creator_accounts SET administrative_review_status='NEEDS_REUPLOAD',updated_at=NOW() WHERE user_id=$1",[request.params.creatorId]);}
      else {const transitions:Record<string,CreatorStatus[]>={APPROVED:["PENDING_REVIEW","READY_FOR_REVIEW"],REJECTED:["PENDING_REVIEW","READY_FOR_REVIEW","ACTIVE"],SUSPENDED:["ACTIVE","APPROVED"],REACTIVATED:["SUSPENDED"]};if(!transitions[action]?.includes(account.rows[0].status)){await client.query("ROLLBACK");return reply.code(409).send({error:"creator_transition_invalid"});}next=action==="APPROVED"||action==="REACTIVATED"?"ACTIVE":action==="REJECTED"?"REJECTED":"SUSPENDED";await client.query("UPDATE creator_accounts SET status=$1,reason_code=$2,activation_method=CASE WHEN $1='ACTIVE' AND activation_method IS NULL THEN 'MANUAL' ELSE activation_method END,activated_at=CASE WHEN $1='ACTIVE' THEN COALESCE(activated_at,NOW()) ELSE activated_at END,activated_by=CASE WHEN $1='ACTIVE' THEN $3 ELSE activated_by END,updated_at=NOW() WHERE user_id=$4",[next,request.body.reasonCode,admin.id,request.params.creatorId]);await client.query("INSERT INTO creator_status_history(id,user_id,from_status,to_status,reason_code,actor_id) VALUES($1,$2,$3,$4,$5,$6)",[crypto.randomUUID(),request.params.creatorId,account.rows[0].status,next,request.body.reasonCode,admin.id]);if(action==="SUSPENDED"||action==="REJECTED")await client.query("UPDATE live_rooms SET publication_status='draft',broadcast_state='offline',status='offline',updated_at=NOW() WHERE streamer_id=$1",[request.params.creatorId]);}
      const auditId=crypto.randomUUID();await client.query("INSERT INTO audit_events(id,actor_id,subject_user_id,event_type,metadata) VALUES($1,$2,$3,'creator_review_decision',jsonb_build_object('action',$4::text,'reasonCode',$5::text,'requestId',$6::text))",[auditId,admin.id,request.params.creatorId,action,request.body.reasonCode,request.id]);await client.query("INSERT INTO creator_review_decisions(id,creator_user_id,document_id,reviewer_id,action,previous_creator_status,next_creator_status,reason_code,user_facing_reason,internal_notes,idempotency_key,audit_event_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",[crypto.randomUUID(),request.params.creatorId,document.rows[0]?.id??null,admin.id,action,account.rows[0].status,next,request.body.reasonCode,request.body.userFacingReason??null,request.body.internalNotes??null,request.body.idempotencyKey,auditId]);
      const titles:Record<string,string>={DOCUMENT_REVIEWED:"Document reviewed",REUPLOAD_REQUESTED:"Document re-upload requested",APPROVED:"Creator access approved",REJECTED:"Creator access rejected",SUSPENDED:"Creator access suspended",REACTIVATED:"Creator access restored"};await client.query("INSERT INTO notifications(id,user_id,kind,title,body,notification_key) VALUES($1,$2,'creator_review',$3,$4,$5) ON CONFLICT DO NOTHING",[crypto.randomUUID(),request.params.creatorId,titles[action],request.body.userFacingReason||titles[action],`creator-review:${auditId}`]);
      await client.query("COMMIT");return {decision:{action,previousStatus:account.rows[0].status,nextStatus:next,auditEventId:auditId}};
    }catch(error){await client.query("ROLLBACK");throw error;}finally{await client.end();}
  });
  api.get("/api/admin/reports", async (request, reply) => {
    const admin = await requireRole(request, reply, "admin");
    if (!admin) return;
    const client = database();
    await client.connect();
    try {
      const result = await client.query(
        "SELECT c.id,c.reason,c.details,c.status,c.created_at,r.slug,r.title,u.display_name AS reporter_name FROM content_reports c JOIN live_rooms r ON r.id=c.room_id JOIN users u ON u.id=c.reporter_id ORDER BY c.created_at DESC LIMIT 100",
      );
      return { reports: result.rows };
    } finally {
      await client.end();
    }
  });
  api.get("/api/admin/creator-applications", async (request, reply) => {
    const admin = await requireRole(request, reply, "admin");
    if (!admin) return;
    const client = database();
    await client.connect();
    try {
      const result = await client.query(
        `SELECT a.id,a.category,a.bio,a.schedule_text,a.motivation,a.status,
                a.review_reason,a.reviewed_at,a.created_at,a.updated_at,
                u.id AS applicant_id,u.handle,u.display_name,u.locale
         FROM creator_applications a
         JOIN users u ON u.id=a.applicant_id
         ORDER BY (a.status='pending') DESC,a.created_at DESC
         LIMIT 100`,
      );
      return { applications: result.rows };
    } finally {
      await client.end();
    }
  });
  api.post<{
    Params: { applicationId: string };
    Body: { decision: "approved" | "rejected"; reason: string };
  }>(
    "/api/admin/creator-applications/:applicationId/decision",
    { schema: { body: mutationSchemas.creatorApplicationDecision } },
    async (request, reply) => {
      const admin = (await requireRole(request, reply, "admin")) as
        | DemoUser
        | undefined;
      if (!admin) return;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.params.applicationId))
        return reply.code(400).send({ error: "invalid_application_id" });
      const client = database();
      await client.connect();
      try {
        await client.query("BEGIN");
        const application = await client.query<{
          id: string;
          applicant_id: string;
          category: string;
          bio: string;
          schedule_text: string;
          status: string;
          handle: string;
          display_name: string;
          locale: "en" | "zh";
          role: Role;
        }>(
          `SELECT a.id,a.applicant_id,a.category,a.bio,a.schedule_text,a.status,
                  u.handle,u.display_name,u.locale,u.role
           FROM creator_applications a
           JOIN users u ON u.id=a.applicant_id
           WHERE a.id=$1
           FOR UPDATE OF a,u`,
          [request.params.applicationId],
        );
        const item = application.rows[0];
        if (!item) {
          await client.query("ROLLBACK");
          return reply.code(404).send({ error: "creator_application_not_found" });
        }
        if (item.status !== "pending") {
          await client.query("ROLLBACK");
          return reply.code(409).send({ error: "application_already_decided" });
        }

        const reason = request.body.reason.trim();
        if (request.body.decision === "rejected") {
          await client.query(
            `UPDATE creator_applications
             SET status='rejected',reviewed_by=$1,review_reason=$2,
                 reviewed_at=NOW(),updated_at=NOW()
             WHERE id=$3`,
            [admin.id, reason, item.id],
          );
          await client.query(
            "INSERT INTO creator_application_events (id,application_id,actor_id,event_type) VALUES ($1,$2,$3,'rejected')",
            [crypto.randomUUID(), item.id, admin.id],
          );
          await client.query(
            "INSERT INTO notifications (id,user_id,kind,title,body) VALUES ($1,$2,'creator_application','Creator application update',$3)",
            [crypto.randomUUID(), item.applicant_id, reason],
          );
          await client.query("COMMIT");
          return { applicationId: item.id, status: "rejected" };
        }

        if (item.role !== "audience") {
          await client.query("ROLLBACK");
          return reply.code(409).send({ error: "applicant_role_changed" });
        }
        await client.query("ROLLBACK");
        return reply.code(409).send({
          error: "legacy_creator_application_requires_new_onboarding",
        });
      } catch (error) {
        await client.query("ROLLBACK");
        if ((error as { code?: string }).code === "23505")
          return reply.code(409).send({ error: "creator_provisioning_conflict" });
        throw error;
      } finally {
        await client.end();
      }
    },
  );
  api.get("/api/admin/test-transactions", async (request, reply) => {
    const admin = await requireRole(request, reply, "admin");
    if (!admin) return;
    const client = database();
    await client.connect();
    try {
      const result = await client.query(
        "SELECT w.entry_type,w.amount,w.reference_type,w.created_at,u.display_name AS participant_name,u.role AS participant_role FROM wallet_ledger w JOIN users u ON u.id=w.user_id WHERE w.reference_type IN ('gift','private_show','room_action') ORDER BY w.created_at DESC LIMIT 50",
      );
      return { transactions: result.rows };
    } finally {
      await client.end();
    }
  });
  api.get("/api/admin/users", async (request, reply) => {
    const admin = await requireRole(request, reply, "admin");
    if (!admin) return;
    const client = database();
    await client.connect();
    try {
      const result = await client.query(
        "SELECT id,display_name,role,is_muted,is_banned,created_at FROM users ORDER BY role,display_name LIMIT 100",
      );
      return { users: result.rows };
    } finally {
      await client.end();
    }
  });
  api.get("/api/admin/rooms/broadcasts", async (request, reply) => {
    const admin = await requireRole(request, reply, "admin");
    if (!admin) return;
    const client = database();
    await client.connect();
    try {
      const result = await client.query(
        "SELECT r.slug,r.title,r.broadcast_state,r.broadcast_checked_at,r.broadcast_status_message,r.broadcast_status_source,u.display_name AS streamer_name FROM live_rooms r JOIN users u ON u.id=r.streamer_id ORDER BY r.title LIMIT 100",
      );
      return { rooms: result.rows };
    } finally {
      await client.end();
    }
  });
  api.post<{
    Params: { reportId: string };
    Body: { status?: "reviewed" | "dismissed" };
  }>(
    "/api/admin/reports/:reportId",
    { schema: { body: mutationSchemas.reportReview } },
    async (request, reply) => {
    const admin = (await requireRole(request, reply, "admin")) as
      DemoUser | undefined;
    if (!admin) return;
    const status = request.body?.status;
    if (!status || !["reviewed", "dismissed"].includes(status))
      return reply.code(400).send({ error: "invalid_report_status" });
    const client = database();
    await client.connect();
    try {
      const update = await client.query(
        "UPDATE content_reports SET status=$1,reviewed_by=$2,reviewed_at=NOW() WHERE id=$3 RETURNING id",
        [status, admin.id, request.params.reportId],
      );
      if (!update.rows[0])
        return reply.code(404).send({ error: "report_not_found" });
      return { status };
    } finally {
      await client.end();
    }
    },
  );
  api.get("/api/admin/dashboard", async (request, reply) => {
    const user = await requireRole(request, reply, "admin");
    return user ? { user } : undefined;
  });
  api.get("/api/admin/ops/metrics", async (request, reply) => {
    const user = await requireRole(request, reply, "admin");
    if (!user) return;
    const memory = process.memoryUsage();
    const [redisMemoryInfo, redisClientInfo] = await Promise.all([
      redisPublisher.info("memory"),
      redisPublisher.info("clients"),
    ]);
    return {
      uptimeSeconds: Math.round(process.uptime()),
      realtimeConnections: realtime?.engine.clientsCount ?? 0,
      databasePool: databasePoolStats(),
      cpuUsageMicros: process.cpuUsage(),
      memoryBytes: {
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
      },
      redis: {
        usedMemoryBytes: redisMetric(redisMemoryInfo, "used_memory"),
        connectedClients: redisMetric(redisClientInfo, "connected_clients"),
      },
    };
  });
  return api;
}

const api = buildApi();

const io = new Server(api.server, {
  cors: { origin: config.webOrigin, credentials: true },
  maxHttpBufferSize: 64 * 1024,
});
realtime = io;
const redisPublisher = createClient({
  url: required(config.redisUrl, "REDIS_URL"),
});
const redisSubscriber = redisPublisher.duplicate();
let lastRedisErrorLogAt = 0;
for (const redisClient of [redisPublisher, redisSubscriber])
  redisClient.on("error", (error) => {
    runtimeMetrics.realtimeErrorsTotal += 1;
    const now = Date.now();
    if (now - lastRedisErrorLogAt < 5_000) return;
    lastRedisErrorLogAt = now;
    api.log.error(
      { name: error.name, event: "redis_realtime_error" },
      "Realtime coordination error",
    );
  });
await Promise.all([redisPublisher.connect(), redisSubscriber.connect()]);
io.adapter(createAdapter(redisPublisher, redisSubscriber));

const scheduleReminderPoller = setInterval(() => {
  void deliverDueScheduleReminders()
    .then((result) => {
      for (const notification of result.rows)
        io.to(`user:${notification.user_id}`).emit("notification:new", {
          id: notification.id,
          kind: "schedule_reminder",
          roomSlug: notification.room_slug,
        });
    })
    .catch((error) => api.log.error({ name:(error as Error).name }, "Unable to deliver schedule reminders"));
}, 60_000);
scheduleReminderPoller.unref();
void deliverDueScheduleReminders().catch((error) =>
  api.log.error({ name:(error as Error).name }, "Unable to deliver startup schedule reminders"),
);
api.addHook("onClose", async () => clearInterval(scheduleReminderPoller));

async function roomPresence(slug: string) {
  const sockets = await io.in(`room:${slug}`).fetchSockets();
  const users = sockets.map((member) => {
    const connectedUser = member.data.user as DemoUser;
    return {
      id: connectedUser.id,
      displayName: connectedUser.displayName,
      role: connectedUser.role,
    };
  });
  return { count: users.length, users };
}

async function emitRoomPresence(slug: string) {
  const payload = await roomPresence(slug);
  io.to(`room:${slug}`).emit("room:presence", payload);
  return payload;
}
io.use(async (socket, next) => {
  try {
    const user = await userForSessionToken(
      sessionTokenFromCookieHeader(socket.handshake.headers.cookie),
    );
    if (user?.role === "streamer") {
      const client = database();
      await client.connect();
      try {
        const creator = await client.query<{ status: CreatorStatus }>(
          "SELECT status FROM creator_accounts WHERE user_id=$1",
          [user.id],
        );
        if (creator.rows[0]?.status !== "ACTIVE")
          return next(new Error("creator_realtime_access_denied"));
      } finally {
        await client.end();
      }
    }
    socket.data.user = user ?? {
      id: `guest:${socket.id}`,
      handle: "public-guest",
      displayName: "Guest",
      role: "audience",
      locale: "en",
      ageAcknowledged: false,
    } satisfies DemoUser;
    socket.data.authenticated = Boolean(user);
    next();
  } catch (error) {
    next(error as Error);
  }
});
io.on("connection", (socket) => {
  runtimeMetrics.realtimeConnectionsTotal += 1;
  runtimeMetrics.realtimeConnectionsCurrent += 1;
  const user = socket.data.user as DemoUser;
  if (socket.data.authenticated) void socket.join(`user:${user.id}`);
  api.log.info(
    { socketId: socket.id, role: user.role },
    "Realtime test client connected",
  );
  let lastMessageAt = 0;
  let roomJoinWindowStart = Date.now();
  let roomJoinCount = 0;
  const joinedRoomSlugs = new Set<string>();
  socket.on("discovery:join", (done?: (payload: unknown) => void) => {
    void (async () => {
      await socket.join("discovery");
      done?.({ joined: true });
    })();
  });
  socket.on(
    "room:join",
    async (slug: string, done?: (payload: unknown) => void) => {
      const now = Date.now();
      if (now - roomJoinWindowStart > 10_000) {
        roomJoinWindowStart = now;
        roomJoinCount = 0;
      }
      roomJoinCount += 1;
      if (roomJoinCount > 20) return done?.({ error: "rate_limited" });
      api.log.info(
        { socketId: socket.id, slug },
        "Realtime room join requested",
      );
      try {
        const client = database();
        await client.connect();
        try {
          const result = await client.query(
            "SELECT r.slug,r.streamer_id,r.broadcast_state,r.broadcast_status_source FROM live_rooms r JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' WHERE r.slug=$1 AND (r.publication_status='published' OR r.streamer_id=$2 OR $3::boolean=TRUE)",
            [slug, socket.data.authenticated ? user.id : null, user.role === "admin"],
          );
          if (!result.rows[0]) return done?.({ error: "room_not_found" });
          const ownsRoom=socket.data.authenticated&&result.rows[0].streamer_id===user.id;
          const publiclyLive=result.rows[0].broadcast_state==="live"&&result.rows[0].broadcast_status_source!=="local";
          if(!ownsRoom&&user.role!=="admin"&&!publiclyLive)return done?.({error:"room_offline"});
        } finally {
          await client.end();
        }
        await socket.join(`room:${slug}`);
        joinedRoomSlugs.add(slug);
        const payload = await emitRoomPresence(slug);
        done?.(payload);
      } catch (error) {
        runtimeMetrics.realtimeErrorsTotal += 1;
        api.log.error(error, "Unable to join realtime room");
        done?.({ error: "room_join_failed" });
      }
    },
  );
  socket.on(
    "chat:send",
    async (
      payload: { roomSlug?: string; body?: string },
      done?: (result: unknown) => void,
    ) => {
      const slug = payload.roomSlug;
      const body = payload.body?.trim();
      if (!socket.data.authenticated)
        return done?.({ error: "session_required" });
      if (!slug || !socket.rooms.has(`room:${slug}`))
        return done?.({ error: "room_join_required" });
      if (!body || body.length > 500)
        return done?.({ error: "invalid_message" });
      if (user.role !== "admin" && Date.now() - lastMessageAt < 800)
        return done?.({ error: "rate_limited" });
      const client = database();
      await client.connect();
      try {
        const restriction = await client.query<{
          is_muted: boolean;
          is_banned: boolean;
        }>("SELECT is_muted, is_banned FROM users WHERE id = $1", [user.id]);
        if (restriction.rows[0]?.is_banned) return done?.({ error: "banned" });
        if (restriction.rows[0]?.is_muted) return done?.({ error: "muted" });
        const room = await client.query<{ id: string; chat_slow_mode_seconds: number; blocked_terms: string[]; broadcast_state:string; broadcast_status_source:string }>(
          "SELECT r.id,r.chat_slow_mode_seconds,r.blocked_terms,r.broadcast_state,r.broadcast_status_source FROM live_rooms r JOIN creator_accounts ca ON ca.user_id=r.streamer_id AND ca.status='ACTIVE' WHERE r.slug=$1 AND (r.publication_status='published' OR r.streamer_id=$2 OR $3::boolean=TRUE)",
          [slug, user.id, user.role === "admin"],
        );
        if (!room.rows[0]) return done?.({ error: "room_not_found" });
        if(room.rows[0].broadcast_state!=="live"||room.rows[0].broadcast_status_source==="local")return done?.({error:"room_offline"});
        const roomRestriction = await client.query<{ is_muted: boolean; is_banned: boolean; muted_until: Date | null }>(
          "SELECT is_muted,is_banned,muted_until FROM room_moderation_restrictions WHERE room_id=$1 AND user_id=$2",
          [room.rows[0].id, user.id],
        );
        if (roomRestriction.rows[0]?.is_banned)
          return done?.({ error: "banned" });
        if (roomRestriction.rows[0]?.is_muted && (!roomRestriction.rows[0].muted_until || roomRestriction.rows[0].muted_until.getTime() > Date.now()))
          return done?.({ error: "muted" });
        if (user.role === "audience" && room.rows[0].chat_slow_mode_seconds > 0 && Date.now() - lastMessageAt < room.rows[0].chat_slow_mode_seconds * 1000)
          return done?.({ error: "slow_mode", retryAfterSeconds: Math.ceil((room.rows[0].chat_slow_mode_seconds * 1000 - (Date.now() - lastMessageAt)) / 1000) });
        const normalizedBody = body.toLocaleLowerCase();
        if (user.role === "audience" && room.rows[0].blocked_terms.some((term) => normalizedBody.includes(term.toLocaleLowerCase())))
          return done?.({ error: "blocked_term" });
        lastMessageAt = Date.now();
        const messageId = crypto.randomUUID();
        await client.query(
          "INSERT INTO chat_messages (id, room_id, sender_id, body) VALUES ($1, $2, $3, $4)",
          [messageId, room.rows[0].id, user.id, body],
        );
        runtimeMetrics.chatMessagesTotal += 1;
        const message = {
          id: messageId,
          body,
          createdAt: new Date().toISOString(),
          sender: {
            id: user.id,
            displayName: user.displayName,
            handle: user.handle,
            role: user.role,
          },
        };
        io.to(`room:${slug}`).emit("chat:message", message);
        done?.({ message });
      } finally {
        await client.end();
      }
    },
  );
  socket.on("disconnect", () => {
    runtimeMetrics.realtimeConnectionsCurrent = Math.max(
      0,
      runtimeMetrics.realtimeConnectionsCurrent - 1,
    );
    for (const slug of joinedRoomSlugs)
      void emitRoomPresence(slug).catch((error) =>
        api.log.error(
          { name: (error as Error).name, slug },
          "Unable to update room presence",
        ),
      );
  });
});

await api.listen({ port: config.apiPort, host: config.apiHost });
const broadcastPoller = createBroadcastPoller({
  enabled: hasCloudflareStreamConfiguration(),
  listRooms: async () => {
    const client = database();
    await client.connect();
    try {
      const rooms = await client.query<{
        slug: string;
        cloudflare_live_input_id: string;
      }>(
        "SELECT slug,cloudflare_live_input_id FROM live_rooms WHERE cloudflare_live_input_id IS NOT NULL ORDER BY slug",
      );
      return rooms.rows.map((room) => ({
        slug: room.slug,
        liveInputId: room.cloudflare_live_input_id,
      }));
    } finally {
      await client.end();
    }
  },
  readStatus: cloudflareBroadcastStatus,
  persistStatus: persistPolledBroadcastStatus,
  onError: (error, slug) =>
    api.log.error(
      { name: (error as Error).name, slug },
      "Unable to refresh broadcast lifecycle",
    ),
});
broadcastPoller.start();
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  broadcastPoller.stop();
  api.log.info({ signal }, "Graceful shutdown started");
  await new Promise<void>((resolve) => io.close(() => resolve()));
  await api.close();
  await Promise.allSettled([
    redisPublisher.quit(),
    redisSubscriber.quit(),
    closeDatabasePool(),
  ]);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
