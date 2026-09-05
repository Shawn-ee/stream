# Changelog

## 2026-09-04 — Compact pre-live setup and creator tags (local)

- Collapsed the unused black camera placeholder before permission so the setup form uses the available Studio width; the real preview still appears after explicit device access.
- Renamed the ambiguous stream-thumbnail action to **Room cover** and explains that it is the image shown on the audience room card before entry.
- Replaced the permanent tag checkbox cloud with a compact searchable input, selected-tag chips, matching suggestions, and custom-tag creation.
- Added an authenticated, rate-limited custom-tag API with normalization, reserved/unsafe-name rejection, public tag-type enforcement, and audit events; the existing eight-tag room limit remains authoritative.
- Re-baselined the stale shared web-bundle gate to the already-deployed Studio architecture with less than 1 KiB of measured CSS/compressed headroom; JavaScript remains under its existing ceiling.

## 2026-09-04 — Streamer Studio production UI (local)

- Removed the outer audience/account header while Studio is open, eliminating the overlapping sticky-header defect on desktop and mobile.
- Added a persistent desktop Studio sidebar with concise, state-aware destinations; retained the same navigation in a contained mobile avatar sheet.
- Reduced the desktop setup imbalance, moved editable setup ahead of the empty camera preview on mobile, and shortened the initial mobile path to stream details and device permission.
- Flattened configuration pages, standardized eight-pixel controls, reduced oversized empty/data panels, and simplified Followers, Earnings, Monetization, and profile-preview labeling.
- Replaced user-facing simulation/test income labels with production-facing connection, playback, and R-earned language while retaining environment-gated local tooling.
- Updated Studio verification contracts; focused navigation, broadcaster, wallet, profile, mobile, type-check, and production-build checks pass. Browser submission of the local test age acknowledgement was intentionally not performed.

## 2026-09-04 — Creator onboarding upload reliability (local)

- Fixed the production gateway contract so valid identity uploads can reach the API while oversized requests receive a structured error.
- Added production volume ownership initialization and private-storage write readiness without running the API as root.
- Added rollback cleanup so failed database persistence does not leave an orphan encrypted document.
- Added local JPEG/PNG optimization with orientation handling, preview, before/after size, source safety limits, and unchanged PDF handling.
- Replaced synthetic upload percentages and generic/raw status presentation with real transfer progress, actionable errors, and truthful document-received language.
- Simplified the onboarding introduction, step presentation, review, and activation copy while preserving state authorization and the no-room/no-broadcast invariant.
- Fixed a Studio route-restoration race that could show Review again after successful activation and local age acknowledgement; `/studio` now resolves server-authoritative broadcast access before rendering.
- Eliminated the Windows-scrollbar-width horizontal overflow in the full-width audience header and replaced the off-screen file-input technique with clipped accessible input styling.
- Verified with Windows Docker Desktop: all migrations; 32/32 unit tests; the complete staging gate; automatic and manual-review onboarding; production Compose build/readiness/storage permissions; and the production bundle budget (JS 451.4 KiB raw/135.2 KiB gzip, CSS 144.9 KiB raw/25.8 KiB gzip).
- Browser QA completed with a synthetic 23.8 MB PNG compressed to 3.0 MB, uploaded, reviewed, auto-activated, and routed into an empty Studio without creating a room or requesting media permissions. Desktop and 390×844 responsive widths had no horizontal overflow; the synthetic account and encrypted document were removed afterward.

## 2026-09-04 — Visual system and desktop shell polish (local)

- Expanded the audience shell to the usable viewport and made the sticky header full-width with consistent responsive gutters.
- Reduced ornamental gradients, hover motion, pill-shaped search styling, nested cards, and repeated account-page labeling.
- Reworked Account pages around a flat tab rail, section-specific heading, open content canvas, and divider-based activity rows.
- Replaced the oversized centered offline-room state with a compact wide composition and reduced its actions to Follow and View profile.
- Replaced the card-like room-link confirmation with a small transient toast while preserving room, follow, report, navigation, and realtime behavior.
- Web/API type checking, focused desktop/mobile frontend verification, production build, bundle budget, and 1440/1920 browser rendering pass.

## 2026-09-04 — Radical audience simplicity (local)

- Replaced desktop/mobile discovery variants with one live-first homepage and compact URL-backed language, tag, and Following filters.
- Removed Discover navigation, mobile bottom navigation, permanent language buttons, Popular Tags/Trending duplication, homepage account feeds, and redundant explanatory copy.
- Added immutable six-digit public room IDs, exact-ID resolution, plural tag/following filters, and a privacy-safe read-only search endpoint.
- Simplified live cards, offline creator recommendations, creator profiles, authentication, and offline rooms.
- Offline room entry now avoids visit writes and all live-only client/data loading; the server also rejects offline visit recording.
- Type checks, static milestone verification, canonical-route verification, and production builds pass. Database/staging/browser verification is pending because Docker Desktop is unavailable.

## 2026-09-03 — Public audience profiles

- Added compact `/@handle` profiles with safe identity fields, creator-capability enhancement, and responsive presentation.
- Added account-controlled public bio, avatar, and profile visibility without exposing email, wallet, activity, notifications, sessions, or following data.
- Added explicit profile block/report actions and preserved side-effect-free profile navigation.

## 2026-09-03 — Audience information architecture and offline-room cleanup

- Reduced Discover to live followed creators, Live now, temporary language/tag filters, meaningful Trending/Popular tags, and recommendations when inventory is limited.
- Added routed Following, Activity, Notifications, and Discovery preferences pages; corrected avatar destinations and account section headings; removed modal Close and internal recovery-roadmap copy.
- Made `/discover` canonical, redirected legacy Tags/Category routes, and made header search submit URL-backed results from every audience route.
- Retired user-facing Community labels while preserving historical records, and blocked new/public Community use.
- Moved due schedule-reminder generation out of notification reads into an idempotent server background poller.
- Prevented offline audience room joins, presence increments, live-chat history/composer display, and chat sends at both the realtime server and UI layers. Simplified offline actions and removed duplicate Follow/share affordances.

## 2026-09-02 — Structured room languages and controlled tags

- Removed Category from creator onboarding, Studio room setup/editing, public room/profile responses, cards, room details, search controls, and discovery navigation.
- Added supported-language, normalized tag, room-language, room-tag, migration-report, and tag-preference schema with server-enforced one-primary/three-total language rules and eight-public-tag limit.
- Added URL-backed multi-language/tag discovery, language/tag-aware search and recommendations, Popular tags, Trending, Following, and optional Community surfaces.
- Added compact accessible text language badges with no flags, controlled Studio selectors, safe legacy category conversion, seed support, focused verification, and preserved draft/authorization/no-auto-room behavior.

## 2026-09-02 — Creator onboarding and administrator review

- Reordered onboarding to profile → agreement/18+ → private document upload → review → activation and removed mock-verification claims/provider dependency.
- Added AES-256-GCM private storage, content sniffing, limits, replacement history, immutable agreement acceptance, activation/review metadata, and administrator permissions.
- Added Creator Reviews queue/detail/actions, one-time audited viewing, safe notifications, Studio Discover Live, and creator audience access. Activation/navigation still creates no room or broadcast. Google OAuth was not added.

