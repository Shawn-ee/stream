# Changelog

## 2026-08-26 - Creator navigation and live-control consolidation

- Replaced the remaining long creator dashboard with persistent Live, Earnings, Actions, Private Show, Profile, and Settings workspaces; only one focused operating surface is shown at a time.
- Kept browser camera permission, private preview, Go Live/End Broadcast, truthful lifecycle, current goal, realtime chat/support/audience activity, and session metrics in the primary Live workflow.
- Moved goal/action editing, test earnings summaries, private-show configuration, public profile editing, moderation, lifecycle refresh, OBS help, and local-state tools into dedicated sections without changing existing APIs or media behavior.
- Moved signed-in language controls into the account header, corrected mobile header and Quick Go Live clipping, hid the horizontal navigation scrollbar while preserving touch/keyboard scrolling, and verified no page-level overflow at 390×844.
- Passed the complete Cloudflare-free staging gate, all-section English/Chinese browser checks, and audience/admin regressions. Demo data was reset; no broadcast, Cloudflare change, Git push, or Linux deployment occurred.

## 2026-08-26 - Audience discovery and video-first room shell

- Reworked the signed-in audience experience into an original streaming-product shell with persistent product navigation, a clearer live-discovery heading, richer visual room cards, search/category controls, and compact activity access.
- Reorganized the audience room around a desktop video/chat split, followed by goal, support actions, gifts, recent support, profile, wallet, and private-show details. Offline and unavailable states remain truthful.
- Moved the English/Chinese control into the audience account header, corrected legacy room-card and creator-header collisions, and made room entry/back navigation return to the top of the page.
- Passed the complete Cloudflare-free staging gate plus desktop and 390×844 browser smoke tests. The responsive layouts have no horizontal overflow and the audience chrome was checked in English and Chinese.
- This milestone is local only. It did not start a broadcast, change Cloudflare, push source, or deploy Linux.

## 2026-08-26 - Signed WHEP production completion

- Added server-side five-minute RS256 Stream token generation for WHEP while retaining `requireSignedURLs=true`; production Quick Go Live now fails closed unless both the key ID and private JWK are configured.
- Added signing-key environment validation, activation support, secret-exposure checks, URL-segment validation, cryptographic signature tests, and production-safe error handling. No signing material or fixed provider endpoint is returned to browsers.
- Passed the complete local staging gate, production Compose gate, release preflight, focused signature/WHEP tests, and secret-safe production readiness checks.
- With explicit owner approval, created exactly one Cloudflare Stream signing key and installed it only in the ignored mode-600 Linux production environment. Host-only environment, PostgreSQL, and source rollback artifacts were created first.
- Published implementation commit `cad899a`, fast-forwarded the isolated Linux Stream checkout, rebuilt/recreated only the API container, and preserved the web, PostgreSQL, Redis, Tunnel, VM, and unrelated services.
- Repeated the physical Logitech camera/microphone test: WHIP reached provider-confirmed Live, creator/self-monitor and isolated-audience signed WHEP requests succeeded, audience playback was 640×480 at ready state 4 with an advancing unmuted media clock, and the 2 minute 2 second session ended cleanly on both sides.
- Confirmed provider Offline before and after the final demo reset, zero signing/playback fatal-error log lines, healthy Stream containers, and no secret exposure. Subjective sound quality remains a human listening check.

## 2026-08-26 - Browser-Native Quick Go Live launch candidate

