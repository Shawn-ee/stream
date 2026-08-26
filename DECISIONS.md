# Architecture Decisions

## 2026-08-23 - Local-first monorepo

The MVP uses TypeScript workspaces: a React/Vite client, Fastify API, PostgreSQL, Redis, and Docker for stateful services. Applications run on the Windows host during development; PostgreSQL and Redis bind only to localhost.

## 2026-08-23 - Video boundary

Cloudflare Stream owns live ingest, transcoding, and delivery. The API owns authorization, metadata, chat, balances, gifts, and moderation. Cloudflare credentials are server-side only.

## 2026-08-23 - Test-only commercial boundary

Balances and gifts are fake, non-monetary test data. Payments, cashouts, real authentication, KYC, and launch compliance are out of scope until explicitly approved.

## 2026-08-23 - Expanded product direction

The product is a Stripchat-inspired streaming-business prototype, not a copy. It will implement comparable major workflows, including discovery, creator tools, variable-value gifts, private shows, audience history, and admin operations, using original visual design and code. Private-show tickets and per-minute access remain test-coin simulations until the owner approves a separate legal, payment, and compliance phase.

## 2026-08-23 - Harness Engineer reference loop

Future product expansion uses a deliberate reference-derived loop rather than unstructured feature copying. Each visible reference feature receives a P0/P1/P2/P3 importance classification, a rationale, a simplified local proposal, explicit verification, and a recorded outcome. In-scope test-only P0/P1 work may proceed autonomously after a concise owner-facing note; P2 is deferred; P3 and all production/payment/identity/compliance changes require owner direction. The stop condition is a coherent simpler product, not feature parity.

## 2026-08-23 - Midnight Aurora visual system (P1)

The local prototype uses an original dark visual system: `#0B1020` background, `#151B2E` surfaces, `#202A44` raised surfaces, `#7C5CFC` primary violet, `#FF4D6D` live coral, `#F6B73C` gift gold, and state-specific green/red accents. Video remains near-black and visually dominant. This is a product identity decision, not a copy of Stripchat styling or assets.

## 2026-08-23 - Read-only admin test-transaction audit (P1)

The admin dashboard may view the latest gift and private-show entries from the local append-only test ledger. This projection is restricted to the demo admin role and intentionally excludes real financial data, payout controls, balance adjustments, exports, and production reporting.

## 2026-08-23 - Broadcast lifecycle status (P0)

`live`, `connecting`, `offline`, and `unavailable` are stored as separate normalized lifecycle states. Cloudflare is read only when a creator explicitly refreshes status; regular local work uses a labeled local fallback and cannot claim a stream is live after a status failure. Only signed playback is returned for the `live` state.

Cloudflare normalization reads only `result.status.current.state`. Historical states are audit context and must never determine current room availability; current `disconnected` takes precedence over any earlier `connected` record.

## 2026-08-24 - Owner-approved physical media proof

With immediate owner approval, the existing Logitech camera and microphone were encoded by the preinstalled FFmpeg tool into the existing Cloudflare RTMPS Live Input. Signed playback contained both audio and video tracks, lifecycle transitioned live then offline, and no Cloudflare resource or setting changed. OBS-specific UI remains untested because OBS is not installed.

## 2026-08-23 - Test action menu and contribution goal (P0)

Creator actions are room-scoped, creator-owned test-coin prompts with a short title, optional duration label, active state, and display order. A purchase is idempotent and records paired local ledger entries before advancing one shared room goal. Gifts and actions both qualify for the goal, while the audience UI keeps their controls and feedback distinct. This is a local product interaction model only: no adult-content taxonomy, payment, hardware integration, cashout, or external action service is implied.

## 2026-08-23 - Local creator session insights (P1)

Creator insights are a read-only, room-owner-only projection of existing local gifts and action purchases. They summarize test-coin support, action use, one top supporter, recent activity, current room presence, and the existing goal. The public room feed intentionally exposes only a display name, support type, item label, and test-coin value. No cross-room analytics, tracking, exports, real financial data, or personal data is collected.

## 2026-08-23 - OBS broadcast-readiness boundary (P0)

The platform does not capture camera or microphone media in the browser. Creators configure those sources inside OBS, while the app only provides non-secret readiness guidance and a read-only lifecycle refresh. A real camera/audio test is owner-assisted and requires immediate explicit confirmation before a Cloudflare Stream broadcast starts; its result is verified through truthful lifecycle and audience playback behavior.

## 2026-08-23 - Deployable 100-user target

The product goal is now a deployable, owner-controlled launch candidate designed and load-tested for 100 concurrent active users. Cloudflare Stream remains responsible for video delivery; application capacity covers APIs, PostgreSQL, Redis, and realtime connections. Production deployment is a staged, evidence-based outcome rather than automatic permission to launch; payment, age/KYC, legal/compliance, public exposure, and Cloudflare configuration/spend remain separate approval gates.

## 2026-08-24 - Database-backed synthetic identity

Local test accounts now authenticate with scrypt-hashed synthetic passwords and opaque, hashed, expiring server sessions. HTTP and WebSocket authorization derive identity from the same session; client-declared roles are rejected. A strict same-site session cookie plus double-submit CSRF token protects mutations. No real identity data or external provider is involved.

## 2026-08-24 - Local security and readiness boundary

The API enforces a bounded request body, production-configurable origin and proxy trust, fixed-window mutation limits, bounded Socket.IO payloads and room joins, safe error envelopes, and baseline security headers. `/health` remains a process liveness signal while `/ready` verifies PostgreSQL and Redis dependencies.

## 2026-08-24 - Reproducible private deployment boundary

The launch-candidate topology is compiled into separate API and web images and orchestrated with PostgreSQL, Redis, one-shot migrations, readiness checks, and a same-origin reverse proxy. The gateway binds to localhost by default; external TLS, public exposure, DNS, Linux host changes, managed secrets, and monitoring remain owner-gated operations.

## 2026-08-24 - 100-user application capacity evidence

The API uses a 20-connection PostgreSQL pool and Redis-backed Socket.IO coordination. Cluster-aware presence was proven across two API processes. A predefined stepped local workload passed with 100 authenticated active sockets, zero unexpected disconnects, bounded latency/resources, offline playback authorization, cross-role denial, and exactly-once test-ledger mutation under a ten-request duplicate race. This evidence covers the application layer, not Cloudflare video capacity or an internet soak.

## 2026-08-24 - Private operational telemetry boundary

Machine-readable metrics use a constant-time bearer-token check and a non-proxied `/internal/metrics` route. The endpoint exposes bounded process, HTTP, realtime, PostgreSQL-pool, and Redis signals without user, wallet, credential, or Cloudflare data. Initial alert thresholds are documented but no external monitoring or notification service is connected without owner approval.

## 2026-08-26 - Individual audience registration boundary

Private staging may create individual audience accounts using a non-email ASCII handle, display name, and scrypt-hashed password. Handles are normalized to lowercase and uniquely enforced by the database; registration is rate-limited by source address and always assigns the audience role. New accounts receive no test coins automatically. Creator/admin elevation, email delivery, OAuth, recovery, MFA, real personal-data collection, public exposure, and commercial identity claims remain separate approval-gated milestones.