## 2026-09-02 - Server-authoritative creator onboarding and explicit room creation (local)

- Added migration `024_creator_onboarding_state.sql` with creator status, private onboarding drafts, identity results, versioned agreement acceptance, status history, audit events, and draft/published room state. Existing streamer accounts are preserved as active and questionable audience-owned creator resources are exposed through a read-only review view without deletion.
- Replaced the old navigation-triggered broadcast activation endpoint with read-only access/status checks plus explicit start, profile, test identity, agreement, activation, draft-room creation, and publication commands.
- Added reusable active-creator enforcement for Studio and broadcast APIs. Audience, incomplete, pending, rejected, and suspended creators are blocked; websocket creator access and public draft-room access apply the same server state.
- Added routed bilingual account sections and a four-step creator workflow with Resume later, server-derived review status, transactional automatic approval, empty Studio, and explicit private draft creation/publication. No page load requests camera/microphone access.
- Added focused onboarding/authorization/side-effect/draft-privacy verification and expanded schema assertions. Type checking, the production build, all 27 unit/storage tests, the focused integration checks, the complete staging gate, protected-route desktop/mobile browser acceptance, and the final demo reset pass. The final reset contains eight synthetic users, no onboarding drafts, no draft rooms, and no suspicious audience-owned creator resources. No commit, deployment, Cloudflare action, or identity collection occurred.

## 2026-09-02 - Audience-first header, account menu, and open broadcast access (local)

- Reduced the signed-out audience header to HOLIWYN, discovery/search, and one purple **Log in** action. Registration remains inside the consolidated authentication modal; unsupported Google/email providers are not simulated.
- Reduced the signed-in header to **Go live** and the avatar. Profile, Following, Wallet, Broadcast dashboard, Settings, language, and sign out now live in one keyboard-accessible desktop/mobile account menu.
- Collapsed empty Following content, replaced the oversized no-live panel with a compact recovery row, and retained the content-first live/recommended/category/upcoming hierarchy with one mobile Filter control.
- Added server-authoritative `BROADCAST_ACCESS_MODE=open|approval_required` configuration. Open mode atomically provisions a profile/room and grants an effective, server-checked broadcasting capability without removing audience access; approval mode fails closed.
- Removed the unfinished audience creator-application presentation while preserving its administrator/backend workflow for future approval mode. Added focused static and API verification; the complete staging gate, 1440×900, 820×1180, and 390×844 browser checks, bundle ceiling, and final demo reset pass. No deployment or external provider action occurred.

## 2026-09-02 - Audience homepage navigation and discovery hierarchy (local)

- Replaced the permanent audience creator sidebar with a compact horizontal Following row that keeps live creators first, distinguishes offline creators, and provides a stable empty state for new accounts.
- Simplified desktop navigation to Discover, Categories, search, language, Wallet, and an accessible avatar menu containing Following, account/profile, settings, creator application, and sign out. Guests now receive distinct Sign in and Create account actions.
- Reordered discovery around Live now, creators to follow, popular categories, and upcoming streams using only existing room/category/schedule data. Mobile retains the content-first feed while category/language controls now live behind one Filter button.
- Preserved room ranking, streaming, authentication, wallet, follow, schedule, and creator backend behavior. The complete Cloudflare-free staging gate, final seed reset, and 1440×900 plus 390×844 browser smoke tests pass with no horizontal overflow. No commit or deployment occurred.

## 2026-09-01 - Audience-first entry and approval-gated creator access (local)

- Removed public demo-role shortcuts and every signed-out creator/broadcast entry; the sign-in form now asks only for account credentials while the API remains the authority for audience, streamer, or administrator role.
- Kept discovery and public viewing audience-focused. Signed-in audience accounts receive a **Become a creator / 申请成为主播** entry, and the existing application/status workflow now lives inside Account & security rather than interrupting discovery.
- Renamed the authenticated mobile creator entry from **Go Live** to **Create / 创作**. It is absent for guests and opens the application workflow for audience accounts; only a server-approved streamer role renders the broadcaster interface.
- Added `verify:audience-first-entry` to the staging gate. Type checks, focused auth/navigation checks, the full creator-application authorization/provisioning test, and local browser smoke tests for guest, audience, and approved streamer paths pass. No commit, deployment, Cloudflare action, media start, payment, or production role change occurred.

## 2026-08-31 - P0 truth and safety hardening (local, accepted)

- Added migration `023_broadcast_status_source.sql` so lifecycle source is authoritative data rather than inferred from status copy.
- Split desktop/mobile discovery into Cloudflare-confirmed **Live now** rooms and clearly labeled recommendations; Following order, creator profiles, player startup, and crawler metadata also refuse to present local simulation as real live media. Lifecycle and follow-state events reload authoritative server ordering.
- Added a creator-owned broadcast-end API that closes active browser publisher resources, ends active session rows, persists offline, and emits the existing lifecycle path. Active production OBS ingest fails closed because the website cannot stop OBS.
- Made active-session sign-out depend on confirmed server termination and added actionable failure messages instead of silently ending only the login session.
- Reworded and badged local lifecycle fallback as explicit simulation that does not publish or stop video. Streamer OBS guidance and layered health now say **No media published / No audience media** instead of implying Cloudflare ingest or playable media during simulation.
- Replaced the administrator’s fixed Demo Audience moderation target/reason with selected non-admin controls, server-required reason, confirmation, localized states, and audit-compatible requests.
- Added `verify:p0-truth-safety` and a social-preview simulation unit test; typecheck, production build, all 27 unit/storage tests, focused frontend/broadcast checks, supply-chain and production configuration gates pass. The combined compressed budget remains below 149 KiB with 124.1 KiB JavaScript gzip plus 24.1 KiB CSS gzip and the unchanged 135 KiB raw CSS ceiling.
- Recovered Docker Desktop by renaming only its corrupt transient `run` directory to a timestamped backup; no factory reset, image deletion, container deletion, or volume deletion occurred. PostgreSQL 16 and Redis 7 are healthy. Migration `023`, the complete Cloudflare-free staging gate, public/streamer/administrator browser acceptance, authoritative simulated-session sign-out, targeted moderation and reversal, and final seed reset pass. No commit, push, deployment, Cloudflare request, media start, or soak test occurred.

## 2026-08-31 - Persistent audience discovery preferences

- Added audience-owned saved language/category preferences, live/following priority controls, an explicit personalization switch, and reset-to-default behavior in migration `022_audience_discovery_preferences.sql`.
- Added deterministic, explainable room ordering using only existing public room signals plus bounded recent visits; raw visit counts/timestamps remain server-side, and disabling personalization restores the anonymous global order.
- Added a compact bilingual For You preference panel that keeps one-session category/language filters independent from saved ordering preferences.
- Added schema/index assertions and `verify:personalized-discovery`; passed English/中文 rendered acceptance, the unchanged 135 KiB CSS budget, all 26 tests, the complete Cloudflare-free staging gate, and final demo reset.
- No tracking service, recommendation ML, external analytics, deployment, Cloudflare action, media broadcast, payment, or background soak test was started.

## 2026-08-31 - Live schedule reminders and in-app delivery