- Added creator-initiated browser camera/microphone permission, private preview, device selectors, microphone level, mute/camera controls, Go Live, and safe End Broadcast controls with full English/Chinese copy.
- Added Cloudflare WHIP publishing and WHEP audience/self-monitor playback while preserving the existing OBS/RTMPS/signed-HLS workflow.
- Added server-only WebRTC endpoint discovery and signaling exchange so fixed provider URLs and upstream resource locations are not exposed to browsers and media does not traverse Linux.
- Added migration `012` for explicit room transport and lifecycle-backed browser broadcast sessions, including one active publisher per room and stale-session recovery.
- Added creator ownership, audience/private-show playback authorization, CSRF, rate limits, SDP/log redaction, no-store responses, safe cross-origin resource rejection, and transport-mismatch denial.
- Added deduplicated provider-endpoint caching, authenticated session heartbeats, bounded orphan cleanup, and answer-application recovery so failed or abandoned tabs do not strand publisher/viewer resources.
- Passed read-only capability verification on the existing production input, focused provider/client/schema/role tests, the complete local staging gate, bilingual browser review, and the production Compose gate.
- Published commit `6aa776d` and deployed it to the existing isolated Linux Stream project after creating host-only rollback artifacts. Migration `012` applied, only the Stream API/web containers were recreated, demo data was reset, and the public Cloudflare origin plus creator capability checks passed.
- Ran an owner-approved physical browser test with the Logitech camera/microphone. Private preview, WHIP publishing, provider-confirmed live lifecycle, explicit stop, provider disconnect, and offline recovery passed during a 3 minute 8 second session.
- WHEP correctly failed closed because the existing Live Input requires signed URLs and no Stream signing key is configured. Creating a signing key or disabling signed playback remains a separate Cloudflare security/configuration approval gate; demo data was reset after the test.

## 2026-08-26 - Creator cockpit public Linux deployment

- Published the reviewed creator-cockpit implementation as GitHub commit `2a0ac1e` and fast-forwarded the isolated Linux checkout to that exact source.
- Created host-only database, source-diff, and project-tree recovery artifacts before the pull; preserved the pre-upgrade tracked changes in a recovery Git stash.
- Built the migration, API, and web images on Linux, ran the ordered migration, and recreated only the Stream API and web containers. PostgreSQL, Redis, Cloudflare Tunnel, and the unrelated Odoo stack were not recreated or restarted.
- Reset the synthetic demo dataset and passed the production Stream readiness check: configured creator, truthful Cloudflare-offline state, fail-closed signed playback, absent fake-live route, and no secret exposure.
- Verified `https://holiwyn.online` returns HTTP 200 with the new Creator Studio and Live Session bundle; the API and web containers are healthy with zero restarts.

## 2026-08-26 - Professional Creator Broadcast Cockpit

- Replaced the long creator feature dashboard with a compact creator-specific shell, video-first signed confidence monitor, clear OBS start flow, and responsive control rail.
- Added truthful bilingual preview states, realtime lifecycle synchronization, deduplicated audience presence, and tabbed chat, gift/action support, and audience moderation surfaces.
- Moved room, profile, private-show, action-menu, OBS help, local state simulation, and demo moderation controls into secondary expandable settings.
- Added an owner-only lifecycle-backed current/latest session summary with duration, gift/action totals, action count, and top supporter; expanded lifecycle verification covers calculation and authorization.
- Preserved the server-side Cloudflare boundary: no camera capture, automatic OBS control, stream-key display, external broadcast, payment, or deployment action was added.

## 2026-08-26 - Public live-broadcast activation hardening

- Added an explicit complete Cloudflare Stream enable/configuration gate instead of inferring readiness from individual values.
- Removed the local fake-live selector from production and made its API route unavailable there while preserving local lifecycle tests.
- Sanitized playback-token failures into a generic application response and added a creator-facing configured/unconfigured state without exposing provider details.
- Added a dormant-by-default server lifecycle poller that automatically reconciles configured rooms every 15 seconds, isolates per-room failures, emits only real state transitions, and stops cleanly on shutdown.
- Confirmed the existing enabled `stream-mvp-local-test` Live Input will be reused; no new input, DNS route, Tunnel, or subscription change is required.
- Deployed the hardened Stream configuration and lifecycle poller to the existing Linux Stream project without restarting the VM, Tunnel, database, Redis, or unrelated Odoo services.
- Replaced the exposed development credential with one active least-privilege production Stream token and, with owner approval, deleted both obsolete expiring development tokens.
- Completed an owner-approved physical Logitech camera/microphone broadcast through the public site. Automatic lifecycle detection reached live, signed playback contained audio and video, a Linux-side audience client fetched the public signed HLS manifest, and the room returned offline after encoder stop.
- Added restricted environment-handoff and remote-audience verification helpers; removed temporary credential files and reset demo data after the test.

## 2026-08-26 - Cloudflare Tunnel root-domain cutover

