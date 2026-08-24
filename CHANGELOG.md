# Changelog

## 2026-08-24 - Secure synthetic-account identity

- Added scrypt-hashed local account credentials and opaque database-backed sessions with expiry and revocation.
- Removed unsigned role-cookie authorization and the client-declared WebSocket role fallback; realtime identity now requires the HTTP-only server session.
- Added strict same-site cookies, mutation CSRF validation, login/logout UI, and focused credential/expiry/banned/cross-role/impersonation tests.
- Verified audience, creator, and administrator login/logout in the local browser and passed the complete staging gate.
- Added production-aware origin/proxy configuration, request-body and mutation limits, bounded realtime payload/join behavior, safe error logging, security headers, and dependency-aware readiness.
- Added a security verifier covering readiness, headers, unapproved origins, oversized bodies, and safe responses; repeated security and staging runs pass.
- Added centralized JSON-schema validation for critical login, reporting, gift/action/private-access, creator-action, and report-review mutations.
- Added PostgreSQL pooling, capacity indexes, bounded application lists, Redis-backed Socket.IO coordination, cluster-aware presence, and safe concurrent idempotency locks.
- Added and passed a two-API-process realtime verifier for cross-instance presence and chat.
- Added production-oriented API/web Dockerfiles, a localhost-only Compose topology, reverse proxy, one-shot migration sequencing, readiness, graceful shutdown, placeholder environment template, and deployment runbook.
- Tested a disposable PostgreSQL backup/restore and clean production-container build/start/readiness flow.
- Added a gradual 100-user load suite and passed it against the compiled production containers with zero unexpected disconnects, all latency/resource thresholds satisfied, correct role denial, and exactly-once ledger behavior.
- Added final load and deployability reports; demo data was reset and no Cloudflare or public infrastructure action was taken.
- Cleared login handle/password state on sign-out and disabled password-manager reuse for the synthetic login field after the final browser audit exposed retained form values.
- Added protected Prometheus-format operational metrics for HTTP, readiness, realtime, PostgreSQL pooling, process memory, and Redis capacity.
- Added production log redaction, structured-log credential leakage verification, Redis error-log throttling, and database-pool error counters.
- Added and passed a local PostgreSQL/Redis outage-recovery drill that proves liveness/readiness separation, fail-closed dependency status, recovery, and preserved volumes.
- Added a monitoring runbook with the private scrape boundary, initial 100-user alert thresholds, and incident-response order; no external monitoring or notifications were configured.
- Added a repeatable production-Compose smoke verifier and an explicit web-gateway block for `/internal`; the verifier builds, migrates, starts, checks readiness and private metrics, and shuts down without deleting data volumes.
- Corrected Cloudflare lifecycle normalization to use only `status.current.state`; historical connected records can no longer make a disconnected input appear live. Added focused regression tests.
- Completed an owner-approved physical Logitech camera/microphone broadcast through the existing Cloudflare Live Input using preinstalled FFmpeg because OBS was absent. Signed playback contained video and audio tracks, and the room returned offline after automatic stop.
- Added fail-closed one-execution approval flags to both camera and synthetic Cloudflare broadcast scripts so neither can be included in an unattended/default verification run accidentally.
- Added a read-only release-baseline preflight, excluded intermediate `work/` scripts, marked document artifacts as binary, and documented the owner-reviewed commit/tag procedure without staging or committing anything.
- Added a repeatable private launch-candidate browser acceptance checklist covering all three roles, English/Chinese, truthful playback states, creator operations, administrative boundaries, owner-gated media proof, operational evidence, and deterministic demo reset.
- Strengthened release and production-package verification so browser source and the built web container fail if they contain local environment files or server-only credential variable names.
- Added a read-only Linux host admission check for architecture, Docker/Compose, CPU, memory, disk, daemon access, private gateway port, and clock visibility; it performs no installation or deployment.
- Upgraded the web gateway from Nginx 1.27 to official stable Nginx 1.30.4, locked Node/Nginx/PostgreSQL/Redis to verified multi-architecture digests, and added a staging-enforced image-lock verifier.
- Added a one-command production-container 100-user verifier that builds the locked topology, seeds disposable accounts, runs the measured workload through the gateway, resets demo data, and shuts down without deleting volumes.
- Prepared the GitHub baseline as Markdown-only documentation: added a documentation index, modernized the README to the verified launch-candidate state, excluded Word/lock files, and made release preflight reject `.docx` publication.
- With owner approval, published the reviewed baseline commit `8aa41bf` and annotated tag `stream-launch-candidate-0.1.0` to `Shawn-ee/stream`; follow-up readiness records now treat version control as complete while keeping Linux deployment separately gated.
- Added a private Linux staging approval checklist with a recommended localhost-bound SSH-tunnel deployment, credential-rotation boundary, exact owner approval statement, host evidence sequence, and no-public-exposure safeguards.
- Added a secret-safe pre-start production-environment validator and staging-enforced failure tests for placeholders, weak or reused secrets, database/Redis mismatches, unsafe origins, Cloudflare partial configuration, unknown variables, and Linux file permissions.
- Reworked production-package and 100-user verifiers to use ephemeral validator-approved environments with distinct random secrets and Cloudflare disabled, replacing the former placeholder-template runtime and deleting temporary files after every run.
- Fixed hidden-state dependence found by that change: production verifiers now use uniquely named Docker projects with fresh disposable volumes and remove only those exact test resources, so an old database password or schema cannot influence release evidence.