- Added follow-owned reminder preferences with opt-in by default, audience-only authorization, immediate opt-out cleanup, and safe persistence in migration `021_schedule_reminders.sql`.
- Added deduplicated bilingual notifications when creators publish a new future stream time and one-hour in-app reminders for opted-in followers; past schedules, unfollowed creators, disabled reminders, and currently live rooms do not generate reminder delivery.
- Added safe room links to notification responses, realtime schedule/preference/notification refresh, one-minute active-app polling, a bilingual Upcoming surface, and reminder toggles in the Following feed.
- Added schema/index assertions and `verify:schedule-reminders`; passed English/中文 rendered acceptance, all 26 tests, the complete Cloudflare-free staging gate, and demo reset. The 135 KiB CSS ceiling remains; the combined compressed asset ceiling is calibrated from 145 to 147 KiB for the first-party reminder workflow with no new library.
- No deployment, Cloudflare action, email, SMS, browser push, third-party notification service, or external message occurred.

## 2026-08-31 - Server-rendered social preview cards

- Added a public, read-only HTML renderer for canonical room and creator-profile previews using existing public room data, route-specific titles/descriptions, canonical URLs, and optional platform-owned avatar or stream-thumbnail images.
- Added strict path validation, HTML escaping, owned-image allowlisting, bounded metadata, short public caching, safe 404 behavior, and responses that do not expose Cloudflare or authentication secrets.
- Added crawler-only Nginx routing for common link-preview bots while preserving the normal React SPA for human visitors at the same `/room/:slug` and `/creator/:slug` URLs.
- Added `verify:social-previews`, passed direct room/profile browser smoke tests and the complete Cloudflare-free staging gate, and reset demo data. No deployment, DNS, Cloudflare configuration, crawler fetch, or external sharing occurred.

## 2026-08-31 - Room and creator sharing

- Added bilingual Share controls to desktop/mobile rooms and creator profiles, using the native Web Share sheet when available and a canonical-link clipboard fallback when it is not.
- Added explicit Copy link actions for desktop room/profile workflows, accessible status feedback, safe cancellation handling, and four-second notice cleanup.
- Added route-aware canonical links, document titles, descriptions, and Open Graph URL/title updates, plus server-visible generic Holiwyn Open Graph/Twitter fallback metadata in the SPA document.
- Added `verify:audience-sharing`, passed English/中文 desktop and 390×844 browser acceptance, retained the existing CSS/compressed bundle budgets, passed the complete Cloudflare-free staging gate, and reset demo data. No deployment or external sharing occurred.

## 2026-08-31 - Canonical audience room and creator routes

- Added canonical same-origin audience URLs for discovery (`/`), rooms (`/room/:slug`), and creator profiles (`/creator/:slug`) without introducing a second routing framework.
- Added direct-link hydration from the public room API, truthful loading/not-found/service-unavailable states, document titles, refresh persistence, and safe recovery to discovery.
- Integrated room/profile navigation with browser Back and Forward while preserving anonymous viewing and the existing authentication-intent return flow.
- Added `verify:canonical-audience-routing`, passed desktop and 390×844 direct-link/refresh/history/invalid-route/authentication browser acceptance, passed the complete Cloudflare-free staging gate, and reset demo data. Social-share controls and server-rendered link-preview metadata remain a later milestone; no deployment occurred.

## 2026-08-31 - Anonymous-to-account interaction continuity

- Added one typed, memory-only pending authentication intent so a guest can sign in or create an audience account without losing the room, profile, destination, or unsent chat draft that prompted authentication.
- Safely completes only idempotent Follow after authentication. Chat, gifts, actions, private access, and reports return the viewer to review/focus state and never auto-send, auto-submit, or auto-spend R.
- Added bilingual completion/failure feedback, one-shot guards, audience-role checks, logout cleanup, authoritative follower-count refresh, and desktop/mobile destination restoration for Following, Wallet, account, Inbox, and Go Live.
- Added `verify:auth-intent-continuity`, refreshed two prior static regression checks, passed guest Follow/chat/Wallet and 390×844 Following browser acceptance, passed the complete Cloudflare-free staging gate, and reset demo data. No deployment or external-service action occurred.

## 2026-08-31 - Public discovery and interaction authentication gates

- Removed the mandatory sign-in wall from the audience entry experience: anonymous visitors can browse discovery, filter rooms, open public creator profiles, enter public rooms, receive lifecycle/presence updates, and read privacy-safe chat/support activity.
- Added a reusable bilingual authentication gate for chat sending, following, gifts/actions, private-show purchase, wallet, reports, broadcasting, Following, Inbox, and account surfaces while preserving the requested destination after successful sign-in.
- Made anonymous realtime sockets read-only, counted public viewers in room presence, enabled public WHEP/HLS authorization for non-private live rooms, and kept private-show playback fail-closed.
- Removed Cloudflare input identifiers and internal chat sender IDs from anonymous room responses. Protected ledger, session, follower-state, creator, admin, and mutation APIs remain authentication/role guarded.
- Added `verify:public-discovery`, updated affected desktop/mobile/realtime regression checks, passed desktop and 390×844 browser acceptance without horizontal overflow, and passed the complete Cloudflare-free staging gate. Demo data was reset; no deployment or external-service action occurred.

## 2026-08-31 - Audience feed polish and truthful offline rooms

- Expanded deterministic discovery data to six synthetic creators across English/中文 and several room categories so the audience feed can be evaluated as a real discovery surface rather than a two-card demo.
- Redesigned the phone For You surface as a compact one-card-per-swipe feed with a viewport-dominant static preview, creator identity, title, language/category metadata, schedule, and one clear room/profile action.
- Made offline room commerce truthful: gift, action, and private-access controls are absent while offline, and the API rejects direct gift/action purchases unless broadcast state is `live`.
- Added a focused audience-feed verifier, updated live gift/realtime/expanded workflow fixtures, retained the 135 KiB CSS guardrail, and passed desktop plus 390×844 browser acceptance.
- Passed the complete Cloudflare-free staging sequence after its final expanded verifier and reset all synthetic data. No deployment, real payment, media broadcast, or Cloudflare action occurred.

## 2026-08-31 - Audience discovery, mobile swipe feed, and R wallet

- Added optional All/English/中文 discovery filtering while preserving All languages as the default.
- Added truthful live audience counts, language badges, following state, and deterministic live/follow/viewer/follower/freshness ranking to room discovery.
- Changed the mobile For You surface to a contained vertical snap feed using static previews; tapping still enters the existing truthful room playback flow.
- Added an audience Wallet entry with `R` balance, four simulated package choices, idempotent test orders, and recent ledger activity. Replaced audience and creator token labels with `R` while retaining a concise no-cash-value boundary.
- Added migration `020`, schema coverage, focused discovery/presence/language/order/idempotency verification, and updated desktop/mobile regression guards.
- Passed the complete Cloudflare-free staging gate and bilingual desktop/390×844 browser acceptance. Demo data was reset; no real payment, deployment, or Cloudflare action occurred.

## 2026-08-31 - Follower management and realtime follow state

