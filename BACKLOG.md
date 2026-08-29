# Stream MVP Backlog

## Active frontend modernization

- Desktop broadcaster presentation cleanup completed locally: full-width video stage, compact controls, transparent creator chat/gift overlays, and preserved mobile fullscreen behavior. Physical desktop broadcast review remains owner-assisted.

- Streamer live-session-safe navigation completed locally: persistent publisher mounting across Profile, same-document Back to Live/browser history, mobile return access, live continuation notice, and true document-exit protection. A physical live navigation acceptance test remains owner-assisted.

- Immersive mobile broadcast and interruption recovery completed locally: full-viewport video, upper-right transient activity, semantic front/rear switching with track replacement, wake lock/fullscreen enhancement, page-exit signaling, one-tap resume, server resource expiry, and a 45-second truthful viewer recovery window. Physical-device and live Cloudflare verification remain owner-assisted.

- Dedicated broadcaster redesign completed locally: minimal desktop video/chat split, camera-first mobile setup/live layouts, essential media controls, incoming gifts in chat, compact health, safe ending, and simple ended summary. Physical-device and Cloudflare broadcast validation remains owner-assisted.

- Phase 0 completed locally: audited React/Vite state routing, global CSS, authentication, discovery, room/chat/gift/follow/profile flows, Creator Studio, Socket.IO, WHIP/WHEP/HLS and API boundaries. See `docs/Frontend-Modernization-Implementation-Map.md`.
- Phase 1 completed locally: semantic mobile-first design tokens, explicit 480/768/1024/1440 breakpoints, safe-area/touch/focus/reduced-motion rules, accessible modal and bottom-sheet primitives, loading skeletons, and discovery empty/loading states.
- Phase 2 completed locally: recognizable Holiwyn audience header, inline creator search, collapsible desktop creator rail, truthful featured creator/live surface, light reusable stream cards, following integration, and responsive one/two/three/four-column behavior.
- Phase 3 completed locally: video-first desktop room, compact creator/follow/gift/private/report bar, fixed-width sticky live chat, 16:9 truthful player states, and subordinate goal/gift/support/profile/wallet surfaces with tablet stacking.
- Phase 4 completed locally: dedicated mobile header actions, expandable creator search, five-item bottom navigation, direct existing-view routing, safe-area clearance, 52px touch targets, mobile account access, and overflow-free 320–430px layouts.
- Phase 5 completed locally: one-column content-first mobile discovery, For You/Following/Live tabs, compact category and creator search, truthful static 16:9 previews, dedicated loading/empty states, bilingual labels, and overflow-free 320–430px behavior.
- Phase 6 completed locally: viewport-dominant mobile room, truthful player/offline states, creator identity and action rail over video, existing transient chat/gift activity overlay, accessible chat and gift sheets, recommended-next creator cards, hidden app chrome, and fullscreen short-landscape behavior.
- Phase 7 completed locally: staged browser permission, private preview, stream-title save, camera/microphone selection, active WebRTC track replacement, friendly connection health, duration/mute/camera controls, safe end confirmation, bilingual mobile copy, and overflow-free 320–430px layouts. The existing WHIP session and explicit owner-approval boundary for real broadcasts remain intact.
- Phase 8 completed locally: responsive creator-first public profile, truthful current-room lifecycle, existing follower/follow and schedule data, direct room/profile navigation, bilingual loading/error states, and recommended-next discovery. No cover media, verification, social links, clips, or VODs were invented.
- Phase 9 completed locally: stable session boot state, debounced and race-safe creator search, explicit discovery/following service-error states with retry, localized loading status, deferred below-fold rendering, production asset budgets, and representative responsive/browser regression checks.
- Frontend modernization Phases 1–9 are complete locally. Next P0 product milestone: public discovery and low-friction test onboarding, allowing anonymous browsing of safe room/profile metadata while requiring authentication for chat, follow, gifts, private access, and broadcasting.

## Active test-only product cycle