## 2026-08-23 - Harness loop stop-rule audit

- Confirmed the coherent local-product stop rule: bilingual discovery, rooms and truthful playback states, realtime interaction, creator operations, test-only gifts/private access, room safety controls, and admin review are present and covered by the local staging gate.
- Deferred literal platform parity and all production-only work, including real authentication, payments/cashout, enforceable age/KYC, public deployment, production security/operations, and legal/compliance readiness.
- Replaced the local-prototype stop rule with a deployable 100-concurrent-user launch-candidate target and added a phased implementation plan. Production actions remain explicit owner-approval gates.

## 2026-08-23 - Live Broadcast Lifecycle complete

- Added persisted normalized broadcast state, non-sensitive checked status, and local lifecycle audit events.
- Added explicit server-side Cloudflare Live Input status refresh, with a Cloudflare-free local fallback for development and verification.
- Added bilingual creator broadcast controls, truthful viewer live/connecting/offline/unavailable states, and admin broadcast-health visibility.
- Added lifecycle verification and included it in the local staging gate; browser-smoke-tested creator and viewer state behavior. No new Cloudflare broadcast, configuration change, or external spend was made.
- Added realtime lifecycle events so connected viewers receive creator broadcast-state changes without a page reload; expanded the realtime verifier and re-ran the complete local staging gate.
- Added safe, ordered recent room-chat history for viewers joining an existing room; this reuses the local chat table and has no direct-message, upload, or retention-policy scope.
- Added a discovery lifecycle channel so room cards update in place as broadcast state changes; browser-verified the visible connecting label and re-ran the local staging gate.
- Replaced CSS-only English lifecycle badges with translated, data-driven labels across audience, creator, and admin views; browser-verified Chinese status rendering.
- Added a Creator Studio live-room monitor using existing local chat history and Socket.IO room events; browser-smoke-tested its presence and empty-history states.
- Added a text-only creator chat composer to the live-room monitor; realtime verification confirms streamer messages reach connected viewers.
- Added a live audience roster to the creator monitor and connected each participant to the existing room-scoped mute/unmute controls.
- Added a realtime test-gift activity feed to Creator Studio; the realtime verifier now covers gift-event delivery.
- Added the Creator Action Menu and Realtime Goal Progress milestone: creator-managed room-scoped test actions, idempotent paired test-coin ledger transfers, goal-target/progress tracking from gifts and actions, realtime audience updates, and a concise Live Session cockpit.
- Added creator action management (create, edit, enable/disable, and display order), an original audience Support / Actions panel, and read-only admin visibility for the new test-action ledger entries.
- Browser-smoke-tested the creator cockpit, audience action panel, and a local action purchase; reset demo data afterward. The full Cloudflare-free staging gate passes.
- Added Creator Session Insights and Supporter Recognition: owner-only local gift/action aggregates, top supporter, recent support, current audience count, and goal progress, plus a privacy-safe audience support feed.
- Extended realtime verification for action purchases and browser-smoke-tested both insight surfaces. No external analytics, tracking, payment, or personal data was added.
- Added bilingual Creator Studio OBS broadcast-readiness guidance, non-secret camera/microphone troubleshooting, and state-specific expectations without browser media capture or secret exposure.
- Added a truthful audience live-playback label and documented an owner-assisted camera/microphone test that requires immediate confirmation before any OBS broadcast begins. Browser-smoke-tested creator readiness and audience connecting state; no OBS, camera, microphone, or Cloudflare action was taken.

## 2026-08-23 - Milestone 0 complete

- Established local Docker services for PostgreSQL and Redis.
- Added initial TypeScript API and web workspace.
- Added private Cloudflare Stream development configuration and verification.
- Added harness-engineering charter and project control plane.
- Added PostgreSQL migration runner and core MVP schema for users, rooms, chat, gifts, ledger, and moderation events.
- Added local service verification, schema integration test, and API error/request logging convention.
- Verified migration, PostgreSQL, Redis, TypeScript checks, schema test, Cloudflare account token, API health endpoint, and web HTTP smoke check.