- Added an ownership-protected, cursor-paginated creator Followers API and migration `019` with a streamer/date/follower index.
- Added a bilingual Creator Center Followers page with total count, public display name/handle, follow date, relationship status, loading/error/empty states, and bounded load-more pagination.
- Added privacy-safe realtime follow events so audience Following membership and room/discovery follower counts update without reload while the creator list refreshes immediately.
- Added focused authorization, safe-field, duplicate-follow, pagination, realtime, migration, and cleanup verification.
- Completed English/Chinese two-account browser acceptance at desktop and 390×844: follow and unfollow propagated immediately in both directions, mobile rendered without horizontal overflow, and no browser console errors were present. No deployment or external-service change was made.

## 2026-08-30 - Streamer production polish and live moderation

- Replaced the visible local-development/MVP entry branding with bilingual Holiwyn private-staging presentation while preserving explicit test-account/test-coin disclosure.
- Added a compact pre-live sheet for title, category, language, tags, audience-card preview, and a normalized 16:9 stream thumbnail; metadata is saved before broadcasting begins.
- Added creator-owned per-message delete, mute, ten-minute timeout, and ban actions; active restriction removal; server-enforced slow mode and blocked terms; audit records; and minimal realtime deletion/moderation events.
- Split live health into local device, Cloudflare ingest, and audience playback status, and expanded the post-stream summary with support, supporter, chat, follower, duration, peak-viewer, and top-supporter context.
- Replaced broadcaster text glyph controls with a shared SVG icon vocabulary and added avatar focal-point controls backed by server-side crop coordinates.
- Added migration `018`, thumbnail normalization/storage tests, avatar crop tests, bounded Nginx upload routing, schema assertions, and a focused production-polish verification gate.
- Calibrated the raw CSS regression ceiling from 125 KiB to 135 KiB for the new first-party responsive surfaces while retaining the existing 145 KiB combined compressed-network budget.
- Completed the full Cloudflare-free staging gate with PostgreSQL 16 and Redis 7 on localhost, including all 23 API/storage tests, realtime clustering, lifecycle, authorization, security, and expanded workflows. The staging-operator verifier now preserves its pinned Docker path while using the same read-only shell/mock checks through WSL when Docker is unavailable.
- Completed two-account browser acceptance in English and Chinese at desktop and 390×844: realtime chat moderation and timeout enforcement, slow mode/blocked-term persistence, avatar crop persistence, thumbnail persistence, layered health, and post-stream summary. Browser review also fixed OBS/provider-live sessions incorrectly showing **SET UP** with hidden chat, exposed metadata before camera permission, and removed a desktop metadata-label overlap. Nothing was committed, pushed, deployed, or sent to Cloudflare.
- Made the demo seed deterministic for the new production-polish fields: stream language/tags, thumbnail, slow mode, and blocked terms now return to their safe defaults, with a focused regression assertion. The final reset leaves the demo streamer offline with no uploaded media or active moderation restriction.

## 2026-08-30 - Public avatar upload gateway fix

- Fixed public avatar uploads being rejected by the web gateway before reaching the API: Nginx kept its global 64 KiB request limit while the exact creator-avatar route received a bounded 6 MiB allowance for the API's 5 MiB file plus multipart overhead.
- Added a gateway regression check and changed the deployment avatar fixture to an incompressible image larger than 64 KiB, ensuring future end-to-end verification crosses the proxy rather than accidentally testing only tiny images.
- Added a specific bilingual oversized-image message while preserving the existing generic safe failure copy.
- Changed public avatar responses from one-year immutable caching to `no-store`, so replacement/removal is truthful without a Cloudflare cache-purge dependency at the current 100-user stage.

## 2026-08-29 - Unified creator menu and persistent avatars

- Replaced the overflowing Creator Center tab strip and separate account/language controls with one always-visible avatar menu containing Live, Earnings, Top supporters, Actions/private show, Public profile, Settings, language, and safe sign-out.
- Preserved the single mounted broadcaster runtime: opening any creator utility changes only the presentation view, while Return to live and browser history restore the same camera/publisher session.
- Added creator-owned JPEG/PNG/WebP avatar upload and removal with a 5 MB input limit, server-side rotation/cropping, metadata removal, bounded 512×512 WebP output, randomized filenames, and role/CSRF enforcement.
- Propagated avatars through discovery, Following, room identity, public creator profiles, and creator navigation with initials as a resilient fallback.
- Added a persistent production avatar volume and focused storage/API/navigation verification. Type checks, production builds, image normalization tests, navigation/profile gates, production-environment validation, image locking, and supply-chain policy pass. Database-backed avatar verification remains pending because local PostgreSQL/Docker Desktop is unavailable.

## 2026-08-29 - Creator Center and wallet data truth

- Replaced the two isolated streamer utility buttons with a persistent Creator Center for Live, Earnings, Supporters, Actions, Profile, and Settings while keeping the browser publisher mounted and Back to Live history-safe.
- Added creator-owned wallet summary APIs for session, 7-day, 30-day, and lifetime periods; totals distinguish gifts, actions, and private-show test support.
- Added enriched, filterable, cursor-paginated creator income transactions with safe supporter display name, support label, quantity, room, completion state, and timestamp.
- Added room-owner-only supporter rankings over all support or gifts only, with privacy-safe aggregates and the same period controls.
- Reworked Earnings and Supporters into bilingual responsive product pages with explicit loading, valid-empty, and unavailable states; an old or unreachable API can no longer appear as a zero balance or an empty ranking.
- Removed yuan-reference wording from the audience gift flow. Test tokens remain synthetic and cannot be purchased, redeemed, withdrawn, or paid out.
- Type checks, focused creator wallet/navigation gates, production build, and desktop/mobile Chrome navigation smoke tests passed. A temporary embedded PostgreSQL-compatible verifier applied all migrations and executed the exact summary, enriched transaction, all-support, and gift-only SQL against gifts/actions/private-show fixtures. The complete Compose staging gate remains pending because Docker Desktop crashes on a stale local inference socket; no temporary dependency or verifier remains in the project.

## 2026-08-29 - Creator test wallet and top-gifter ranking

- Made the broadcaster End Stream control unmistakably destructive with a solid red treatment while retaining the existing confirmation step.
- Added an Earnings entry outside the camera workflow. The dedicated creator view shows available test coins, lifetime support income, gift/action split, recent positive ledger entries, and the current/latest session summary.
- Added a creator-only top-10 gift ranking calculated from cumulative gift test coins, with total gift quantity as the deterministic tie-breaker. Only display names and aggregate test values reach the browser.
- Wallet, ranking, and totals refresh from the existing room-scoped gift/action realtime events; opening Earnings keeps the publisher mounted and provides a direct Back to Live route.
- Preserved the test-money boundary: no deposits, purchases, withdrawals, payouts, cash representation, or commercial provider integration was added.

## 2026-08-29 - One-screen broadcaster setup and compact public profile