- Added a separately managed, digest-locked Cloudflare Tunnel Compose definition that joins only the Stream network and receives its rotatable token from an ignored owner-only environment file.
- Documented the approved `holiwyn.online` HTTPS origin, root-hostname routing, preserved Namecheap email DNS, and independent connector lifecycle.
- Activated the root hostname through the named tunnel without Cloudflare Access at the owner's direction. `www` is intentionally not configured, and Cloudflare Stream remains a separate activation gate.

## 2026-08-26 - Individual accounts deployed to private Linux staging

- Backed up and restored the active private database before upgrading exact source from `e1f64ad` to `e32058d`.
- Built and applied migration `011`, recreated only the changed Stream migration/API/web containers, and preserved PostgreSQL, Redis, named volumes, localhost-only access, and the unrelated Odoo project.
- Verified healthy services, private readiness/metrics, zero restart counts, unique case-folded handle index, tunneled registration/session/age identity, hashed credentials, exact temporary-account cleanup, and English/Chinese Linux browser rendering.
- Recorded the guarded operator's live-port limitation for a future upgrade-aware action. No public exposure, DNS, Cloudflare, video, real payment, KYC, or compliance action occurred.

## 2026-08-26 - Individual audience account foundation

- Added self-service, test-safe audience registration using case-folded unique handles, display names, strong local passwords, and an English/Chinese onboarding interface.
- Reused the hardened scrypt credential, opaque server-session, strict cookie, and CSRF architecture; self-registration cannot assign creator or administrator privileges.
- Corrected age acknowledgement so a newly registered account retains its own identity instead of resolving to the first seeded user with the same role.
- Added per-IP registration throttling, trimmed-name validation, reserved demo-handle protection, duplicate-race handling, and zero initial test-coin behavior.
- Added a cleanup-safe registration verifier to the complete staging gate and browser-smoked both language variants. The full Cloudflare-free staging gate passed and demo data was reset.
- Added the ordered non-video completion plan. The initial implementation step made no Linux, public exposure, DNS, Cloudflare, real email/OAuth, payment, KYC, or compliance change; the separately recorded private Linux upgrade followed after verification.
- Made the disposable production-Compose smoke verifier allocate an unused localhost port so it can coexist with the persistent Linux SSH tunnel instead of failing on fixed port `18080`.

## 2026-08-26 - Owner-approved private Linux staging

- Deployed exact application source `e1f64ad73e26792a84a94460afba50e0e16d5db3` to an isolated subdirectory and Compose project on the owner-controlled Linux VM without restarting or modifying existing applications.
- Passed host admission with 8 logical CPUs, 11,964 MiB RAM, 52 GiB free disk, supported Git/Docker/Compose, synchronized clock, and an available private port.
- Generated distinct owner-only staging secrets, kept Cloudflare disabled, built digest-locked images, migrated PostgreSQL, and verified healthy services, localhost-only gateway, readiness, private metrics, and HTTP access through an SSH tunnel.
- Seeded only the four predefined synthetic accounts and two test rooms; verified audience, streamer, and administrator authentication without exposing the random password.
- Created pre-seed and post-seed host-only backups, restored each into an exact disposable database, verified the post-seed four-user/two-room state, and removed the restore database.
- Recorded zero initial Stream container restarts and confirmed the existing host Compose project remained running. No host load test, public exposure, DNS, Cloudflare, real identity, payment, or compliance action occurred.

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
- Added supply-chain controls: exact-version npm install-script approvals for the two Linux esbuild packages, HTTPS npm-registry and SHA-512 lock integrity checks, an offline CycloneDX production SBOM gate, and a separate live audit command. The current production audit reports zero known vulnerabilities.
- Corrected release documentation so private staging cannot silently fall back to the older immutable `stream-launch-candidate-0.1.0` historical tag.
- Added a requirement-by-requirement launch-candidate completion audit that separates completed local software evidence from the still-unapproved Linux host proof.
- Added a guarded POSIX private-staging operator that requires an explicit approval phrase, an exact clean commit, and a second action-specific confirmation before start/stop. It validates the host, production environment, Compose model, localhost binding, migrations, readiness, and private metrics without requiring host Node/npm.
- Added staging-gate coverage for operator syntax, missing approval, malformed/mismatched commits, unapproved mutation, a successful read-only plan, localhost enforcement, and volume-preserving shutdown.
- Made Git an explicit, tested Linux host-admission prerequisite because exact source verification is mandatory before any guarded staging action.

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
