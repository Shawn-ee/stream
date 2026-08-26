# Stream MVP Backlog

## Completed milestone: 0 - Control plane and foundations

Control files, local runbook, PostgreSQL migration system, initial core schema, service connectivity check, schema test, API request/error logging, Cloudflare credential verifier, and local smoke check are in place. Exit gate passed on 2026-08-23.

## Completed milestone: 1 - Demo roles and bilingual shell

1. Create a test-only session model with audience, streamer, and admin roles.
2. Add an EN/ZH language switch and translation catalog.
3. Add a clearly labeled test age acknowledgement gate.
4. Protect role-specific routes and verify each role flow.

Completed: seeded demo users; HTTP-only test session cookie; role-specific API guards; EN/ZH interface copy; clearly labeled local test age acknowledgement; and local verification for each role flow.

## Completed milestone: 2 - Discovery and room experience

1. Seed streamer profiles and live-room metadata.
2. Build a responsive streamer directory and profile cards.
3. Build a responsive live-room shell with player state placeholders.
4. Verify a demo audience can discover and enter a seeded room.

Completed: seeded streamer and live room; discovery and room-detail APIs; responsive room UI; server-side signed Cloudflare Stream playback; Socket.IO room chat/presence; test gift ledger; and admin moderation.

## Completed milestone: 3 - Cloudflare playback verification

The project-owned verifier sends a 25-second synthetic FFmpeg broadcast to the existing Cloudflare test input, then confirms the app produces a signed Cloudflare playback URL without exposing credentials.

## Completed expansion: Stripchat-inspired business prototype

1. Completed: searchable/category-filtered discovery cards, streamer metadata/schedule, follows, and test notifications.
2. Completed: multi-value test gift catalog, wallet history, and append-only ledger-backed transfers. Gift animation keys are retained as original-design extension points.
3. Completed: private-show state, test-coin ticket/per-minute first-minute access, locked playback, access expiry, and double-sided ledger entries.
4. Completed: creator studio status, room title/goal controls, ticket/per-minute private-show settings, and follower/earnings metrics.
5. Completed: audience visit history and audience reports; admin report queue/review plus existing room moderation audit.
6. Completed: schema, service, realtime, Cloudflare credential, synthetic live-ingest/playback, combined expanded workflow verifiers, and an audience browser smoke check. Production exclusions remain in GOAL.md.

## Harness Engineer queue

1. Completed P0: Added Live Broadcast Lifecycle with server-side Cloudflare Live Input status refresh, normalized local lifecycle states, safe local fallback, creator controls, viewer states, lifecycle audit events, and limited admin visibility. Local verification does not contact Cloudflare.
2. Completed P0: Realtime-synchronized room lifecycle changes for connected viewers using the existing local Socket.IO channel.
3. Completed P1: Added room-scoped recent chat history on entry, backed by existing local messages and covered by the realtime verifier.
4. Completed P1: Added realtime discovery-card lifecycle synchronization, including truthful live, connecting, offline, and unavailable labels.
5. Completed P1: Localized lifecycle labels across discovery, rooms, creator controls, and the admin view; browser-verified Chinese discovery status labels.
6. Completed P0: Added a creator-only live-room monitor for room-scoped presence, recent chat, and realtime chat updates.
7. Completed P0: Added creator text-chat participation inside the room monitor, using existing room-scoped Socket.IO validation and moderation rules.
8. Completed P1: Added a live creator participant roster with targeted room-scoped mute/unmute using existing presence and moderation APIs.
9. Completed P1: Added a realtime creator test-gift activity feed using existing room events only.

1. Completed P1: Localized demo-role labels, session helper text, and the signed-in role label so the English/Chinese switch is consistent across the entry and audience flows.
1. Completed P1: Apply the owner-approved Midnight Aurora visual system to audience, room, creator, and admin interfaces; verify responsive local browser rendering and original styling.
2. Completed P1: Complete bilingual copy coverage across audience room controls, creator studio, admin actions, notifications, and empty/error states.
3. Completed P2: Add original, lightweight gift-event motion using existing animation keys after the visual system is stable.
4. Completed P1: Added an audience-facing creator profile panel with original bio, schedule, follower count, category, and current room status. The panel uses the existing read-only profile API and intentionally excludes private contact or verification claims.
5. Completed P1: Added viewer-facing private-show status with test mode, price, locked/active state, per-minute countdown, and server-side revalidation at expiry. No real payment, ticket, or access entitlement is implied.
6. Completed P1: Added an admin-only, read-only test-transaction ledger for gift and private-show records, including participant, entry type, signed test-coin amount, and reference type. No payment, cashout, or adjustment control was added.
7. Completed P1: Polished the original live-discovery cards with responsive Midnight Aurora hierarchy, clear live markers, metadata emphasis, and mobile-safe card layout.
8. Completed P1: Added a staging architecture reference that documents the application/video boundary, validation paths, and launch exclusions.
9. Completed P1: Added visible realtime chat-status feedback for creator/admin moderation and verified room-scoped mute rejection and reset.
10. Completed P1: Added a repeatable local staging verification gate without Cloudflare or deployment side effects.
11. Completed P0: Added a creator-friendly Live Session cockpit, creator-managed room action menu, idempotent test-coin action purchases, paired local ledger entries, and realtime goal progress shared by gifts and actions. Browser-verified creator and audience views; no real payments or external services were added.
12. Completed P1: Added creator-only session insights with room-scoped gift/action totals, action count, top supporter, recent support, current audience count, and goal progress. Added a minimal public recent-support feed with no wallet balances, transaction identifiers, or private metrics.
13. Completed P0: Added creator OBS camera/microphone broadcast-readiness guidance, truthful creator/audience lifecycle copy, and an owner-assisted end-to-end test procedure. Browser capture, credential display, recording, and automatic device inspection remain excluded.