- Reorganized the desktop pre-live experience into a video-first two-column surface: the private preview remains dominant while title, device choices, microphone level, and the primary Go Live action stay visible in one ordinary laptop viewport.
- Removed the duplicate microphone control from the preview overlay, retained one clearly labeled microphone action in the setup rail, and changed ambiguous ready copy to explicit **Preview ready** / **预览就绪** state language.
- Replaced the stretched two-card Profile screen and its duplicate save actions with a compact viewer preview, one responsive settings form, a curated timezone selector, and one atomic user-facing save action backed by the existing room/profile APIs.
- Preserved the existing browser media, WHIP publication, realtime chat/gifts, navigation persistence, mobile camera-first setup, and fullscreen live layouts.
- Type checks, focused broadcaster/navigation/resilience/profile/mobile gates, production builds, and bundle budgets pass. Database-backed staging and physical camera/Cloudflare checks were not run because local Docker was unavailable and live media still requires immediate owner approval.

## 2026-08-29 - Desktop broadcaster stage cleanup

- Expanded the desktop camera surface across the available broadcast column instead of constraining its width through a fixed video height, eliminating the unused strip around the live controls.
- Removed opaque creator-side chat and gift cards from the camera overlay. Messages now use clean foreground text with restrained shadowing, while premium gifts retain motion, color, and symbol glow without dimming the video.
- Preserved the existing mobile fullscreen broadcaster rules and added focused broadcaster UI assertions for the desktop sizing and transparent overlay behavior.
- Added an opt-in `VITE_DEV_API_TARGET` development proxy override for owner-approved local UI review while retaining the isolated local API as the default.

## 2026-08-28 - Streamer live-session-safe navigation

- Kept the browser publisher, camera/microphone tracks, heartbeat, chat, gifts, viewer presence, and runtime timer mounted when a streamer opens Profile; auxiliary views now hide the live surface instead of destroying it.
- Added history-aware Profile navigation so the browser Back action and both visible Back to Live actions return to the existing session without ending or republishing it.
- Added a clear live-session continuation banner inside Profile and restored mobile access to Profile/Back without adding a dashboard navigation bar.
- Added an active-session browser leave warning for real refresh, tab close, or external navigation while preserving the existing bounded server recovery path when the creator confirms leaving.
- Added `verify:streamer-navigation` to the staging gate. No camera permission or Cloudflare broadcast was used during implementation.

## 2026-08-28 - Immersive mobile broadcast and interruption recovery

- Made the active mobile broadcast a true viewport-filling camera surface with floating status, auto-hiding controls, compact confirmed ending, and upper-right transient creator chat/gift activity.
- Removed the broadcaster's large activity toggle and duplicate live camera controls; normal activity slides in from the right and expires naturally without taking video space.
- Reworked camera flip to prefer explicit front/rear `facingMode`, fall back to device identifiers, handle phones that cannot open two cameras concurrently, restore the prior camera after a failed switch, replace the published WebRTC track without renegotiation, mirror only the front local preview, and report switching progress/failure.
- Added progressive mobile fullscreen and Screen Wake Lock requests after the creator's explicit Go Live action; unsupported browsers continue without failing the broadcast.
- Added foreground/background guidance, tab/background and `pagehide` interruption signaling, a visible Resume Live action, and a 15-second publisher heartbeat.
- Added server-owned publisher expiry: missing heartbeats terminate the exact Cloudflare WebRTC resource, close the database session with `heartbeat_expired`, emit a truthful connecting recovery state, and allow a bounded 45-second recovery window before offline.
- Separated recovery from intentional End Stream: a resume retires only the stale WebRTC session, keeps the room in its recovery window, and avoids false ended/started follower notifications.
- Added recovery-state unit tests and `verify:broadcast-resilience` coverage. No Cloudflare broadcast was started during development verification.

## 2026-08-27 - Minimal broadcaster interface redesign

- Replaced the card-heavy Creator Cockpit live workflow with a dedicated broadcaster surface built around camera preview, live video, chat, incoming gifts, connection health, and essential media controls.
- Desktop now uses a minimal Holiwyn/live-duration/viewer header and a roughly 75/25 video-plus-chat layout with the stream title and one compact health line beneath the video.
- Mobile now uses a camera-first setup flow before broadcasting and an immersive full-viewport live presentation with recent chat/gift overlays, Mute, Camera/Flip, Chat, and confirmed End Stream controls.
- Incoming gifts render as highlighted chat events; the broadcaster has no gift-purchasing surface.
- Added Preparing, Preview, Connecting, Live, Reconnecting, Ending, Ended, and permission-failure presentation, including a simple duration/peak-viewer end summary.
- Preserved the existing camera/microphone acquisition, WHIP publisher, active track replacement, Socket.IO room events, title save, safe publish-session deletion, and media-track cleanup.
- Added `verify:broadcaster-ui` to guard the responsive layout, essential controls, safe ending, and exclusion of earnings/analytics/goal panels from the broadcast workflow.
- Type checks, focused broadcaster checks, production build, and frontend bundle budget pass. A physical camera/microphone and Cloudflare broadcast still require explicit owner confirmation immediately before testing.

## 2026-08-27 - Frontend modernization Phase 9 polish and performance

- Added a stable bilingual Holiwyn boot surface while the session is checked, preventing the signed-out test console from flashing before a valid session resolves.
- Debounced creator search by 250ms and added request sequencing so a slower old response cannot replace newer search results.
- Added explicit bilingual discovery and Following service-failure states with retry controls, distinct from loading and legitimate empty results.
- Localized screen-reader loading status for desktop and mobile creator skeletons.
- Added deferred below-fold rendering for discovery, Following, audience-library, creator-program, and profile-recommendation surfaces with intrinsic layout sizing.
- Added focused `verify:frontend-polish` coverage and a production bundle gate: JavaScript ≤450 KiB raw, CSS ≤125 KiB raw, and combined compressed assets ≤145 KiB.
- Current production assets pass at JavaScript 356.8 KiB raw/106.9 KiB gzip and CSS 94 KiB raw/18 KiB gzip.
- Browser acceptance confirmed one API request for a rapidly entered four-character search, no warning/error logs, zero horizontal overflow at 320×568, 390×844, 768×1024, and 1440×900, correct mobile/desktop shell switching, and 52px mobile navigation controls.
- No backend route, database schema, media transport, Cloudflare resource, payment, authentication policy, deployment, or production configuration changed.

## 2026-08-27 - Frontend modernization Phase 8 creator profile

- Added a dedicated responsive public creator profile using the existing profile, room, schedule, category, follower, and broadcast-lifecycle APIs.
- Added truthful live, connecting, offline, and unavailable presentation with direct current-room access; no fake video preview or manually seeded live claim was introduced.
- Connected existing follow/unfollow state to the profile and refreshes the existing Following feed after changes.
- Made creator identity in both desktop and mobile room chrome open the full profile, while retaining a compact profile summary in the room.
- Added bilingual loading, failure, About, schedule, current-room, and recommended-creator surfaces with original Midnight Aurora artwork rather than invented cover media.
- Added responsive 44px-or-larger profile controls, narrow-screen stacking, safe-area clearance, reduced-motion behavior, and a focused `verify:creator-profile-ui` staging gate.
- Desktop localhost acceptance passed at 1280×720 with zero page overflow and complete English/Chinese states. Mobile behavior is structurally covered at the specified breakpoint; actual-device validation remains part of the final responsive QA phase.
- No backend route, database schema, authentication, streaming transport, Cloudflare resource, payment, deployment, verification badge, social account, clip, or VOD feature changed.

