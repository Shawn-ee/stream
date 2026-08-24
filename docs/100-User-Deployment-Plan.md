# 100-User Deployable Product Plan

## Current state

The repository now contains the core bilingual product workflow, secure synthetic-account sessions, a digest-locked production Docker topology, operational verification, and a passing local 100-concurrent-user workload. The local application-source candidate is commit `4cadd6a631544377b826ea998dcd1102d5f5799c` and still requires publication approval. No Linux host has been selected or approved, so host-specific TLS, secret storage, backup destination, monitoring delivery, soak behavior, and rollback evidence remain unproven.

## Phase A — Finish essential product proof

1. Owner-assisted OBS camera/microphone broadcast to Cloudflare Stream; verify creator status and audience video/audio end to end.
2. Finish P0/P1 creator and viewer workflow polish only where it removes a real usability gap.
3. Turn the existing local browser checks into a concise repeatable acceptance checklist.

**Exit:** an owner can broadcast through OBS, an audience can watch and interact, and all local staging checks pass.

**Current evidence:** product workflows, bilingual browser checks, physical camera/microphone delivery through the existing Cloudflare input, signed playback tracks, and the Cloudflare-free staging gate have passed. OBS-specific controls were not tested because OBS is not installed; the equivalent encoder path is proven and the repeatable human pass is in `Launch-Acceptance-Checklist.md`.

## Phase B — Production application security

1. Replace dummy demo sessions and WebSocket role claims with secure authentication and server-validated sessions.
2. Add account lifecycle controls: verified email or approved OAuth, password reset if passwords are used, account deletion/export policy, and creator/admin authorization boundaries.
3. Add rate limits, request-size limits, CSRF/CORS policy, secure cookies, security headers, validation review, and abuse-safe chat/report limits.
4. Add audit-friendly administrative access controls and remove local-only broadcast-state override controls from production builds.

**Exit:** no dummy role can obtain creator/admin access; automated authorization and abuse tests pass.

**Current evidence:** database-backed hashed synthetic credentials, opaque expiring/revocable sessions, server-derived WebSocket identity, CSRF/origin/cookie defenses, role/ownership tests, abuse limits, safe errors, and log-redaction checks pass. Real customer email/OAuth, recovery, MFA, deletion/export, and credential-operations policy remain a separately approved pre-public-launch identity milestone.

## Phase C — Deployable Linux environment

1. Separate local, staging, and production environment files; store secrets outside Git and rotate the exposed test token before any production use.
2. Package API, web, PostgreSQL, Redis, and reverse proxy as reproducible Docker services.
3. Add HTTPS, trusted-proxy configuration, health/readiness endpoints, migration sequencing, structured logging, and error reporting.
4. Document database backups, encrypted off-host backup storage, restore drill, upgrades, rollbacks, and incident recovery.

**Exit:** a new Linux host can deploy a private staging instance and recover its database from a tested backup.

**Current evidence:** packaging, migration ordering, production-environment validation, readiness, localhost-only gateway, and disposable backup/restore are locally verified. Repeating that evidence on a selected Linux host requires the explicit approval in `Private-Staging-Approval-Checklist.md`.

## Phase D — 100-concurrent-user readiness

1. Use Redis for Socket.IO coordination when more than one API process is needed; make presence and room broadcasts safe across instances.
2. Add database indexes, connection pooling, pagination, and bounded histories/feeds; review costly queries.
3. Apply endpoint, websocket, and room join limits; cap fan-out and payload sizes.
4. Create a load suite for 100 concurrent active users: room discovery, joins, chat, support events, and read-only playback authorization.
5. Establish capacity limits and success thresholds before testing; measure latency, errors, CPU/RAM, database connections, Redis usage, and websocket disconnects.
6. Add basic dashboards and alerts for availability, error rate, database health, realtime connections, and Cloudflare playback failures reported by the API.

**Exit:** 100 concurrent active users meet the agreed thresholds in a staging environment, with no data corruption, authorization leak, or sustained error condition.

**Current evidence:** the exact digest-locked production topology passed the predefined local 100-user thresholds with zero unexpected disconnects and exactly-once mutation behavior. A host-specific multi-hour staging soak remains owner-gated.

## Phase E — Limited launch gate

1. Owner reviews security, backup/restore, load-test, monitoring, and operational evidence.
2. Obtain legal/compliance direction appropriate to actual content, jurisdictions, age restrictions, privacy, and payments.
3. Add real payment/cashout, KYC, enforceable age verification, or public access only as separate approved milestones.
4. Deploy privately first, observe operations, then decide whether public launch is appropriate.

## What 100 users does and does not mean

The target is **100 concurrent active application users**. Cloudflare Stream carries video bandwidth; the API does not relay video. Actual capacity still depends on room fan-out, chat volume, database size, Cloudflare plan limits, and the Linux host chosen. The load test establishes the evidence-based limit; it is not a promise of unlimited scale.