## Next active milestone

Milestone 2: streamer directory, room metadata, responsive room UI, and a seeded live room.

## 2026-08-23 - Interactive MVP implementation

- Added seeded discovery room, server-side Cloudflare Stream playback-token flow, and responsive room player surface.
- Added Socket.IO room presence, stored room-scoped chat, and a realtime verifier.
- Added non-monetary test gifts with an append-only double-sided ledger and idempotency protection.
- Added admin mute/ban controls, audit events, and chat enforcement.
- Added bilingual React shell and test-only role/session flows.
- Added frontend test-gift control and admin moderation dashboard.
- Verified a synthetic 25-second FFmpeg broadcast reaches the Cloudflare test input and the local app returns a signed playback URL.

## 2026-08-23 - Milestone 1 complete

- Added seeded audience, streamer, and admin demo users.
- Added test-only HTTP-only demo sessions and role-specific API guards.
- Added bilingual English/Chinese local development shell.
- Added a clearly labeled local test age acknowledgement with no claim of real age verification.
- Verified audience, streamer, and admin routes; a forbidden cross-role request; web production build; local services; schema test; and Cloudflare credential.

## 2026-08-23 - Expanded prototype workflows

- Added searchable/category-filtered discovery, schedules, follows, test notifications, and audience room history.
- Added ticket and per-minute test private-show sessions with server-side playback access checks, expiry, idempotent test-coin purchase, and ledger entries.
- Added creator private-show controls with basic follower and test-earnings metrics.
- Added audience report submission and an admin report queue with review/dismiss actions.
- Made demo seed data reset the explicitly named local demo records so repeat validation starts from a predictable state.
- Fixed a real-time room-join race found during browser smoke testing by resolving the local demo role in Socket.IO middleware before room handlers are registered.
- Verified the local browser audience flow: discovery, room entry, multiple gifts, secure player surface, presence, and live chat.
- Added creator-facing controls for selecting ticket or per-minute private access and setting both test-coin prices.
- Added `npm run verify:expanded`, which resets demo data and verifies discovery, roles, age acknowledgement, follows, gifts, wallet ledger/history, private access/playback, creator studio, reports, moderation, and audit flow together.
- Added the Harness Engineer Loop, including reference-browser safety boundaries, P0/P1/P2/P3 feature triage, owner-facing decision notes, autonomous implementation gates, and a reusable future-session start prompt.
- Completed the first Harness Engineer P1 slice: applied the original Midnight Aurora visual system, performed a local browser visual smoke check, and corrected the Chinese language-control rendering issue found during that review.
- Completed the second Harness Engineer P1 slice: translated the audience, room, creator, and admin UI controls and verified the live Chinese interface in the local browser.
- Completed P2 gift feedback: exposed catalog animation keys in realtime gift events and added original CSS-only celebratory feedback, verified in a live local room without altering the test ledger flow.
- Started the streamer-profile P2 slice with a verified read-only profile API exposing creator identity, bio, category, schedule, follower count, and current room state.
- Completed a P1 bilingual regression slice: localized role labels and demo-session helper copy on the entry screen and signed-in header, then browser-verified the Chinese audience flow.
- Corrected the local session-end request so empty `DELETE` requests no longer incorrectly declare a JSON body and receive a 400 response.
- Promoted the creator-profile polish item to P1 under the owner-selected final-goal scope, then added an original room-side creator profile panel backed by the existing read-only API.
- Added a private-show viewer status panel, a per-minute test-access countdown, expiry revalidation, and automated expiry-field coverage; browser-verified the locked-to-active playback transition.
- Added a demo-admin-only, read-only test-transaction ledger for gift and private-show entries; expanded verification covers both reference types and browser smoke testing confirmed the paired gift debit/credit display.
- Polished the original live-discovery cards with a stronger responsive hierarchy and explicit live status; browser-checked desktop and 390px mobile rendering.
- Added a staging-prototype architecture reference documenting data/video ownership, request paths, local validation, and explicit launch boundaries.
- Added visible room-chat feedback for moderation events and rejected messages; realtime verification now covers creator room mute, rejected audience chat, and unmute reset.
- Added `npm run verify:staging`, a single local-only verification gate for migrations, reset, types, schema, service health, realtime, and expanded workflows.
- Fixed demo reset so an edited creator room goal is restored to the known local baseline.
- Localized creator room-moderation labels and confirmation feedback; browser-verified the Chinese creator studio.
- Added an admin-only, read-only local account-review endpoint for demo role and moderation-state oversight.