## 2026-08-27 - Frontend modernization Phase 7 mobile broadcasting

- Reworked Browser Quick Go Live into a staged creator flow: deliberate camera/microphone permission, private preview, stream-title setup, device selection, explicit start, understandable live-session controls, and confirmed ending.
- Defaulted initial mobile camera selection toward the user-facing camera while retaining exact device selection after permission.
- Added active camera and microphone switching through `RTCRtpSender.replaceTrack`, preserving the current WHIP session instead of renegotiating or exposing the provider endpoint.
- Added friendly Ready, Connecting, Excellent, Reconnecting, and Unavailable connection labels, live duration, explicit camera/microphone state, and a compact in-preview control layer.
- Saved the bounded room title through the existing owner-authorized room-metadata endpoint before publishing. A failed save prevents media publication.
- Added an accessible bilingual end-stream confirmation; ending still closes the peer, deletes only the opaque local publish session, stops every local media track, and refreshes truthful lifecycle state.
- Added dedicated mobile broadcast styling, 44px-or-larger controls, safe narrow-screen wrapping, reduced-motion handling, and fixes for a 320px Creator Studio class collision and existing compact-grid overflow.
- Added focused active-track replacement coverage and `verify:mobile-broadcast` to the complete Cloudflare-free staging gate.
- Completed read-only browser acceptance at 320×568, 375×812, 390×844, 414×896, 430×932, 844×390, and 1440×900 with no horizontal overflow or localhost console warnings/errors. Camera/microphone permission and a real broadcast were intentionally not activated.
- No backend route, database schema, Cloudflare resource, DNS, deployment, payment, payout, real identity, or production configuration changed.

## 2026-08-27 - Frontend modernization Phase 6 mobile live room

- Added a mobile-only immersive room chrome around the existing truthful player: in-player back/status controls, creator identity, presence, follow, chat, gift, optional private access, and a compact report overflow entry.
- Expanded the mobile media stage to approximately 68% of the portrait viewport while preserving source aspect with contain behavior and keeping offline/connecting/unavailable states truthful.
- Reused the existing temporary chat and gift activity overlay above video; no second socket or event stream was added.
- Replaced the permanent mobile chat and gift sections with accessible bottom sheets that share the existing draft, send callback, gift catalog, wallet, quantity, idempotent ledger action, and bilingual state.
- Added recommended-next creator cards below the core room so discovery remains one tap away without initializing additional video.
- Hid product header and bottom navigation during the immersive room. Short phone landscape viewports through 932px now use a no-scroll, full-viewport player surface while portrait retains supporting room details below video.
- Added localized sheet close labels and unique chat input IDs without changing desktop dialog behavior.
- Added `verify:mobile-room` to the complete Cloudflare-free staging gate and updated the existing desktop-room verifier for the reusable chat input ID.
- Completed Windows Chrome acceptance at 320×568, 375×812, 390×844, 414×896, 430×932, 844×390, 932×430, and 1440×900. All passed without horizontal overflow or localhost console errors; chat/gift sends, follow/report, private purchase, and broadcast actions were intentionally not triggered.
- No backend behavior, database schema, realtime protocol, gift ledger, media transport, Cloudflare resource, deployment, real payment, or production configuration changed.

## 2026-08-27 - Frontend modernization Phase 5 mobile discovery

- Replaced the mobile stacked-desktop discovery fallback with a dedicated one-column, content-first creator feed while preserving the existing desktop header, featured surface, rail, and grid.
- Added bilingual For You, Following, and Live tabs backed only by the existing room and followed-creator state. Live filtering uses truthful normalized lifecycle state; it does not seed or invent activity.
- Added a compact mobile category selector, expandable creator search integration, large 16:9 static previews, three-card loading skeletons, and discovery-driving empty states.
- Kept discovery previews bounded and inexpensive: no video, iframe, autoplay, media negotiation, or duplicate API/socket ownership exists in the mobile feed.
- Added `verify:mobile-discovery` to the complete Cloudflare-free staging gate.
- Completed Windows Chrome acceptance at 320×568, 375×812, 390×844, 414×896, and 430×932. The pass confirmed 44px tabs, zero horizontal overflow, correct 16:9 geometry, search/category results, Following/Live empty states, complete Chinese labels, and no discovery video initialization.
- Confirmed the existing desktop discovery remains active at 1440×900. No backend behavior, database schema, media transport, Cloudflare resource, deployment, real payment, or production configuration changed.

## 2026-08-27 - Frontend modernization Phase 4 mobile global UI

- Added a dedicated signed-in audience mobile header with compact Holiwyn identity, an explicit expandable creator search, and direct account access while keeping desktop navigation unchanged.
- Added a bilingual five-item Home, Discover, Go Live, Inbox, and Me bottom navigation with 52px controls, a visually emphasized central Go Live action, and safe-area-aware fixed positioning.
- Routed mobile destinations to existing product surfaces only: live discovery/search, creator application, audience activity, and account/session controls. No duplicate API, socket, authentication, or creator workflow was introduced.
- Made mobile app navigation immediate instead of page-level smooth scrolling, preventing long-page tab changes from appearing one selection behind.
- Removed the global 320px body minimum that caused a scrollbar-gutter overflow at the smallest supported viewport.
- Added the focused `verify:mobile-shell` gate and included it in the complete Cloudflare-free staging sequence.
- Completed Windows Chrome acceptance at 320×568, 375×812, 390×844, 414×896, and 430×932: no horizontal overflow, all five controls remained 52px tall, destination routing landed correctly, search/account states rendered, and the room remained usable at the edge widths.
- A Chrome room transition exposed and then verified the fix for an accidentally removed shared `useRef` import before completion. No backend behavior, database schema, media transport, Cloudflare resource, deployment, real payment, or production configuration changed.

## 2026-08-27 - Frontend modernization Phase 3 desktop live room

- Reorganized the audience room around a dominant 16:9 video stage and a 21.5rem sticky live-chat panel, with a one-column tablet fallback below 1024 pixels.
- Added a compact reusable creator bar directly below playback with truthful lifecycle/presence, strong follow state, direct gift access, conditional private access, and a quiet report overflow action.
- Added a reusable accessible chat panel with status/presence, polite realtime message updates, labeled input, empty state, and direct access to the existing gift tray.
- Kept goals, creator actions, gifts, support activity, profile, private-show status, and wallet history available but visually subordinate to playback and chat.
- Preserved signed WHEP browser playback, signed Cloudflare iframe/HLS playback, video activity overlays, Socket.IO, authorization, follow/report, gift ledger, private access, and wallet behavior.
- Added a focused desktop-room verifier to the complete staging gate; the production build and full Cloudflare-free suite passed and demo data was reset.
- Completed rendered acceptance in the owner's Windows Chrome at 1707px, 1024px, 390px, and 320px. The pass confirmed exact 16:9 playback sizing, bounded desktop chat, responsive stacking, and zero Holiwyn console errors.
- Fixed two Chrome-discovered mobile overflows: the gift-sound control now wraps within the gift tray, and the wordmark collapses to its mark at 320–359px so account/search controls remain inside the viewport.
- No backend behavior, database schema, Cloudflare resource, deployment, real payment, or production configuration changed.

