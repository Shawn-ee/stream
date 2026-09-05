# Stream MVP Backlog

## Streamer Studio production UI

- Implemented locally: single Studio shell, non-overlapping header, desktop sidebar, mobile navigation sheet, state-aware Setup/Live control label, flatter data/configuration surfaces, consistent button geometry, and production-facing connection/status terminology.
- Implemented locally: compact mobile pre-live ordering that surfaces metadata and the explicit camera/microphone action before the empty preview.
- Deferred: real-route replacement for Studio hash subsections, a dedicated multi-step setup state machine, searchable tag selection, and authenticated visual acceptance after deployment or a user-completed local test-age acknowledgement.

## Creator onboarding reliability and polish

- Implemented locally: isolated 9 MB Nginx allowance for the 8 MB identity-document contract, JSON 413 responses, route-scoped multipart enforcement, encrypted-file rollback cleanup, private-storage readiness, and a non-root API volume initializer.
- Implemented locally: on-device JPEG/PNG resize/compression, EXIF-aware decoding, 30 MB/40-megapixel source safeguards, exact preview, before/after size, real XHR upload progress, specific recoverable errors, and truthful receipt/review labels.
- Implemented locally: more compact introduction, progress, document, and activation presentation with mobile containment and no raw identity status enums.
- Verified locally with Windows Docker Desktop: production-style Compose, migrations, full staging regression suite, automatic and manual-review modes, a real 23.8 MB → 3.0 MB browser upload, Studio route recovery, desktop/390px responsive containment, and exact synthetic-data cleanup.
- Deferred: PDF recompression, malware scanning, external identity verification, automated retention, Google OAuth, and final physical-Android acceptance before a production release.

## Radical audience simplicity

- Implemented locally: canonical `/`, legacy Discover/Tags redirects, minimal header, compact multi-language/tag filters, live-first grid, conditional offline creator recommendations, compact cards, concise authentication, and simplified creator profiles.
- Implemented locally: immutable six-digit public room IDs and read-only ranked search data; offline room visits no longer record activity or mount live-only clients.
- Verification blocker: Docker Desktop is unavailable, so migration execution, database integration checks, browser QA against the local API, and the complete staging gate remain required before release.
- Deferred: autocomplete rendering for the existing read-only search endpoint, synthetic-production record markers/cleanup report, and removal of obsolete unmounted discovery components after compatibility verifiers are migrated.

## Audience information architecture

- Completed locally: canonical `/discover`, legacy Tags redirect, live-only Following row, routed Following/Activity/Notifications/Preferences pages, accurate account labels, and global URL-backed search.
- Completed locally: offline room chat/presence refusal in both UI and realtime API, one room Follow control, simplified offline actions, viewer-timezone schedule rendering, and Community deprecation without deleting historical records.
- Completed locally: compact `/@handle` audience profiles, safe public-field projection, account-controlled bio/avatar/visibility, active-creator enhancement, chat identity links, and explicit block/report actions.
- Deferred: audience-to-audience following, offline community chat, history deletion, notification push delivery, and removal of retained Community/category schema after production-client inventory.

## Room-classification follow-up

- Deferred: remove deprecated category and free-text classification columns only after external-client inventory and a reviewed production migration.
- Deferred: administrator tag/catalog management UI, alias curation, automated prohibited-tag moderation, and richer anti-manipulation trending signals.
- Deferred: analytics delivery for language-filter, tag, trending, following, and community engagement; no external analytics provider is added here.

## Creator onboarding and review

- Completed locally: short versioned agreement, two explicit declarations, agreement-first onboarding, encrypted private document receipt/replacement, and truthful uploaded/reviewed wording.
- Completed locally: activation method/review status, creator audience access, Studio Discover Live, and protected Creator Reviews queue/detail/actions with audited one-time viewing.
- Deferred: external verification, malware scanning, automated retention, agreement renewal, and Google OAuth.

## Creator onboarding and Studio authorization

