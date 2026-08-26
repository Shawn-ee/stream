import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify, { type FastifyReply } from "fastify";
import { timingSafeEqual } from "node:crypto";
import { createConnection } from "node:net";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { Server } from "socket.io";
import { createPlaybackUrl } from "./cloudflare-stream.js";
import {
  endWebRtcResource,
  exchangeWebRtcOffer,
  readWebRtcEndpoints,
} from "./cloudflare-webrtc.js";
import { createBroadcastPoller } from "./broadcast-poller.js";
import {
  cloudflareBroadcastStatus,
  localBroadcastStatus,
  type BroadcastStatus,
} from "./broadcast-status.js";
import {
  config,
  hasCloudflareStreamConfiguration,
  required,
} from "./config.js";
import {
  closeDatabasePool,
  database,
  databasePoolStats,
} from "./db/pool.js";
import {
  authenticateCredentials,
  createSession,
  registerAudienceAccount,
  RegistrationError,
  revokeSession,
  sessionTokenFromCookieHeader,
  userForSessionToken,
} from "./auth.js";
import { mutationSchemas } from "./validation.js";

type Role = "audience" | "streamer" | "admin";
type DemoUser = {
  id: string;
  handle: string;
  displayName: string;
  role: Role;
  locale: "en" | "zh";
  ageAcknowledged: boolean;
};
type BroadcastTransport = "obs_hls" | "browser_webrtc";
type WebRtcResource = {
  resourceUrl: string | null;
  roomSlug: string;
  userId: string;
  kind: "publish" | "playback";
  expiresAt: number;
};
const roles: Role[] = ["audience", "streamer", "admin"];
let realtime: Server | null = null;
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
      broadcast_state: string;
      broadcast_transport: BroadcastTransport;
    }>(
      "SELECT broadcast_state,broadcast_transport FROM live_rooms WHERE slug=$1 FOR UPDATE",
      [slug],
    );
    if (!previous.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }
    const changed = previous.rows[0].broadcast_state !== status.state;
    await client.query(
      "UPDATE live_rooms SET status=CASE WHEN $1::broadcast_lifecycle_state='live' THEN 'live'::room_status ELSE 'offline'::room_status END,broadcast_state=$1::broadcast_lifecycle_state,broadcast_checked_at=NOW(),broadcast_status_message=$2,updated_at=NOW() WHERE slug=$3",
      [status.state, status.message, slug],
    );
    const eventType =
      status.state === "unavailable"
        ? "broadcast_status_unavailable"
        : status.state === "live" && changed
          ? "broadcast_started"
          : previous.rows[0].broadcast_state === "live" && changed
            ? "broadcast_ended"
            : "broadcast_status_checked";
    if (changed)
      await client.query(
        "INSERT INTO room_lifecycle_events (id,room_id,state,event_type,message) SELECT $1,id,$2::broadcast_lifecycle_state,$3,$4 FROM live_rooms WHERE slug=$5",
        [crypto.randomUUID(), status.state, eventType, status.message, slug],
      );
    await client.query("COMMIT");
    if (changed) {
      const event = {
        slug,
        state: status.state,
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
  const webRtcResourcePruner = setInterval(() => {
    const now = Date.now();
    for (const [sessionId, resource] of webRtcResources) {
      if (resource.expiresAt > now) continue;
      webRtcResources.delete(sessionId);
      void endWebRtcResource(resource.resourceUrl);
    }
  }, 60_000);
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
        : request.url.includes("/reports")
          ? 20
          : request.url.includes("/gifts") || request.url.includes("/purchase")
            ? 120
            : 180;
    const loginHandle =
      request.url === "/api/auth/login"
        ? ((request.body as { handle?: string } | undefined)?.handle
            ?.trim()
            .toLowerCase() ?? "missing")
        : "";
    const key = `${request.ip}:${request.method}:${request.routeOptions.url ?? request.url}:${loginHandle}`;
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
    if (user.role !== role)
      return reply.code(403).send({ error: "role_required", role });
    return user;
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
      return { status: "ready", database: "ok", redis: "ok" };
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
    if (
      !["POST", "PUT", "PATCH", "DELETE"].includes(request.method) ||
      ["/api/auth/login", "/api/auth/register"].includes(request.url)
    )
      return;
    if (!request.url.startsWith("/api/")) return;
    const cookieToken = request.cookies.stream_csrf;
    const headerToken = request.headers["x-csrf-token"];
    if (
      !cookieToken ||
      typeof headerToken !== "string" ||
      headerToken !== cookieToken
    )
      return reply.code(403).send({ error: "csrf_validation_failed" });
  });
  api.get("/api/auth/session", async (request) => ({
    user: await currentUser(request),
  }));
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
        const session = await createSession(user.id);
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
      const session = await createSession(user.id);
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
  api.get<{ Querystring: { q?: string; category?: string } }>(
    "/api/rooms",
    async (request, reply) => {
      const client = database();
      await client.connect();
      try {
        const query = request.query.q?.trim() ?? "";
        const category = request.query.category?.trim() ?? "";
        const result = await client.query(
          `SELECT r.slug, r.title, r.status, r.broadcast_state, r.broadcast_checked_at, r.broadcast_status_message, r.goal_text, u.id AS streamer_id, u.display_name AS streamer_name, p.category, p.bio, p.schedule_text, (SELECT COUNT(*)::int FROM follows f WHERE f.streamer_id=u.id) AS follower_count FROM live_rooms r JOIN users u ON u.id = r.streamer_id JOIN streamer_profiles p ON p.user_id = u.id WHERE ($1='' OR r.title ILIKE '%' || $1 || '%' OR u.display_name ILIKE '%' || $1 || '%') AND ($2='' OR p.category=$2) ORDER BY r.status = 'live' DESC, r.title LIMIT 100`,
          [query, category],
        );
        return { rooms: result.rows };
      } finally {
        await client.end();
      }
    },
  );
  api.get("/api/discovery/categories", async () => {
    const client = database();
    await client.connect();
    try {
      const result = await client.query(
        "SELECT DISTINCT category FROM streamer_profiles ORDER BY category LIMIT 100",
      );
      return { categories: result.rows.map((row) => row.category) };
    } finally {
      await client.end();
    }
  });
  api.get<{ Params: { streamerId: string } }>(
    "/api/streamers/:streamerId",
    async (request, reply) => {
      const client = database();
      await client.connect();
      try {
        const result = await client.query(
          "SELECT u.id,u.handle,u.display_name,p.bio,p.category,p.schedule_text,COALESCE((SELECT COUNT(*) FROM follows f WHERE f.streamer_id=u.id),0)::int AS follower_count,r.slug AS room_slug,r.status AS room_status FROM users u JOIN streamer_profiles p ON p.user_id=u.id LEFT JOIN live_rooms r ON r.streamer_id=u.id WHERE u.id=$1 AND u.role='streamer'",
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
      const client = database();
      await client.connect();
      try {
        await client.query(
          "INSERT INTO follows (follower_id,streamer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
          [viewer.id, request.params.streamerId],
        );
        await client.query(
          "INSERT INTO notifications (id,user_id,kind,title,body) VALUES ($1,$2,'follow','Following updated','You are following a test streamer.')",
          [crypto.randomUUID(), viewer.id],
        );
        return { following: true };
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
        await client.query(
          "DELETE FROM follows WHERE follower_id=$1 AND streamer_id=$2",
          [viewer.id, request.params.streamerId],
        );
        return reply.code(204).send();
      } finally {
        await client.end();
      }
    },
  );
  api.get("/api/me/notifications", async (request, reply) => {
    const viewer = await currentUser(request);
    if (!viewer)
      return reply.code(401).send({ error: "demo_session_required" });
    const client = database();
    await client.connect();
    try {
      const result = await client.query(
        "SELECT id,kind,title,body,read_at,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",
        [viewer.id],
      );
      return { notifications: result.rows };
    } finally {
      await client.end();
    }
  });
  api.get("/api/me/history", async (request, reply) => {
    const viewer = await currentUser(request);
    if (!viewer)
      return reply.code(401).send({ error: "demo_session_required" });
    const client = database();
    await client.connect();
    try {
      const result = await client.query(
        "SELECT DISTINCT ON (r.id) r.slug,r.title,u.display_name AS streamer_name,v.visited_at FROM room_visits v JOIN live_rooms r ON r.id=v.room_id JOIN users u ON u.id=r.streamer_id WHERE v.user_id=$1 ORDER BY r.id,v.visited_at DESC LIMIT 20",
        [viewer.id],
      );
      return { rooms: result.rows };
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
          `SELECT r.slug, r.title, r.status, r.broadcast_state, r.broadcast_checked_at, r.broadcast_status_message, r.broadcast_transport, r.cloudflare_live_input_id, u.display_name AS streamer_name, p.category, p.bio, p.schedule_text FROM live_rooms r JOIN users u ON u.id = r.streamer_id JOIN streamer_profiles p ON p.user_id = u.id WHERE r.slug = $1`,
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
  api.post<{ Params: { slug: string } }>(
    "/api/rooms/:slug/visit",
    async (request, reply) => {
      const viewer = await currentUser(request);
      if (!viewer)
        return reply.code(401).send({ error: "demo_session_required" });
      const client = database();
      await client.connect();
      try {
        const room = await client.query<{ id: string }>(
          "SELECT id FROM live_rooms WHERE slug=$1",
          [request.params.slug],
        );
        if (!room.rows[0])
          return reply.code(404).send({ error: "room_not_found" });
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
      const user = await currentUser(request);
      if (!user)
        return reply.code(401).send({ error: "demo_session_required" });
      const client = database();
      await client.connect();
      try {
        const result = await client.query(
          "SELECT m.id,m.body,m.created_at,u.display_name,u.role FROM chat_messages m JOIN live_rooms r ON r.id=m.room_id JOIN users u ON u.id=m.sender_id WHERE r.slug=$1 ORDER BY m.created_at DESC LIMIT 40",
          [request.params.slug],
        );
        return {
          messages: result.rows.reverse().map((message) => ({
            id: message.id,
            body: message.body,
            createdAt: message.created_at,
            sender: { displayName: message.display_name, role: message.role },
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
        "SELECT id FROM live_rooms WHERE slug=$1",
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
          "SELECT broadcast_state,broadcast_checked_at,broadcast_status_message,broadcast_transport FROM live_rooms WHERE slug=$1",
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
      if (!hasCloudflareStreamConfiguration())
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
          expiresAt: Date.now() + 3 * 60_000,
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
      return reply.code(204).send();
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
      resource.expiresAt = Date.now() + 3 * 60_000;
      const client = database();
      await client.connect();
      try {
        await client.query(
          "UPDATE broadcast_sessions SET updated_at=NOW() WHERE id=$1 AND creator_id=$2 AND state IN ('connecting','active')",
          [request.params.sessionId, streamer.id],
        );
      } finally {
        await client.end();
      }
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
            message: `Local development fallback reports ${requested} broadcast.`,
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
      if (!user)
        return reply.code(401).send({ error: "demo_session_required" });
      if (!hasCloudflareStreamConfiguration())
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
          "SELECT id,cloudflare_live_input_id,broadcast_state,broadcast_transport FROM live_rooms WHERE slug=$1",
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
        if (privateShow.rows[0] && user.role === "audience") {
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
        const exchange = await exchangeWebRtcOffer(endpoints.playbackUrl, offerSdp);
        const sessionId = crypto.randomUUID();
        webRtcResources.set(sessionId, {
          resourceUrl: exchange.resourceUrl,
          roomSlug: request.params.slug,
          userId: user.id,
          kind: "playback",
          expiresAt: Date.now() + 3 * 60_000,
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
      if (!user)
        return reply.code(401).send({ error: "demo_session_required" });
      const resource = webRtcResources.get(request.params.sessionId);
      if (
        !resource ||
        resource.kind !== "playback" ||
        resource.roomSlug !== request.params.slug ||
        resource.userId !== user.id
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
      if (!user)
        return reply.code(401).send({ error: "demo_session_required" });
      const resource = webRtcResources.get(request.params.sessionId);
      if (
        !resource ||
        resource.kind !== "playback" ||
        resource.roomSlug !== request.params.slug ||
        resource.userId !== user.id
      )
        return reply.code(404).send({ error: "playback_session_not_found" });
      resource.expiresAt = Date.now() + 3 * 60_000;
      return reply.code(204).send();
    },
  );
  api.get<{ Params: { slug: string } }>(
    "/api/rooms/:slug/playback",
    async (request, reply) => {
      const user = await currentUser(request);
      if (!user)
        return reply.code(401).send({ error: "demo_session_required" });
      const client = database();
      await client.connect();
      try {
        const result = await client.query<{
          cloudflare_live_input_id: string | null;
          broadcast_state: string;
          broadcast_transport: BroadcastTransport;
        }>(
          "SELECT cloudflare_live_input_id,broadcast_state,broadcast_transport FROM live_rooms WHERE slug=$1",
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
        if (privateShow.rows[0] && user.role === "audience") {
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
  api.get("/api/gifts", async () => {
    const client = database();
    await client.connect();
    try {
      const result = await client.query(
          "SELECT id,name_en,name_zh,coin_cost,animation_key FROM gift_catalog WHERE is_active=TRUE ORDER BY coin_cost LIMIT 100",
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
        const result = await client.query(
          "SELECT a.id,a.title,a.coin_cost,a.duration_label,a.display_order,r.goal_text,r.goal_target,r.goal_progress FROM room_actions a JOIN live_rooms r ON r.id=a.room_id WHERE r.slug=$1 AND a.is_active=TRUE ORDER BY a.display_order LIMIT 50",
          [request.params.slug],
        );
        if (!result.rows.length) {
          const room = await client.query(
            "SELECT goal_text,goal_target,goal_progress FROM live_rooms WHERE slug=$1",
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
      }>(
        "SELECT a.id,a.coin_cost,a.title,r.streamer_id,r.id room_id FROM room_actions a JOIN live_rooms r ON r.id=a.room_id WHERE r.slug=$1 AND a.id=$2 AND a.is_active=TRUE FOR UPDATE",
        [request.params.slug, request.params.actionId],
      );
      const item = action.rows[0];
      if (!item) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "action_not_found" });
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
    Body: { giftId?: string; idempotencyKey?: string };
  }>(
    "/api/rooms/:slug/gifts",
    { schema: { body: mutationSchemas.giftPurchase } },
    async (request, reply) => {
    const sender = (await requireRole(request, reply, "audience")) as
      DemoUser | undefined;
    if (!sender) return;
    const giftId = request.body?.giftId;
    const idempotencyKey = request.body?.idempotencyKey;
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
        return { duplicate: true, giftId: existing.rows[0].id };
      }
      const room = await client.query<{ id: string; streamer_id: string }>(
        "SELECT id, streamer_id FROM live_rooms WHERE slug = $1",
        [request.params.slug],
      );
      const gift = await client.query<{
        id: string;
        coin_cost: number;
        name_en: string;
        name_zh: string;
        animation_key: string;
      }>(
        "SELECT id, coin_cost, name_en, name_zh, animation_key FROM gift_catalog WHERE id = $1 AND is_active = TRUE",
        [giftId],
      );
      if (!room.rows[0] || !gift.rows[0]) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "room_or_gift_not_found" });
      }
      const balance = await client.query<{ balance: string }>(
        "SELECT COALESCE(SUM(amount), 0)::text AS balance FROM (SELECT amount FROM wallet_ledger WHERE user_id = $1 FOR UPDATE) AS locked_entries",
        [sender.id],
      );
      if (Number(balance.rows[0].balance) < gift.rows[0].coin_cost) {
        await client.query("ROLLBACK");
        return reply.code(409).send({ error: "insufficient_test_coins" });
      }
      const id = crypto.randomUUID();
      await client.query(
        "INSERT INTO gifts (id, room_id, sender_id, recipient_id, gift_id, coin_cost, idempotency_key) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [
          id,
          room.rows[0].id,
          sender.id,
          room.rows[0].streamer_id,
          giftId,
          gift.rows[0].coin_cost,
          idempotencyKey,
        ],
      );
      await client.query(
        "INSERT INTO wallet_ledger (id,user_id,entry_type,amount,idempotency_key,reference_type,reference_id) VALUES ($1,$2,'gift_sent',$3,$4,'gift',$5),($6,$7,'gift_received',$8,$9,'gift',$5)",
        [
          crypto.randomUUID(),
          sender.id,
          -gift.rows[0].coin_cost,
          `${idempotencyKey}:sent`,
          id,
          crypto.randomUUID(),
          room.rows[0].streamer_id,
          gift.rows[0].coin_cost,
          `${idempotencyKey}:received`,
        ],
      );
      const goal = await client.query(
        "UPDATE live_rooms SET goal_progress=goal_progress+$1 WHERE id=$2 RETURNING goal_text,goal_target,goal_progress",
        [gift.rows[0].coin_cost, room.rows[0].id],
      );
      await client.query("COMMIT");
      const event = {
        id,
        name: gift.rows[0].name_en,
        cost: gift.rows[0].coin_cost,
        animationKey: gift.rows[0].animation_key,
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
    if (
      !targetId ||
      !action ||
      !["mute", "ban", "unmute", "unban"].includes(action)
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
        `UPDATE users SET ${flag} = $1, updated_at = NOW() WHERE id = $2 RETURNING id, display_name`,
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
          reason ?? null,
        ],
      );
      const event = {
        action,
        targetId,
        targetName: target.rows[0].display_name,
        reason: reason ?? null,
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
    Body: { targetId?: string; action?: "mute" | "unmute" };
  }>("/api/streamer/rooms/:slug/moderation", async (request, reply) => {
    const streamer = (await requireRole(request, reply, "streamer")) as
      DemoUser | undefined;
    if (!streamer) return;
    const { targetId, action } = request.body ?? {};
    if (!targetId || !action || !["mute", "unmute"].includes(action))
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
      const target = await client.query<{ display_name: string }>(
        "SELECT display_name FROM users WHERE id=$1 AND role='audience'",
        [targetId],
      );
      if (!target.rows[0])
        return reply.code(404).send({ error: "audience_target_not_found" });
      const muted = action === "mute";
      await client.query(
        "INSERT INTO room_moderation_restrictions (room_id,user_id,is_muted) VALUES ($1,$2,$3) ON CONFLICT (room_id,user_id) DO UPDATE SET is_muted=EXCLUDED.is_muted,updated_at=NOW()",
        [room.rows[0].id, targetId, muted],
      );
      await client.query(
        "INSERT INTO moderation_events (id,room_id,actor_id,target_id,action,reason) VALUES ($1,$2,$3,$4,$5,$6)",
        [
          crypto.randomUUID(),
          room.rows[0].id,
          streamer.id,
          targetId,
          `creator_${action}`,
          "local creator moderation",
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
      if (!viewer)
        return reply.code(401).send({ error: "demo_session_required" });
      const client = database();
      await client.connect();
      try {
        const result = await client.query<{
          id: string;
          mode: "ticket" | "per_minute";
          ticket_cost: number;
          per_minute_cost: number;
          status: string;
        }>(
          "SELECT s.id,s.mode,s.ticket_cost,s.per_minute_cost,s.status FROM private_show_sessions s JOIN live_rooms r ON r.id=s.room_id WHERE r.slug=$1 AND s.status='live'",
          [request.params.slug],
        );
        const session = result.rows[0];
        if (!session) return { active: false };
        const access = await client.query<{ expires_at: Date | null }>(
          "SELECT expires_at FROM private_show_access WHERE session_id=$1 AND viewer_id=$2 AND (expires_at IS NULL OR expires_at > NOW())",
          [session.id, viewer.id],
        );
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
          "SELECT s.id,s.mode,s.ticket_cost,s.per_minute_cost,r.streamer_id FROM private_show_sessions s JOIN live_rooms r ON r.id=s.room_id WHERE r.slug=$1 AND s.status='live' FOR UPDATE",
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
        "SELECT r.slug,r.title,r.status,r.broadcast_state,r.broadcast_checked_at,r.broadcast_status_message,r.broadcast_transport,r.goal_text,r.goal_target,r.goal_progress,r.private_show_enabled,r.private_show_mode,r.private_show_ticket_cost,r.private_show_per_minute_cost,p.bio,p.category,p.schedule_text,COALESCE((SELECT SUM(amount) FROM wallet_ledger w WHERE w.user_id=r.streamer_id AND w.reference_type IN ('gift','private_show','room_action')),0)::int AS test_earnings,COALESCE((SELECT COUNT(*) FROM follows f WHERE f.streamer_id=r.streamer_id),0)::int AS followers FROM live_rooms r JOIN streamer_profiles p ON p.user_id=r.streamer_id WHERE r.streamer_id=$1",
        [user.id],
      );
      return {
        user,
        room: result.rows[0] ?? null,
        broadcastControls: {
          localFallbackEnabled: config.nodeEnv !== "production",
          cloudflareConfigured: hasCloudflareStreamConfiguration(),
          browserQuickLiveAvailable: hasCloudflareStreamConfiguration(),
        },
      };
    } finally {
      await client.end();
    }
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
        return {
          goal: room.rows[0],
          stats: stats.rows[0],
          recent: recent.rows,
          topSupporter: top.rows[0] ?? null,
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
        const stats = totals.rows[0];
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
      const viewer = await requireRole(request, reply, "audience");
      if (!viewer) return;
      const client = database();
      await client.connect();
      try {
        const result = await client.query(
          "SELECT * FROM (SELECT u.display_name AS sender,gc.name_en AS label,g.coin_cost,'gift'::text AS support_type,g.created_at FROM gifts g JOIN users u ON u.id=g.sender_id JOIN gift_catalog gc ON gc.id=g.gift_id JOIN live_rooms r ON r.id=g.room_id WHERE r.slug=$1 UNION ALL SELECT u.display_name AS sender,a.title AS label,p.coin_cost,'action'::text AS support_type,p.created_at FROM room_action_purchases p JOIN room_actions a ON a.id=p.action_id JOIN users u ON u.id=p.viewer_id JOIN live_rooms r ON r.id=a.room_id WHERE r.slug=$1) support ORDER BY created_at DESC LIMIT 6",
          [request.params.slug],
        );
        return { support: result.rows };
      } finally {
        await client.end();
      }
    },
  );
  api.put<{ Body: { bio?: string; category?: string; scheduleText?: string } }>(
    "/api/streamer/profile",
    async (request, reply) => {
      const streamer = (await requireRole(request, reply, "streamer")) as
        DemoUser | undefined;
      if (!streamer) return;
      const bio = request.body?.bio?.trim();
      const category = request.body?.category?.trim();
      const schedule = request.body?.scheduleText?.trim();
      if (
        (!bio && !category && !schedule) ||
        (bio && bio.length > 500) ||
        (category && category.length > 60) ||
        (schedule && schedule.length > 160)
      )
        return reply.code(400).send({ error: "invalid_profile_metadata" });
      const client = database();
      await client.connect();
      try {
        const update = await client.query(
          "UPDATE streamer_profiles SET bio=COALESCE($1,bio),category=COALESCE($2,category),schedule_text=COALESCE($3,schedule_text) WHERE user_id=$4 RETURNING bio,category,schedule_text",
          [bio ?? null, category ?? null, schedule ?? null, streamer.id],
        );
        return { profile: update.rows[0] };
      } finally {
        await client.end();
      }
    },
  );
  api.put<{
    Params: { slug: string };
    Body: { title?: string; goalText?: string; goalTarget?: number };
  }>("/api/streamer/rooms/:slug", async (request, reply) => {
    const streamer = (await requireRole(request, reply, "streamer")) as
      DemoUser | undefined;
    if (!streamer) return;
    const title = request.body?.title?.trim();
    const goal = request.body?.goalText?.trim();
    const goalTarget = request.body?.goalTarget;
    if (
      (!title && !goal && goalTarget === undefined) ||
      (title && title.length > 120) ||
      (goal && goal.length > 300) ||
      (goalTarget !== undefined &&
        (!Number.isInteger(goalTarget) ||
          goalTarget < 1 ||
          goalTarget > 1000000))
    )
      return reply.code(400).send({ error: "invalid_room_metadata" });
    const client = database();
    await client.connect();
    try {
      const update = await client.query(
        "UPDATE live_rooms SET title=COALESCE($1,title),goal_text=COALESCE($2,goal_text),goal_target=COALESCE($3,goal_target),updated_at=NOW() WHERE slug=$4 AND streamer_id=$5 RETURNING title,goal_text,goal_target,goal_progress",
        [
          title ?? null,
          goal ?? null,
          goalTarget ?? null,
          request.params.slug,
          streamer.id,
        ],
      );
      if (!update.rows[0])
        return reply.code(404).send({ error: "streamer_room_not_found" });
      return { room: update.rows[0] };
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
        "SELECT r.slug,r.title,r.broadcast_state,r.broadcast_checked_at,r.broadcast_status_message,u.display_name AS streamer_name FROM live_rooms r JOIN users u ON u.id=r.streamer_id ORDER BY r.title LIMIT 100",
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
    if (!user) return next(new Error("session_required"));
    socket.data.user = user;
    next();
  } catch (error) {
    next(error as Error);
  }
});
io.on("connection", (socket) => {
  runtimeMetrics.realtimeConnectionsTotal += 1;
  runtimeMetrics.realtimeConnectionsCurrent += 1;
  const user = socket.data.user as DemoUser;
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
            "SELECT slug FROM live_rooms WHERE slug = $1",
            [slug],
          );
          if (!result.rows[0]) return done?.({ error: "room_not_found" });
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
      if (!slug || !socket.rooms.has(`room:${slug}`))
        return done?.({ error: "room_join_required" });
      if (!body || body.length > 500)
        return done?.({ error: "invalid_message" });
      if (user.role !== "admin" && Date.now() - lastMessageAt < 800)
        return done?.({ error: "rate_limited" });
      lastMessageAt = Date.now();
      const client = database();
      await client.connect();
      try {
        const restriction = await client.query<{
          is_muted: boolean;
          is_banned: boolean;
        }>("SELECT is_muted, is_banned FROM users WHERE id = $1", [user.id]);
        if (restriction.rows[0]?.is_banned) return done?.({ error: "banned" });
        if (restriction.rows[0]?.is_muted) return done?.({ error: "muted" });
        const room = await client.query<{ id: string }>(
          "SELECT id FROM live_rooms WHERE slug = $1",
          [slug],
        );
        if (!room.rows[0]) return done?.({ error: "room_not_found" });
        const roomRestriction = await client.query<{ is_muted: boolean }>(
          "SELECT is_muted FROM room_moderation_restrictions WHERE room_id=$1 AND user_id=$2",
          [room.rows[0].id, user.id],
        );
        if (roomRestriction.rows[0]?.is_muted)
          return done?.({ error: "muted" });
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
  persistStatus: persistBroadcastStatus,
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