1. Completed locally P0: account profile, password change with full session rotation, privacy-safe active-session management, inactive recovery design, focused verification, bilingual browser checks, and mobile review.
2. Completed locally P0: creator application, withdrawal/reapplication, administrator reasoned decision, audit trail, notification, session invalidation, and transactional creator profile/offline-room provisioning.
3. Completed locally P1: follow/unfollow favorites, live-first followed-creator feed, validated next-stream schedules/timezones, deduplicated bilingual lifecycle notifications, and owned read state.
4. Completed locally P1: default-off synthesized gift sounds, original premium motion, reduced-motion handling, serialized bounded combos, and one-time room-owner creator acknowledgements.
5. Owner-deferred/out of scope: legal/compliance implementation and launch analysis. Earlier planning files are archived background only.
6. Owner-deferred/out of scope: real token purchases, Stripe/processor work, refunds/chargebacks, creator financial balances, KYC/tax integration, withdrawal and payout. The product remains synthetic test-coin only.

## Completed P0 - Realtime video interaction and fixed test-gift system

- Completed locally: video-layer comments for audience and creator views, room-scoped gift celebrations, and an accessible activity visibility toggle.
- Completed locally: fixed bilingual gift values of 1, 5, 10, 20, 50, 100, 1,000, and 10,000 test tokens with original symbols, quantity selection, total preview, and balance-aware controls.
- Completed locally: server-side total calculation, high-value confirmation, idempotent paired test-ledger transfers, goal contribution, role enforcement, and minimal realtime payloads.
- Verified: focused workflow/realtime/schema tests, full staging gate, creator and audience desktop checks, 390×844 mobile check with no horizontal overflow, reduced-motion CSS, and deterministic demo reset.
- Intentionally excluded: token purchasing, real `CNY` custody or redemption, payment/cashout, creator payout, third-party gift media, downloadable assets, and Cloudflare/deployment changes.

## Completed P0 - Audience discovery and video-first room shell

- Completed locally: persistent signed-in audience navigation, clearer discovery hierarchy, original visual room cards, live-count/search/category controls, and compact access to audience activity.
- Completed locally: desktop video/chat split with support, goal, gifts, public support activity, creator profile, wallet, and private-show details below the primary viewing surface.
- Verified: full Cloudflare-free staging gate, English/Chinese audience chrome, desktop discovery/room review, 390×844 discovery/room review, corrected status badges, top-of-page room navigation, and no horizontal overflow.
- Deployed with owner approval in implementation commit `4f83934`; public HTTPS, the new asset hashes, container health, and audience rendering passed.

## Completed P0 - Creator navigation and live-control consolidation

- Completed locally: persistent Live, Earnings, Actions, Private Show, Profile, and Settings navigation with one focused workspace visible at a time.
- Completed locally: camera permission/private preview and the primary Go Live/End Broadcast path remain first; goal, chat, support, audience presence, and session metrics stay visible in Live while configuration and technical help moved to dedicated sections.
- Verified: all six sections in English and Chinese, desktop and 390×844 layouts, mobile card clipping and header fixes, no page-level horizontal overflow, complete staging gate, and audience/admin browser regressions.
- Deployed with owner approval in implementation commit `4f83934`; only the Stream web container was recreated, while existing APIs, media transport, Cloudflare configuration, payments, identity, and data services remained unchanged.

## Next P0 - Public discovery and low-friction test onboarding

- Replace the engineering-style signed-out console with an original public discovery landing page that can show safe room/profile metadata before login.
- Require sign-in only when a visitor enters protected interaction flows such as chat, support, follow, private-show access, or Creator Studio.
- Keep synthetic demo-role access available in local development, but move it into a clearly separated test-access panel rather than making it the product homepage.
- Preserve truthful live/offline states, English/Chinese copy, age-gate boundaries, and existing server-side authorization. Real authentication and launch compliance remain separate approval gates.

## Completed P0 - Browser-Native Quick Go Live