- Completed locally: explicit creator account state, resumable profile/identity/agreement/review steps, server-side Studio guards, transactional automatic approval, explicit private draft-room creation/publication, public draft isolation, suspicious legacy-resource review view, and routed account/onboarding/Studio destinations. Focused integration, the complete staging gate, protected-route desktop/mobile browser acceptance, and final reset pass.
- Production follow-up: select a real identity provider; implement webhook verification and expiry; require renewed agreement acceptance for existing active creators; add manual approval/rejection administration; let active creators use both audience account surfaces and Studio cleanly; add Google OAuth as its own reviewed authentication milestone.

## Active frontend modernization

- Audience Homepage Navigation and Discovery Hierarchy completed locally: no permanent audience sidebar; compact Following row and empty state; audience avatar menu; distinct guest authentication actions; Live now, recommendations, categories, and upcoming hierarchy; and a single mobile Filter control. Focused checks and desktop/mobile browser acceptance pass. No commit or deployment occurred.

- Audience-First Entry and Approval-Gated Creator Access completed locally: the public sign-in surface has no role/demo shortcuts, guests have no creator entry, authenticated audiences apply from Account & security, mobile uses **Create / 创作** instead of implying immediate broadcasting, and only server-approved streamer roles render broadcaster tools. Focused checks, the creator approval/provisioning verifier, and three-role local browser acceptance pass. No commit or deployment occurred.

- P0 Truthful Discovery, Authoritative Broadcast Ending, and Safe Administration is completed and accepted locally: migration `023` persists local/Cloudflare source; live-only discovery and metadata, authoritative reranking, simulation-safe playback and health copy, server-owned browser/local ending, Cloudflare OBS fail-closed behavior, and selected-non-admin/reasoned/confirmed moderation all pass the complete Cloudflare-free staging gate and three-role browser acceptance. Docker/PostgreSQL was recovered without reset or volume deletion and demo data was reseeded. No commit, deployment, Cloudflare media, or soak test occurred.

- Persistent Audience Discovery Preferences and Personalized Ordering completed locally: signed-in audiences can save optional English/中文 and category interests, live/following priorities, disable personalization, or reset defaults. Ranking remains deterministic and explainable, uses bounded recent visits without exposing private history, and preserves the anonymous global fallback. Focused verification, bilingual browser acceptance, unchanged bundle ceilings, the complete staging gate, and demo reset pass. Next recommended milestone: a controlled local soak test with measurable duration, load, failure thresholds, cleanup, and no Cloudflare media.

- Live Schedule Reminders and In-App Delivery completed locally: per-follow reminder preferences, creator schedule-update notices, one-hour due reminders, safe notification room links, active-app realtime/poll refresh, Upcoming presentation, bilingual controls, deduplication, authorization, focused verification, full staging, and demo reset pass. Delivery is intentionally in-app only and requires the audience application to be active. Next recommended milestone: persistent audience discovery preferences and deterministic personalized ordering.

- Server-Rendered Social Preview Cards completed locally: common social/link-preview crawlers receive escaped, route-specific room/profile HTML with canonical metadata and an optional platform-owned image; human requests continue to receive the React SPA. Short caching, invalid-route handling, secret-exposure checks, focused verification, local browser smoke tests, the complete staging gate, and demo reset pass. Production reverse-proxy/crawler acceptance remains deployment-gated.

- Creator/Room Sharing completed locally: rooms and profiles expose bilingual native Share plus explicit Copy link controls, canonical clipboard URLs, route-aware browser metadata, and a generic server-visible Holiwyn preview fallback. Focused verification, desktop/mobile acceptance, bundle budgets, the complete staging gate, and demo reset pass. Route-specific crawler previews are now supplied by the completed server-rendered preview milestone above.

- Canonical Audience Room/Profile URLs and Browser History completed locally: discovery, room, and creator profile now have refreshable same-origin URLs; direct hydration, Back/Forward restoration, invalid-route recovery, document titles, mobile acceptance, and authentication-intent continuity pass. The complete staging gate passed and demo data was reset. Next recommended milestone: share controls using the canonical URL plus server-generated Open Graph/social-preview metadata.

