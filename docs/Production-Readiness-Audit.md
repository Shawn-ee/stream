# Production Readiness Audit

## Baseline

Audit date: 2026-08-23. Scope: current local repository versus the deployable 100-concurrent-user goal. This is a code/configuration audit, not a production certification.

## P0 findings

1. **Identity is client-selectable.** HTTP requests trust an unsigned `demo_role` cookie and WebSockets accept `handshake.auth.demoRole`; either permits role impersonation. Replace both with database-backed server sessions and reject client-declared identities.
2. **No production session lifecycle.** There is no password verification, session expiry/revocation, secure production cookie policy, or CSRF defense.
3. **Runtime is not deployable.** Only PostgreSQL and Redis are containerized. There are no production API/web images, reverse proxy, TLS boundary, readiness sequencing, or rollback package.
4. **Database access is connection-per-operation.** Each request creates a new PostgreSQL client; this is unsuitable for 100 concurrent active users without pooling and connection limits.
5. **Realtime state is process-local.** Presence and Socket.IO broadcasts cannot safely span multiple API processes; Redis is currently connectivity-only.
6. **Capacity is unmeasured.** There is no load suite, threshold definition, or evidence for 100 concurrent active users.

## P1 findings

1. CORS and Socket.IO origins are hard-coded to local Vite; trusted-proxy and production origin handling are absent.
2. Mutation routes use ad-hoc validation; request body limits, endpoint rate limits, and security headers are incomplete.
3. Health is shallow and there is no dependency-aware readiness endpoint.
4. Logs are structured by Fastify, but redaction, production log policy, metrics, graceful shutdown evidence, and alerting are incomplete.
5. Discovery and several admin queries are not paginated; some feeds are bounded but limits are inconsistent.
6. Backups, restore drills, migrations during deploy, and rollback procedures are not automated or verified.
7. Automated checks cover core workflows well, but security, concurrency, load, backup/restore, and clean production image tests are missing.

## Existing strengths

- Cloudflare Stream cleanly owns video ingest/transcoding/delivery; application servers do not relay video.
- Role checks exist on most privileged HTTP routes and creator room ownership is generally enforced.
- Gifts/actions/private access use transactional, idempotent test-ledger writes.
- Local migrations, deterministic demo reset, lifecycle safety, realtime workflow tests, and the staging gate provide a useful regression foundation.
- Cloudflare credentials are server-side and production-impacting actions remain explicit approval gates.

## Ordered remediation

1. Database-backed synthetic-account authentication and server-validated WebSocket identity.
2. CSRF/session/cookie hardening and security-focused regression tests.
3. Central request limits, rate limits, origin policy, safe errors, and security headers.
4. Production images, reverse proxy, readiness, backup/restore, migration, and rollback package.
5. PostgreSQL pool, Redis Socket.IO adapter, bounded queries/events, and multi-process-safe presence design.
6. Gradual local load suite through 100 concurrent synthetic users, followed by final readiness evidence.

## Closure status — 2026-08-24

All listed P0 findings and implementation-test gaps are remediated for the private local launch-candidate boundary. Identity/session, API security, production packaging, browser/server secret separation, pooling, Redis multi-process realtime, bounded queries, backup/restore, physical media delivery, human acceptance criteria, and 100-user evidence are covered by repeatable checks or recorded proof. External TLS/host hardening, managed monitoring and backups, real customer identity lifecycle, OBS-specific UI/human media quality, and every public/commercial/compliance action remain explicit owner-gated work rather than closed production claims. See `Deployability-Report.md`, `Launch-Acceptance-Checklist.md`, and `100-User-Load-Report.md`.