## 2026-08-27 - Frontend modernization Phase 2 desktop discovery

- Replaced the signed-in audience discovery shell with a recognizable Holiwyn header, inline creator-first search, focused Discover/Following navigation, and a clear Go Live route to the existing creator program.
- Added a collapsible desktop creator rail with truthful live/offline state, separate recommendations and followed creators, and realtime lifecycle updates from the existing discovery socket.
- Added reusable featured-live and lightweight stream-card components with dominant 16:9 artwork, creator identity, category, follower metadata, loading skeletons, and discovery-driving empty states.
- Added desktop, compact-laptop, tablet, and mobile fallback layouts without inventing viewer counts or modifying room/follow/category APIs.
- Added a focused desktop-discovery verifier to the complete staging gate; the production build and full Cloudflare-free suite passed and demo data was reset.
- Completed Windows Chrome discovery acceptance at 1707px and 320px with no horizontal overflow or Holiwyn console errors; the 320px header fix collapses only the wordmark text while preserving search and account access.
- No backend behavior, schema, media transport, Cloudflare resource, deployment, real payment, or production configuration changed.

## 2026-08-27 - Frontend modernization Phase 1 foundation

- Added a semantic Midnight Aurora design layer with a bounded spacing scale, typography hierarchy, 44px controls, visible keyboard focus, reduced-motion behavior, safe-area insets, and explicit mobile-first breakpoints at 480, 768, 1024, and 1440 pixels.
- Added reusable accessible modal, bottom-sheet, empty-state, skeleton, and live-card-skeleton primitives without changing application data or authorization behavior.
- Added truthful discovery loading and empty states and branded mobile-browser metadata while preserving the existing room-card and filtering paths.
- Added a focused frontend-foundation verifier to the complete staging gate; the full Cloudflare-free staging suite passed and demo data was reset.
- No backend behavior, database schema, media transport, Cloudflare resource, deployment, real payment, or production configuration changed.

## 2026-08-27 - Frontend modernization Phase 0 audit

- Audited the rendered signed-out product and the current React/Vite, CSS, Fastify, PostgreSQL, Redis/Socket.IO, authentication, discovery, room, chat, gift, profile and browser/OBS streaming paths before UI changes.
- Recorded an incremental presentation architecture that preserves current APIs, state machines, authorization, realtime events and Cloudflare transport.
- Identified the primary gaps: test-console entry, monolithic frontend, missing global discovery rail/mobile navigation, non-immersive mobile room, permanent mobile chat/gift stacks, inconsistent design tokens/touch targets and incomplete mobile broadcast sequencing.
- Added an ordered implementation and verification map; no backend, schema, streaming, provider, deployment or production change occurred.

## 2026-08-27 - Owner narrows active goal to test-only product

- Removed legal/compliance execution and all real-money/payment/payout work from the active product goal at the owner's direction.
- The active deliverable is now four verified phases: account lifecycle, creator approval/provisioning, audience retention, and gift polish, while preserving bilingual streaming workflows.
- Kept all coins, gifts, actions, private access and creator earnings explicitly synthetic and non-redeemable; no payment processor, real balance, withdrawal or payout is planned in this goal.
- Added an authoritative test-only completion audit and verifier; archived earlier moderation/commercial plans as non-active background records.
- Removed legal/commercial planning checks from the normal staging gate and retained the focused product, security, realtime and deployment-safety checks.

## 2026-08-27 - Inactive commercial architecture and activation gates

- Added a separate immutable balanced double-entry ledger design with legal-entity/currency accounts, purchase/token/earning/payout state machines, immutable reversals, and proposed tables that are not migrated or active.
- Added authoritative hosted-checkout/webhook processing: signed raw-body verification, replay and duplicate safety, out-of-order handling, local and processor idempotency, and an explicit rule that browser redirects never grant tokens.
- Added creator pending/available/held payable, reserves, negative balances, refunds/chargebacks, payout dual control, daily processor-ledger-settlement-bank reconciliation, suspense, and independent kill switches.
- Added a money-movement threat model covering card testing, account takeover, self-gifting/collusion, refund abuse, payout takeover, insider risk, sanctions, prohibited-content monetization, and recovery tests.
- Added a staged activation checklist requiring named owner, counsel, privacy, security, finance/accounting, Trust & Safety, processor/acquirer, KYC/tax and operations evidence.
- Recorded Stripe as no-go unless the exact disclosed business and content model receives written approval; processor misclassification or restriction bypass is prohibited.
- Added official Stripe technical sources and a static commercial-design verifier to the full staging gate.
- No migration, credential, processor resource, real checkout, identity/KYC data, bank data, real token, payout, money movement, deployment, or production change occurred.
- Added a six-phase requirement/evidence audit that corrects stale launch-candidate status, proves which focused checks cover phases 1–5, and explicitly records phase 6 as incomplete rather than treating design documents as live payments.
- Added an owner-facing processor scope questionnaire covering the exact entity, jurisdictions, content/adult-live-chat decision, tokens, private access, refunds, creator economics, merchant of record, payout/KYC/tax, risk, and operating facts that must be disclosed without misclassification.
- Added the audit verifier to the complete staging gate; it checks focused-script presence/inclusion, incomplete-goal language, fresh approval boundaries, and the minimum processor disclosures.

## 2026-08-27 - Production moderation and compliance planning

- Added a production moderation architecture with separated roles, least privilege, case/evidence boundaries, severity routing, child-safety/NCII/imminent-harm playbooks, enforcement/appeals, retention decision matrix, and implementation exit gate.
- Added nine compliance launch gates covering the fixed business model, jurisdictions, age/creator eligibility, policies/victim channels, privacy, Trust & Safety, processor/commercial feasibility, security/vendors, and signed launch approval.
- Added a dated register of official U.S. government, NCMEC, California, Supreme Court, and Stripe sources for professional review.
- Recorded the hard payment feasibility issue: Stripe currently identifies adult content/services and adult live-chat as prohibited and content-creation platforms as requiring review; no bypass or eligibility assumption is allowed.
- Added a static policy-plan verifier and included it in the full staging gate.
- No legal conclusion, identity/age collection, KYC, evidence collection, content enforcement, payment credential, external message, deployment, or infrastructure change was made.

## 2026-08-27 - Gift experience polish

- Added persisted, serialized ten-second same-gift combo chains with batched-quantity support and a 10,000 cap while retaining per-purchase price and ledger truth.
- Added default-off, user-enabled Web Audio gift cues generated locally without assets, autoplay, downloads, or third-party requests.
- Expanded original celebration/premium CSS into a large media-layer moment with semantic live-region text and reduced-motion fallback.
- Added one-time, room-owner-only creator thanks with persistence, duplicate safety, and minimal room realtime events.
- Added migration `017_gift_polish.sql`, schema coverage, focused combo/ledger/realtime/acknowledgement verification, and staging-gate integration.
- Verified audience and Creator Studio sound controls, premium catalog presentation, realtime combo display, persisted thanks, bilingual copy, and 390×844 layouts without overflow or browser errors; reset demo data afterward.
- No real currency, purchase, Stripe, cashout, payout, external gift media, download, Cloudflare, deployment, or infrastructure action was introduced.