- Anonymous-to-account interaction continuity completed locally: one safe pending intent preserves room/profile/destination and chat draft through audience authentication. Follow completes idempotently; chat, gifts, actions, private access, and reports remain explicit review steps with no automatic send, submit, or R spend. Focused verification, desktop guest Follow/chat/Wallet acceptance, 390×844 Following acceptance, the complete staging gate, and demo reset pass; no deployment or Cloudflare action occurred.

- Public Discovery and Interaction Authentication Gates completed locally: anonymous discovery, public profiles, room lifecycle/playback, privacy-safe chat/support history, read-only realtime, and truthful public presence now work without an account. Chat, follow, gift/action spending, private access, wallet, reports, broadcasting, Following, Inbox, and account management use one bilingual sign-in/create-account gate. Focused authorization tests, the complete staging gate, and desktop/390×844 browser acceptance pass; no deployment or Cloudflare action occurred.

- Audience Feed Polish and Truthful Offline Rooms completed locally: six bilingual synthetic creator fixtures, one-card-per-swipe mobile previews, compact metadata/schedule/action overlays, and offline follow/profile discovery without gift, paid-action, or private-access prompts. Server transaction routes now reject offline gift/action spending. Focused checks, the complete staging sequence, desktop acceptance, and 390×844 mobile acceptance pass; no deployment or Cloudflare broadcast occurred.

- Audience Discovery, Swipe Feed, Following, and R Wallet completed locally: optional All/English/中文 room filtering, server-ranked live/follow/viewer/follower discovery, truthful viewer/language card metadata, a contained vertical mobile snap feed with static previews, realtime Following, and idempotent simulated R orders using the existing synthetic ledger. R is a test-only unit with no cash value. Migration `020`, focused verification, the complete staging gate, and bilingual desktop/390×844 acceptance pass; no payment, redemption, deployment, or Cloudflare action was added.

- Follower Management and Realtime Follow State completed locally: creator-owned cursor pagination, safe follower identity fields, total count, follow date/status, realtime creator refresh, immediate audience Following-feed membership, and live discovery/room counts. Bilingual desktop and 390×844 two-account acceptance pass; no external notifications, private viewer activity, or deployment was added.

- Streamer Production Polish and Live Moderation completed and accepted locally: professional staging branding; title/category/language/tag/thumbnail setup before device permission; avatar crop focus; per-message delete/mute/timeout/ban; slow mode; blocked terms; layered broadcast health; OBS-aware live chat; consistent SVG controls; and expanded session summary. Migration `018`, the complete staging gate, and two-account bilingual desktop/390×844 browser acceptance pass. Docker Desktop repair and physical camera/Cloudflare broadcast validation remain separate owner-gated work; no production deployment has been performed.

- Unified creator menu and persistent avatar identity completed locally: one avatar popover replaces the overflowing creator tabs, language/sign-out are contained, and normalized creator avatars propagate across creator, room, discovery, Following, and public-profile surfaces. Database-backed upload/crop persistence and 390×844 browser acceptance now pass; physical Android device acceptance remains separate. No production deployment has been performed.

- Creator Center and wallet data truth completed locally: persistent Live/Earnings/Supporters/Actions/Profile/Settings navigation, period summaries, enriched paginated income records, all-support and gift-only rankings, truthful capability failures, and removal of misleading cash-value copy. Database-backed staging and bilingual mobile summary acceptance now pass.

- Earlier creator test wallet and gift ranking pass has been superseded by the Creator Center data-truth milestone above.

- One-screen desktop broadcaster setup and compact public-profile editing completed locally: dominant preview plus setup rail, non-duplicated media actions, explicit preview-ready state, viewer preview, timezone selector, and one save action. Remaining acceptance is an owner-assisted physical camera check after deployment.

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
- Frontend modernization Phases 1–9 plus public discovery, anonymous-to-account continuity, canonical routing, sharing, server-rendered preview cards, and in-app schedule reminders are complete locally. Next recommended milestone: persistent audience discovery preferences and deterministic personalized ordering.

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