## Deployable 100-user roadmap

The active product goal and phase gates are in `GOAL.md` and `docs/100-User-Deployment-Plan.md`. Local product, security, packaging, physical media, operational, and 100-concurrent-user evidence are complete, including a repeatable human browser acceptance checklist. The reviewed baseline and environment/supply-chain hardening are published; the guarded private-staging operator and aligned Git host admission are recorded in local application-source candidate `e1f64ad73e26792a84a94460afba50e0e16d5db3` and await publication approval. The following work remains owner-gated: publish that exact code commit, then select and approve a private Linux staging target and host-specific secret/TLS/monitoring approach. Cloudflare configuration/cost, public exposure, payment, real identity, age/KYC, and compliance actions remain separate explicit approval gates.

### Production-readiness audit queue

1. P0: Replace unsigned role cookies and client-declared WebSocket roles with database-backed server sessions.
2. P0: Add session expiry/revocation, password verification for synthetic accounts, secure cookies, and CSRF protection.
3. P0: Add production Docker/reverse-proxy/readiness/backup/restore/rollback packaging.
4. P0: Add PostgreSQL pooling, multi-process realtime coordination, bounded fan-out, and 100-user load evidence.
5. P1: Add production origin/trusted-proxy configuration, request and endpoint limits, security headers, safe error/log redaction, and abuse tests.

Completed 2026-08-24: items 1 and 2. Database-backed sessions, hashed synthetic passwords, expiry/revocation, banned-user login rejection, CSRF protection, and WebSocket impersonation rejection are covered by the staging gate and browser role smoke tests.

Completed 2026-08-24: items 3, 4, and 5. The repository now has a tested private production-style Docker topology, immutable multi-architecture base-image locks, migration/readiness sequence, backup/restore drill, pooled PostgreSQL access, Redis-coordinated multi-process realtime, bounded results/events, critical JSON-schema validation, concurrent idempotency locking, security/abuse checks, and a fresh 100-user pass against the exact locked production containers.

### Owner-gated launch queue

1. Completed P0 with owner approval: physical camera/microphone, existing Cloudflare ingest, signed playback audio/video tracks, and offline recovery were verified using preinstalled FFmpeg because OBS was not installed. Human visual/audio quality confirmation and OBS-specific UI remain optional follow-up evidence.
2. Completed private staging deployment with owner approval: the exact hardened application commit was built and started on an owner-controlled Linux VM, bound to localhost and accessed only through an SSH tunnel. Host admission, migrations, readiness, private metrics, synthetic role authentication, backup/restore, image recording, zero initial restarts, and coexistence with the existing host application passed. A longer soak, shared-host load test, off-host backup, OS support upgrade, Cloudflare playback, and any broader access remain separate follow-up gates.
3. Completed P0 with owner approval: reviewed baseline commit `8aa41bf688336c1f8a0a8478e69d556d094477b5`, with Markdown-only documentation, and annotated tag `stream-launch-candidate-0.1.0` were pushed to the owner repository. Local Word files, secrets, builds, and scratch data remain excluded.
4. P0 before public launch: rotate the exposed Cloudflare test token and replace synthetic account lifecycle with an approved real identity design.
5. P0 before public launch: professional legal/privacy/content/age/KYC direction and separately approved payment/cashout design.

## Non-video completion queue

The ordered plan is maintained in `docs/Non-Video-Completion-Plan.md`.

1. Completed P0 locally: individual audience registration with case-insensitive unique handles, strong hashed passwords, database sessions, CSRF, bilingual UI, identity isolation, and zero initial test coins.
2. P0 next: authenticated account profile/password/session lifecycle controls without external email or OAuth.
3. P0: test-only creator application, administrator decision, and transactional creator profile/offline-room provisioning.
4. P1: user blocking, notification read state, reconnect/error polish, and persistent moderation boundary tests.
5. Owner-gated: deploy an exact reviewed commit to the existing private Linux Stream Compose project and repeat migration/readiness/backup evidence. Public access and video remain separate.