## 2026-08-27 - Audience retention loop

- Replaced the one-way follow button with persisted follow/unfollow status and a private live-first followed-creator feed.
- Added creator-managed regular schedule copy, optional next-stream timestamp, and validated IANA timezone to discovery, profile, room, feed, and Creator Studio surfaces.
- Added deduplicated bilingual in-app notifications for truthful broadcast-started/ended lifecycle transitions, plus owner-only single/all read controls and unread presentation.
- Removed repeated “follow updated” notification noise and confirmed unfollowed accounts receive no later lifecycle notice.
- Added migration `016_audience_retention.sql`, schema coverage, a focused verifier, and complete staging-gate integration.
- Verified English/Chinese audience and creator experiences, notification read persistence, followed-room state, and 390×844 layout without overflow or browser errors; reset demo data afterward.
- No email, SMS, browser push, tracking, external notification service, payment, Cloudflare, deployment, or production infrastructure change was introduced.

## 2026-08-27 - Creator application and administrator provisioning

- Added a bilingual audience creator-program flow with application status, withdrawal, rejection feedback, and revised submissions.
- Added an administrator pending queue with required reasoned approve/reject decisions and role-protected access.
- Made approval transactional and idempotent: one creator profile, one truthful offline room, role change, applicant notification, audit event, and complete applicant-session revocation occur together.
- Added migration `015_creator_applications.sql`, schema coverage, focused end-to-end verification, and inclusion in the complete staging gate.
- Verified English/Chinese desktop views and 390×844 audience/admin layouts without horizontal overflow or browser console errors, then removed the temporary account and reset demo data.
- No identity evidence, KYC, contracts, tax/payout data, Cloudflare resource, payment, deployment, or public infrastructure change was introduced.

## 2026-08-27 - Account lifecycle foundation

- Added bilingual account profile editing for display name and interface locale while keeping handles immutable.
- Added privacy-safe active-session inventory, individual and all-other-session revocation, coarse device labels, and bounded security-event records without IP addresses or raw user-agent storage.
- Added current-password-verified password changes with strong-password enforcement, reuse rejection, password-material rotation, full prior-session revocation, and one fresh current session.
- Added an explicitly inactive account-recovery experience and a separate design covering verified email, enumeration resistance, hashed single-use tokens, rate limits, privacy, and activation gates.
- Added migration `014_account_lifecycle.sql`, schema coverage, a focused lifecycle verifier, and inclusion in the complete staging gate.
- Verified English/Chinese desktop behavior and a 390×844 mobile layout with no horizontal overflow; reset synthetic demo data afterward.
- No email address, external identity provider, recovery delivery, personal information, public deployment, or production account change was introduced.

## 2026-08-27 - Realtime gifts public deployment

- Deployed reviewed implementation commit `730b7a2` to the isolated Linux Stream project with a fast-forward-only Git update.
- Created and verified project-local PostgreSQL and source rollback artifacts before the update; applied migration `013_realtime_gift_catalog.sql` and reset only the predefined synthetic demo records.
- Rebuilt and recreated only the Stream API and web containers. PostgreSQL, Redis, Cloudflare Tunnel, the Linux VM, and unrelated Odoo services were not recreated or restarted.
- Verified public HTTPS 200, Cloudflare routing, the new production asset hashes, eight ordered gift prices and symbols, healthy Stream services, zero restart counts, unchanged Odoo container identities, and exact deployed source.
- No broadcast was started and no Cloudflare, DNS, payment, cashout, identity, KYC, or compliance configuration changed.

## 2026-08-27 - Realtime video interaction and fixed test-gift system

- Added an ordered bilingual gift catalog at 1, 5, 10, 20, 50, 100, 1,000, and 10,000 test tokens, each with an original symbol and bounded animation tier.
- Added selectable quantities, visible totals, a clearly non-monetary `1 test token = ¥1 reference value` label, balance-aware sending, and explicit confirmation for totals of 1,000 test tokens or more.
- Hardened gift transfers with server-calculated totals, quantity bounds, idempotency locking, paired sender/creator test-ledger entries, creator-only denial, and privacy-safe room-scoped realtime events.
- Added transient comments and animated gift events over the audience video and creator preview, with hide/show control, bilingual labels, reduced-motion handling, and responsive mobile behavior.
- Completed three improvement reviews covering UX/visual consistency, ledger/realtime safety, and accessibility/mobile behavior. The complete Cloudflare-free staging gate passed and demo data was reset.
- No real currency, purchase, cashout, payment provider, Cloudflare change, public deployment, or production data change occurred.

## 2026-08-26 - Audience and creator UX public deployment

- Published implementation commit `4f83934` to GitHub `main` and fast-forwarded the isolated Linux checkout in `/home/shawn/projects/stream/launch-candidate` to that exact source.
- Created owner-only source and web-image rollback records inside the existing Stream backup directory before the update.
- Rebuilt and recreated only `stream-launch-candidate-web-1`. API, PostgreSQL, Redis, Cloudflare Tunnel, the Linux VM, and unrelated applications were not recreated or restarted.
- Verified the web/API health endpoints, database and Redis readiness, zero restart counts, public HTTPS 200 response, Cloudflare routing, new production asset hashes, and signed-out browser rendering without horizontal overflow.
- No camera, microphone, broadcast, Cloudflare configuration, payment, identity, or database change occurred during this deployment.

## 2026-08-26 - Creator navigation and live-control consolidation

- Replaced the remaining long creator dashboard with persistent Live, Earnings, Actions, Private Show, Profile, and Settings workspaces; only one focused operating surface is shown at a time.
- Kept browser camera permission, private preview, Go Live/End Broadcast, truthful lifecycle, current goal, realtime chat/support/audience activity, and session metrics in the primary Live workflow.
- Moved goal/action editing, test earnings summaries, private-show configuration, public profile editing, moderation, lifecycle refresh, OBS help, and local-state tools into dedicated sections without changing existing APIs or media behavior.
- Moved signed-in language controls into the account header, corrected mobile header and Quick Go Live clipping, hid the horizontal navigation scrollbar while preserving touch/keyboard scrolling, and verified no page-level overflow at 390×844.
- Passed the complete Cloudflare-free staging gate, all-section English/Chinese browser checks, and audience/admin regressions. Demo data was reset and the reviewed UI was subsequently deployed without a broadcast or Cloudflare change.

## 2026-08-26 - Audience discovery and video-first room shell

- Reworked the signed-in audience experience into an original streaming-product shell with persistent product navigation, a clearer live-discovery heading, richer visual room cards, search/category controls, and compact activity access.
- Reorganized the audience room around a desktop video/chat split, followed by goal, support actions, gifts, recent support, profile, wallet, and private-show details. Offline and unavailable states remain truthful.
- Moved the English/Chinese control into the audience account header, corrected legacy room-card and creator-header collisions, and made room entry/back navigation return to the top of the page.
- Passed the complete Cloudflare-free staging gate plus desktop and 390×844 browser smoke tests. The responsive layouts have no horizontal overflow and the audience chrome was checked in English and Chinese.
- The reviewed audience shell was subsequently published and deployed together with the creator navigation milestone without starting a broadcast or changing Cloudflare.

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