- Implemented and deployed: explicit device permission, private preview, camera/microphone selection, microphone level, mute/camera controls, WHIP start, safe stop, and error recovery.
- Implemented and deployed: server-only Cloudflare WebRTC endpoint discovery and signaling proxy; fixed WHIP/WHEP URLs, Stream token, account identifier, and SDP are excluded from browser logs and persistent browser storage.
- Implemented and deployed: room transport/session persistence, single-active-publisher enforcement, stale-session recovery, creator ownership, CSRF/rate limits, private-show-aware WHEP authorization, and OBS/HLS fallback.
- Verified: existing production Live Input advertises WHIP and WHEP without modification; provider/client unit tests, schema and role tests, expanded workflows, full staging gate, English/Chinese browser review, and production Compose gate pass.
- Published and deployed with owner approval as GitHub commit `6aa776d`; migration `012`, healthy API/web, public HTTPS assets and security headers, creator availability, read-only WHIP/WHEP capability, safe OBS default, and demo reset were verified.
- Verified physically: Logitech camera/microphone permission and private preview, short WHIP broadcast, provider-confirmed live state, session summary, explicit stop, provider disconnect, offline recovery, and deterministic demo reset.
- Completed with owner approval: created exactly one Stream signing key, installed its private JWK only in the ignored mode-600 Linux environment, deployed production-fail-closed signed WHEP, and verified successful creator/self-monitor and isolated-audience WHEP negotiations without exposing signing material.
- Verified physically: real 640×480 audience video reached ready state 4 and its media clock advanced while unmuted; explicit End Broadcast immediately closed playback and returned both creator and audience to offline. Subjective sound quality remains an owner listening check.
- Known gate: Cloudflare WHIP/WHEP remains beta and must be monitored; OBS/HLS remains the stable fallback.

## Completed P0 - Professional Creator Broadcast Cockpit

- Completed and deployed: compact creator-specific shell, large signed self-monitoring stage, truthful offline/connecting/live/unavailable preview states, and a focused OBS start checklist.
- Completed and deployed: realtime broadcast-state synchronization, deduplicated audience count, tabbed chat/support/audience activity, goal controls, session metrics, and secondary collapsible room/profile/private/action/moderation settings.
- Completed and deployed: owner-only lifecycle-backed current/latest session summary with duration, gift/action test support, action count, and top supporter.
- Completed verification: full staging gate, English/Chinese desktop review, real 390×844 responsive browser review with no horizontal overflow, lifecycle state checks, owner-only session-summary authorization, and final demo reset.
- Published and deployed with owner approval as GitHub commit `2a0ac1e`; public HTTP, container health, production readiness, and synthetic demo reset passed. No external broadcast was started for this milestone.
- Deliberately excluded: browser camera capture, automatic OBS launch/control, stream-key display, real earnings/payment, production notification sounds, and subjective camera/audio quality claims.

## Completed P0 - Public End-to-End Live Broadcast

- Completed: explicit Stream enable/configuration gate, production removal of fake-live controls, sanitized failures, and automatic 15-second lifecycle reconciliation.
- Completed with owner approval: created and installed one least-privilege production Stream token, verified it against the existing input, and deleted both obsolete expiring development tokens.
- Completed: activated the existing Live Input in the ignored mode-600 Linux environment, deployed only the Stream API/web changes, and verified public offline/readiness behavior without secret exposure.
- Completed with owner approval on 2026-08-26: physical Logitech camera/microphone ingest, automatic live/offline transitions, signed public playback, video/audio track proof, Linux-side audience HLS access, encoder stop, and demo reset.
- Remaining owner acceptance: view and listen from a separate human-controlled device/network if subjective picture and sound quality evidence is desired; OBS-specific usability remains untested because OBS is not installed.

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

The active product goal and phase gates are in `GOAL.md` and `docs/100-User-Deployment-Plan.md`. Local product, security, packaging, physical media, operational, and 100-concurrent-user evidence are complete. Private Linux staging is running exact source `e32058df1abc76c08e0bdc041206fa7a98f81c8c` behind a localhost-only SSH tunnel and now includes individual test-safe audience registration. Cloudflare configuration/cost, public exposure, payment, external identity, age/KYC, and compliance actions remain separate explicit approval gates.

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
6. P1 operational debt: add a guarded in-place `upgrade` action that recognizes the existing Compose project's localhost gateway instead of failing host admission because its own port is live.
