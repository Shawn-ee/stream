# Local Runbook

## Room classification verification

After applying migrations 027 through 029, run `npm run db:seed`, `npm run verify:room-classification`, and `npm run verify:staging`. Inspect `legacy_category_migration_report` before any future compatibility-column removal. Confirm every room has one primary language at display order zero and no more than three total languages. Confirm `/api/discovery/categories` and Community tag requests return their documented retirement responses, while `/api/discovery/languages` plus public `/api/discovery/tags` remain healthy. Never repair missing language data by inferring from a creator's name, avatar, location, or identity.

## Creator documents and review

Production must set `IDENTITY_DOCUMENT_STORAGE_PATH` to a private persistent directory and `IDENTITY_DOCUMENT_ENCRYPTION_KEY` to a base64 32-byte key. Back up encrypted files separately from the key. Verify permission-denied cases, one-time view expiry, audit events, and immediate Studio denial after suspension. Never place document paths, URLs, numbers, or raw bytes in logs or tickets.

## Creator onboarding, side-effect, and draft-privacy verification

1. Start the local PostgreSQL/Redis services, apply migrations, and seed synthetic data.
2. Run `npm run verify:creator-onboarding`. This creates and removes one synthetic account. It must prove that read-only creator/status/Studio navigation creates no creator profile or room, that incomplete/suspended accounts receive 403, that activation is idempotent, and that a room appears only after explicit draft creation and publication.
3. Run `npm run verify:staging`. Do not deploy while any stage is red.
4. In a signed-in audience browser, open the avatar menu with mouse and keyboard, choose **Creator dashboard**, and verify Back/Forward, refresh, Resume later, and the routed Profile, Identity, Agreement, Review, and status pages.
5. Complete the mock flow using synthetic information only. Confirm activation opens Streamer Studio with no room and requests no camera or microphone access.
6. Select **Create stream**. Confirm the resulting draft is absent from discovery and all public room URLs return not found. Publish it explicitly, then confirm it becomes discoverable but remains offline.
7. At 390×844 confirm the step indicator, forms, account views, and Studio empty state have no horizontal overflow. Repeat key copy in English and Chinese.
8. Review `SELECT * FROM suspicious_audience_creator_resources ORDER BY room_created_at NULLS LAST, handle;`. This is a report only. Never delete listed records without a separately reviewed migration.
9. Run `npm run db:seed` after acceptance to remove transient test state.

Production must use `CREATOR_IDENTITY_PROVIDER=disabled` until a real provider is implemented. `mock` is rejected in production. Set `CREATOR_AUTO_APPROVAL=true` only as an explicit owner-controlled product decision; the safe production example leaves it false.

## Audience navigation and broadcast-access verification

Run `npm run db:seed`, `npm run verify:audience-first-entry`, `npm run verify:desktop-discovery`, `npm run verify:mobile-shell`, `npm run verify:broadcast-access`, and `npm run verify:staging`. Reseed after any focused API run.

Signed out, confirm the header contains HOLIWYN, discovery/search, and one **Log in** button. The modal may show only providers actually configured; the current local build uses the existing handle/password sign-in and registration modes because Google OAuth and verified email are not configured. Signed in, confirm the right side contains only **Go live** and avatar. Open the avatar menu with keyboard/mouse, verify every personal destination, then confirm Escape and outside click close it.

At 1440×900 confirm four cards fit across the recommendation row; at 820×1180 confirm two columns; at 390×844 confirm one card, one Filter control, a mobile account sheet, and no horizontal overflow. In open mode, `verify:broadcast-access` proves a new audience account cannot bypass CSRF, is provisioned atomically, retains its audience role, and only then reaches the protected streamer studio. To rehearse future gating, set `BROADCAST_ACCESS_MODE=approval_required` only in a separate local process and confirm unapproved activation returns 403. Do not use this runbook to start media, contact Cloudflare, deploy, create real accounts, or change production roles.

## Audience-first entry verification

Run `npm run db:seed`, `npm run verify:audience-first-entry`, `npm run verify:creator-applications`, and `npm run verify:staging`. In a signed-out desktop and mobile session, confirm discovery/viewing remains available, the sign-in modal contains only Sign in/Create account plus handle/password fields, and no Go Live, Create, creator application, Streamer, or Administrator shortcut is visible.

Sign in as `demo-audience`, acknowledge the local test gate, and confirm **Become a creator / 申请成为主播** appears. It must open Account & security at the existing application/status workflow; it must not expose broadcast controls or grant a streamer role. Sign out, use the approved synthetic `demo-streamer` credentials through the same neutral form, and confirm the server routes that account directly to broadcaster setup. Administrator queue/approval, transactional provisioning, session revocation, and re-login behavior are covered by `verify:creator-applications`. Reseed afterward. This check does not authorize submitting a real application, changing production roles, camera/microphone access, Cloudflare use, broadcast, deployment, or payment.

## P0 truth-and-safety acceptance

Docker Desktop was recovered on 2026-08-31 without a factory reset or volume deletion. The exact transient runtime directory containing only the malformed `dockerInference` reparse point was renamed to `C:\Users\hecto\AppData\Local\Docker\run.broken-20260831-restore`, and Docker recreated a clean `run` directory. If the same failure recurs, first stop only Docker Desktop/backend, verify the exact path and contents, and obtain owner approval before moving any Docker-owned runtime artifact. Never use this procedure on Docker data, image, container, or volume directories. With Docker healthy, run `docker compose up -d postgres redis`, then `npm run db:migrate`, `npm run db:seed`, `npm run verify:p0-truth-safety`, and `npm run verify:staging`.

For rendered acceptance, use separate audience, streamer, and administrator sessions. In audience discovery, confirm only a Cloudflare-sourced live room appears under **Live now**, offline/simulated rooms remain under **Creators to follow**, and follow/unfollow plus a lifecycle change update ordering without page refresh. Confirm synthetic cards/header say **SIMULATED**, Following does not rank them as real live, the room does not initialize playback, and social preview copy says **Creator room**, not **Live now**.

In the streamer health rows, a local source must say **Simulation status**, **No media published**, and **No audience media**. Only a Cloudflare source may say ingest is receiving or audience playback authorization is available.

As the streamer, start only a local synthetic/browser test. Choose sign out while active and confirm the room becomes offline before the session closes. Simulate a failed end request and confirm sign-out does not proceed. For production OBS, do not start media during this check; the endpoint must return `external_broadcast_still_live` when provider-confirmed OBS remains live, and the UI must instruct the creator to stop OBS first.

As administrator, select a non-admin account, enter a unique test reason, choose mute, inspect the confirmation, apply it, and verify the selected account—not a fixed demo account—changes state and receives an audit event. Reverse the action with a second reason. Run `npm run db:seed` afterward. This procedure does not authorize Cloudflare contact, camera/microphone use, deployment, public changes, or a soak test.

## Personalized discovery verification

Run `npm run db:migrate`, `npm run db:seed`, `npm run verify:personalized-discovery`, and `npm run verify:staging`. The focused verifier covers audience-only ownership, invalid/unknown preferences, deterministic ordering, followed/live priorities, bounded visit influence, response privacy, opt-out equivalence with anonymous discovery, reset, and cleanup.

For rendered acceptance, sign in as `demo-audience`, open **Account → Discovery preferences**, select 中文 and Music, and save. Confirm Jade Lin becomes the first recommendation without changing the temporary Discover language/tag URL filters. Switch the interface to 中文 and confirm the routed page, controls, and status are bilingual. Disable personalized ordering and save; compare creator order with a signed-out window. Select Reset and confirm defaults return. Run `npm run db:seed` afterward.

Do not use this procedure to create tracking data, contact external analytics, start media, spend R, configure Cloudflare, deploy, or conduct a soak test. A soak test is a separate bounded milestone with explicit duration, load, thresholds, monitoring, and cleanup.

## Live schedule reminder verification

Run `npm run db:migrate`, `npm run db:seed`, `npm run verify:schedule-reminders`, and `npm run verify:staging`. The focused verifier covers audience ownership, invalid input, follow-required behavior, default opt-in, opt-out cleanup, timezone-safe creator schedule changes, update and one-hour reminder deduplication, safe room links, and secret exclusion.

For rendered acceptance, sign in as the synthetic audience and follow Demo Streamer. Open Following and confirm the creator shows the next scheduled time plus **Reminder on**; switch it off and confirm **Remind me** and the Upcoming status update without reloading. Switch to 中文 and confirm the equivalent labels. Open Notifications and use **View room** only on a synthetic reminder; it must mark/read safely and navigate to the canonical room without spending R or sending chat.

To test due delivery, use the synthetic streamer to set a future `next_stream_at` within one hour in a valid timezone, then return to the audience session. The active audience app checks once per minute; confirm exactly one schedule-update notice and one due reminder appear even after repeated refreshes. Disable the reminder and confirm unread schedule notices for that creator are removed. Reseed afterward. This procedure does not authorize external notifications, camera/media, Cloudflare work, deployment, or public launch.

## Server-rendered social-preview verification

Run `npm run db:seed`, `npm run verify:social-previews`, and `npm run verify:staging`. The focused verifier checks canonical route validation, metadata escaping, owned-image allowlisting, cache and `Vary` headers, invalid-route 404 responses, crawler-only Nginx routing, and ordinary SPA fallback.

With the local API and web app running, open `/room/demo-streamer` in an ordinary browser and confirm the complete interactive Holiwyn room loads. Then open `/api/public/social-preview/room/demo-streamer` and `/api/public/social-preview/creator/demo-streamer` directly on the API origin; confirm each lightweight page has the correct route-specific title and an **Open on Holiwyn** link to its canonical URL. The local Vite server does not emulate crawler routing.

After an explicitly approved deployment, verify the production reverse proxy without sharing externally: request `/room/demo-streamer` once with an ordinary browser user agent and once with a supported preview-bot user agent such as `Twitterbot`. The ordinary response must be the SPA and the bot response must be escaped preview HTML with the canonical Holiwyn URL. Do not use this check to post links, configure Cloudflare, start media, or authorize public launch. Run `npm run db:seed` afterward.

## Audience sharing verification

Run `npm run verify:audience-sharing`, `npm run verify:web-bundle-budget`, and `npm run verify:staging`. The focused verifier covers room/profile canonical payloads, native Share cancellation/fallback policy, explicit clipboard support, bilingual controls, live browser metadata, static crawler fallback metadata, and staging-gate inclusion.

At desktop width, open `/room/demo-streamer`, expand More, select Copy link, and confirm the status says Link copied and the clipboard contains the exact same-origin `/room/demo-streamer` URL. Open the creator profile, repeat Copy link, and confirm `/creator/demo-streamer`. Inspect the document title, canonical link, `og:title`, and `og:url` after each navigation. Switch to 中文 and repeat the visible control/status check.

At 390×844, confirm Share is a reachable touch target in the room action rail and does not crowd Follow, Chat, or More. Select Share only to confirm the operating-system share sheet opens, then cancel without choosing a recipient; cancellation must not show an error or transmit anything. Confirm profile Share/Copy controls fit without horizontal overflow, then reset the viewport. Run `npm run db:seed` afterward. This procedure does not authorize sending a link to a third party, deployment, Cloudflare changes, or public launch.

The raw SPA HTML retains a generic Holiwyn fallback. Supported link-preview crawlers now receive the route-specific server-rendered HTML described above; unsupported or JavaScript-only crawlers may still use the generic fallback.

## Canonical audience-route verification

Run `npm run db:seed`, `npm run verify:canonical-audience-routing`, and `npm run verify:staging`. The focused verifier covers route parsing, canonical paths, public API hydration, History API restoration, safe invalid-route recovery, SPA fallback, and authentication-intent compatibility.

While signed out, open `/room/demo-streamer` directly and confirm the public room loads; refresh and confirm the URL and room persist. Open the creator profile and confirm the URL becomes `/creator/demo-streamer`; use browser Back and Forward to move between the two without losing context. Open `/room/not-a-real-creator`, confirm the bilingual not-found state, and use its recovery action to return to `/`. Repeat the room-card, Back, and refresh checks at 390×844 and confirm there is no horizontal overflow.

For authentication continuity, open the canonical demo room as a guest, click Follow, and sign in as the synthetic audience. Confirm the same room URL remains active, the authoritative follow state updates, and no chat, gift, action, private-access purchase, or report is submitted automatically. Reset the viewport and run `npm run db:seed` afterward. This check does not authorize deployment, Cloudflare media, or external sharing.

## Anonymous-to-account continuity verification

Run `npm run db:seed`, `npm run verify:auth-intent-continuity`, and `npm run verify:staging`. The focused verifier confirms typed intent policy, one-shot guards, safe Follow completion, navigation restoration, bilingual feedback, and the absence of gift/action/private-access submission from authentication-resume branches.

In a signed-out desktop browser, enter the demo room and click Follow. Sign in as the synthetic audience and confirm the same room remains open, Follow becomes Following, and the completion notice appears once. Sign out, type a disposable chat draft, click Send, and sign in; confirm the draft remains focused but is not posted. Sign out again, click Wallet, sign in, and confirm the Wallet section opens. At 390×844, sign out, select Following, sign in, and confirm Following remains selected with no horizontal overflow. Closing the authentication gate or signing out must discard any pending intent. Reset the viewport and run `npm run db:seed` afterward.

Do not click a final gift/action/private-access/report confirmation during this read-only acceptance pass. Authentication must never be treated as consent to spend R, send chat, or submit a report. This procedure does not authorize deployment, Cloudflare media, or external service changes.

## Public discovery and authentication-gate verification

Run `npm run db:seed`, `npm run verify:public-discovery`, and `npm run verify:staging`. The focused verifier confirms safe anonymous room/profile/chat/support/playback reads, absence of infrastructure/internal identity fields, protected wallet/follow/creator reads, 401 mutation gates, and read-only anonymous Socket.IO behavior.

In a browser with no active session, confirm Holiwyn opens directly to six synthetic creator cards rather than a login wall. At desktop width, open a creator and a public room; verify truthful lifecycle, profile, schedule, chat history, and presence remain visible. Click Following, Wallet, Go Live, Follow, Send, Gift, or Report and confirm the same bilingual sign-in/create-account modal appears without performing the interaction. At 390×844, confirm For You/Following/Live, language/category filters, creator cards, account access, and the authentication modal fit without horizontal overflow. Reset the viewport and run `npm run db:seed` afterward.

Do not use this procedure to start media, spend R, create persistent test accounts, access a private show, configure Cloudflare, or deploy. Public access is not a production moderation, abuse-prevention, rate-limit, privacy, or legal-launch approval.

## Audience feed polish and offline-room verification

Run `npm run db:seed`, `npm run verify:audience-feed-polish`, `npm run verify:gift-polish`, and `npm run verify:staging`. The feed verifier confirms at least six synthetic creator cards, English/中文 variety, deterministic ranking data, immersive mobile presentation hooks, and server rejection of offline gift/action spending. The live gift verifier temporarily marks only the demo room live and restores its prior lifecycle state.

For rendered acceptance, sign in as `demo-audience`. At desktop width confirm the creator rail/grid still render. At 390×844 confirm For You shows one large static-preview card per swipe with title, creator, language/category, schedule, and View creator/Watch live action; no card should be hidden behind bottom navigation and there must be no horizontal overflow. Enter an offline creator room and confirm Follow, profile/schedule, chat, and recommended creators remain available while Gift, Support/Actions, private access, and wallet activity are absent. Return to discovery, reset the viewport, and run `npm run db:seed`. This check never authorizes real R purchases, Cloudflare media, or deployment.

## Audience discovery and R wallet verification

Run `npm run db:migrate`, `npm run db:seed`, `npm run verify:audience-discovery-wallet`, and `npm run verify:staging`. The focused verifier confirms optional language filtering, invalid-language rejection, live audience presence, deterministic ranking fields, package validation, ledger credit, duplicate-safe order handling, authorization, and cleanup.

For rendered acceptance, sign in as the synthetic audience. At desktop width confirm room cards show language, live rooms show truthful watching counts, All languages is selected by default, and English/中文 filters work independently from category and search. Open Following and confirm only followed creators appear. Open Wallet, confirm the balance and package choices use only `R`, and do not place a test order during a read-only check. At 390×844 confirm For You/Following/Live remain usable, the two filters fit without horizontal overflow, cards snap vertically inside the feed, and tapping a card opens the existing room. Repeat key labels in Chinese, reset the viewport, and reseed afterward. R has no cash value; this procedure does not authorize payments, cashout, deployment, or Cloudflare usage.

## Follower management verification

Run `npm run db:migrate`, `npm run db:seed`, `npm run verify:follower-management`, and `npm run db:seed`. The focused verifier confirms audience-only mutation, creator-room ownership, safe response fields, bounded cursor pagination, duplicate-follow idempotency, public aggregate events, private viewer state events, and cleanup.

For rendered acceptance, sign in simultaneously as the synthetic audience and streamer. Open Creator menu → Followers and confirm the empty state. From the audience room, follow the demo streamer. Without reloading either page, confirm the audience Following feed contains the creator, discovery shows the updated count, and the creator list shows only display name, handle, follow date, and Following status. Unfollow and confirm both lists/counts return immediately. Repeat the creator list in English and Chinese at desktop and 390×844; confirm there is no page-level horizontal overflow. Reseed afterward.

## Streamer production-polish and moderation verification

Run `npm run check`, `npm run build`, `npm run verify:streamer-production-polish`, `npm run verify:avatar-gateway`, and the avatar/thumbnail storage tests. Start the local API/web plus localhost PostgreSQL and Redis, run `npm run verify:staging`, then reset demo data with `npm run db:seed`. The staging-operator verifier uses its digest-pinned Docker image when the daemon is healthy and otherwise uses the same read-only shell/mock checks through Ubuntu WSL on Windows.

Sign in as the synthetic streamer and remain offline. Confirm the entry page says **HOLIWYN** and **PRIVATE STAGING**. Before granting device permission, save a title, category, language, up to five comma-separated tags, and a non-sensitive JPEG/PNG/WebP thumbnail under 6 MB. Confirm the audience-card preview uses the thumbnail and discovery reflects it after save. In Profile, choose a non-sensitive avatar and move the horizontal/vertical focal controls before saving; reload and confirm both normalized media paths persist. Enable local camera preview only when device testing is explicitly intended.

For moderation testing, use a seeded/local audience to send disposable messages. From the creator chat, verify Delete removes only that message in realtime; Mute blocks until removed; Timeout blocks for ten minutes and then expires; Ban blocks until removed. Set slow mode and a disposable blocked term, verify the API rejects messages accordingly, then clear both settings. Confirm Settings lists only active restrictions. Reseed after mutation tests; the seed must leave the demo room offline with no thumbnail, zero slow mode, no blocked terms, and no active moderation restriction.

For a Cloudflare-free lifecycle check, use the Settings-only local broadcast-state fallback. When it reports `live`, confirm the header and moderation chat enter the live cockpit even though no local publisher is active; return it to `offline`, open Earnings, and inspect the completed session summary. During an owner-approved physical broadcast, confirm the three health rows never overstate one another: Device reflects local camera/microphone, Cloudflare ingest reflects publisher/provider lifecycle, and Audience playback becomes ready only with live playback authorization. End with confirmation and inspect the summary for duration, peak viewers, test support, supporters, chat messages, new followers, and top supporter. Starting camera/microphone or Cloudflare media still requires immediate owner approval; this runbook does not authorize deployment or spending.

## Unified creator menu and avatar verification

Run `npm run verify:streamer-navigation`, `npm run verify:creator-profile-ui`, `npm run verify:creator-avatar`, `npm run check`, and `npm run build`. The avatar API verifier requires the local API, PostgreSQL, and seeded demo data; it uploads only a generated synthetic image and removes it before exit.

At desktop and 390×844 mobile widths, sign in as the synthetic streamer and confirm the top-right avatar opens one contained menu for Return to live, Earnings, Top supporters, Actions/private show, Public profile, Settings, language, and Sign out. Confirm the former horizontal creator tab strip is absent, the menu fits the viewport, outside tap and Escape close it, and browser Back still returns to the mounted live surface.

In Public profile, use a non-sensitive test image in JPEG, PNG, or WebP format under 5 MB. Confirm the preview changes before upload, Save avatar persists it, and the same identity appears in the creator menu, discovery, Following, room creator identity, and public profile. Confirm Remove restores the initials fallback. Reset demo data after the test.

Production stores normalized avatar files in the Compose volume `avatar_production_data` mounted at `/app/work/avatars`. Include that volume with PostgreSQL in backup/restore and migration plans. Recreating the API container is safe; deleting the named volume is destructive and leaves database avatar URLs unresolved.

## Creator Center and wallet verification

Run `npm run verify:creator-wallet-ui`, `npm run verify:streamer-navigation`, `npm run check`, and `npm run build`. With Docker Desktop running, also run `npm run verify:expanded` and reset the demo seed afterward.

If Docker Desktop fails before the engine starts, inspect its host log before touching project state. On the 2026-08-29 workstation the failure was an inaccessible stale `dockerInference` runtime reparse point, not a Holiwyn service or migration failure. Do not reset Docker Desktop or delete images/volumes merely to run this milestone; repair Docker separately, then rerun the complete staging gate.

Sign in locally as the synthetic streamer without granting media permission. Open **Creator Center** and verify Live, Earnings, Supporters, Actions, Profile, and Settings. Confirm Back to Live and browser Back return to the still-mounted setup surface. In Earnings, check Session, 7 days, 30 days, and Lifetime plus All, Gifts, Actions, and Private filters; transaction rows must show supporter, support label, quantity where relevant, room, timestamp, and test-coin amount. In Supporters, check all-support and gift-only ranks for each period. A missing or old API must show **Data temporarily unavailable**, never zero or a valid-empty message.

Repeat at 390×844 and confirm no page-level horizontal overflow; reset the viewport afterward. Do not grant camera/microphone, start a Cloudflare stream, send gifts, save profile/settings, push, or deploy during a read-only smoke test.

## Desktop broadcaster presentation verification

Run `npm run verify:broadcaster-ui`, `npm run verify:streamer-navigation`, `npm run check`, and `npm run build`. At desktop width, confirm the camera fills the available stage column, controls follow immediately below it, and creator-side transient comments/gifts have no opaque card or full-overlay dimming. Confirm premium gifts remain readable through color, motion, symbol glow, and text shadow. Repeat at mobile width to ensure the existing viewport-filling live layout is unchanged.

The Vite development server uses `http://127.0.0.1:3001` by default. For an explicitly owner-approved UI-only review, `VITE_DEV_API_TARGET` may point the local frontend proxy at another origin. That mode is not isolated: login, chat, gifts, profile edits, and broadcasting affect the target environment. Do not use it for mutation testing unless those exact actions are approved.

## Streamer live-session navigation verification

Run `npm run verify:streamer-navigation`, `npm run verify:broadcaster-ui`, and `npm run verify:broadcast-resilience`. Without device permission, confirm Profile changes the URL to `#streamer-profile`, shows Back to Live, and browser Back restores the same preview/setup state. At mobile width, confirm Profile and Back remain reachable with no horizontal overflow.

During an owner-approved physical broadcast, open Profile and confirm the audience playback, publisher heartbeat, elapsed timer, viewer count, chat, and gifts continue without a second publish session. Return using the in-page action, repeat using browser Back, and confirm neither path emits ended/started lifecycle notifications. Finally attempt a real reload in a disposable test session and confirm the browser warns before leaving. This physical test requires immediate camera/microphone and Cloudflare approval; ordinary automated checks must not start it.

## Immersive mobile broadcast and interruption recovery verification

Run `npm run verify:broadcast-resilience`, `npm run verify:mobile-broadcast`, and `npm run verify:broadcaster-ui`. At 320×568, 390×844, and 430×932, confirm active broadcast video occupies the viewport, creator activity is limited to the upper-right area, controls return after tapping video and auto-hide after five seconds, End Stream remains confirmed, and no horizontal overflow exists.

On an owner-approved physical-device test, verify front → rear → front camera switching while live, local mirroring only on the front preview, uninterrupted audience playback after each track replacement, screen wake lock where supported, and graceful behavior when fullscreen is unavailable. Briefly background and restore the browser: a connected peer should continue; an interrupted peer should offer **Resume Live** without generating false ended/started follower notifications. Close the tab once and confirm viewers see **Creator reconnecting** through the remaining publisher lease plus the bounded 45-second recovery grace, then offline if the creator does not reopen and resume. Confirm the expired publisher database session records `heartbeat_expired` and no Cloudflare WebRTC resource remains.

The physical camera, microphone, and Cloudflare portion requires explicit owner confirmation immediately before each test. Automated/local verification must not begin a broadcast or consume Cloudflare quota.

## Frontend polish and performance verification

Run `npm run verify:frontend-polish` to verify stable session boot, debounced/race-safe discovery, explicit failure states, localized skeleton status, and deferred below-fold rendering. Run `npm run verify:web-bundle-budget` to create a production web build and enforce the asset budgets. In browser QA, rapidly type a multi-character creator query and confirm the API receives only the final query after the debounce window. Check 320×568, 390×844, 768×1024, and 1440×900 for zero horizontal overflow, correct mobile/desktop shell switching, and an empty warning/error console. Reset any temporary viewport override after testing.

## Responsive creator-profile verification

Run `npm run verify:creator-profile-ui` for the focused presentation/data-boundary gate. In a local audience session, open an offline featured creator with **View creator**, confirm the lifecycle label, biography, follower count, schedule/timezone, current-room action, and recommended creators in English and Chinese. Open the same profile from the room avatar/name and confirm navigation returns to the existing room. Do not click Follow during read-only smoke testing unless the test will reseed data afterward. The profile must not show invented cover media, verification, social links, clips, VODs, viewer counts, or an active player while offline.

## Verify the active test-only goal

Run `npm run verify:test-only-goal`. This confirms the four active phases, their focused staging coverage, the synthetic-coin boundary, and the absence of a commercial migration. Legal/compliance implementation and real payments are not active runbook work.

## Verify gift polish

Run `npm run verify:gift-polish` with the local API available. It sends a two-step same-gift chain, verifies combo counts and the ten-second window, replays an idempotency key, confirms zero-sum paired ledger entries, checks minimal realtime payloads, denies audience/non-owner acknowledgement, accepts one room-owner acknowledgement, rejects a repeated acknowledgement as duplicate, and removes its test records.

Browser acceptance should confirm the sound toggle begins off in audience and Creator Studio, the fixed premium gift is clearly distinguished, combo text appears in the creator support timeline, one-click Thank becomes a persisted acknowledgement, English/Chinese labels render, reduced-motion CSS exists, and 390×844 does not overflow. Reset demo data after interactive testing.

## Verify audience retention

Run `npm run verify:audience-retention` with the local API available. It covers role isolation, follow idempotency and unfollow, invalid creator handling, followed-feed ordering/data, structured schedule and timezone validation, live/end notification generation and deduplication, notification ownership, single/all read state, and no delivery after unfollow. It restores the synthetic audience/creator fixture when finished.

The browser check should confirm the English/Chinese followed feed, next-stream rendering, unread/read notification states, the creator schedule controls, followed-room unfollow state, and no horizontal overflow at 390×844. Run `npm run db:seed` after interactive acceptance.

## Prerequisites

Docker Desktop and Node.js 24 are installed. Copy `.env.example` to `.env` only when setting up a new machine; never commit `.env`.

## Start

```powershell
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run verify:local
npm run dev
```

Open `http://localhost:5173` and API health at `http://127.0.0.1:3001/health`.

## Verify the audience product shell locally

1. Sign in with the synthetic audience account and confirm the compact header exposes Browse live, My activity, English/Chinese, and account controls.
2. Confirm discovery shows truthful room-state badges, search/category controls, creator metadata, and original visual cards.
3. Enter the seeded room and confirm the page opens at the top. At desktop width, the media surface must be left of chat; goal/support, gifts, recent support, creator profile, wallet, and private-show details follow below.
4. At 390×844, verify discovery and the room become one readable column with no horizontal scrolling. Connecting, offline, and unavailable states must not display fake playback.
5. Switch between English and Chinese and confirm the audience navigation, lifecycle labels, controls, and empty states update. Seeded creator-written titles/profile text may remain test content.
6. Run `npm run verify:staging`, then reset synthetic data before release preparation. Browser review does not authorize a broadcast, Cloudflare change, Git push, or deployment.

Use `docs/Launch-Acceptance-Checklist.md` for the repeatable human browser pass across audience, creator, administrator, English/Chinese, truthful media states, and final demo reset. It records browser evidence separately from the automated gates below.

## Verify the mobile global shell locally

1. Run `npm run verify:mobile-shell`, then run the complete `npm run verify:staging` gate.
2. Sign in with the synthetic audience account, acknowledge the test gate, and verify the compact mobile header shows Search and Account actions.
3. At 320×568, 375×812, 390×844, 414×896, and 430×932, confirm the page has no horizontal scrolling and every bottom-navigation control is at least 44px high.
4. Select Home, Discover, Go Live, Inbox, and Me. Confirm Discover opens creator search and the live section, Go Live reaches the existing creator-program entry point, Inbox reaches existing audience activity, and Me opens account/session controls.
5. Enter the seeded room at 320px and 430px. Confirm the room remains within the viewport and the mobile navigation still provides an immediate path back to discovery.
6. Inspect only localhost application logs for new warnings/errors. Extension-origin messages are unrelated to Holiwyn. Reset demo data with `npm run db:seed` after browser acceptance.

This check does not authorize sending chat or gifts, changing follow/account state, requesting camera/microphone permission, beginning a broadcast, contacting Cloudflare, pushing Git, or deploying.

## Verify mobile discovery locally

1. Run `npm run verify:mobile-discovery`, then run `npm run verify:staging`.
2. Sign in with the synthetic audience account and acknowledge the clearly labeled local test gate.
3. At 320×568, 375×812, 390×844, 414×896, and 430×932, confirm the discovery feed is one column, has no horizontal scrolling, and every For You/Following/Live tab is at least 44px high.
4. Confirm each creator preview remains 16:9 and static. Discovery must not contain a video or iframe; only entering a room may initialize playback.
5. Select Following and Live. Confirm the selected tab and honest empty state appear when the seeded account follows nobody and no room is broadcasting. Return to For You and confirm both seeded creators appear.
6. Filter to Music, then search for Night. Confirm only the supported matching creator is shown. Clear both filters afterward.
7. Switch to Chinese and confirm the heading, tabs, category selector, empty states, and mobile navigation are localized. Return to the intended demo locale afterward.
8. At 1440×900, confirm mobile discovery is hidden and the existing featured creator, desktop rail, and desktop grid remain visible.
9. Inspect localhost application logs for new errors, reset any temporary viewport override, and finish with `npm run db:seed`.

This pass is read-only product QA. Do not follow, chat, gift, report, submit a creator application, access camera/microphone, start a broadcast, contact Cloudflare, push Git, or deploy.

## Verify the mobile live room locally

1. Run `npm run verify:mobile-room`, `npm run verify:desktop-room`, and then `npm run verify:staging`.
2. Sign in with the synthetic audience account, acknowledge the local test gate, and enter the seeded room without starting a broadcast.
3. At 320×568, 375×812, 390×844, 414×896, and 430×932, confirm the product header and bottom navigation are hidden, the media stage occupies roughly 68% of the viewport, controls remain at least 44px, and no horizontal scrolling exists.
4. Confirm the back control, truthful lifecycle state, creator identity, presence, follow/chat/gift labels, activity visibility control, and report overflow are visible over the media stage. Do not activate follow or report during read-only acceptance.
5. Open Live chat. Confirm it is a modal bottom sheet with a labeled close control, current connection/presence, message list, keyboard-safe input, and Send button. Close it without sending.
6. Open Gift. Confirm all eight synthetic gifts, test balance, one selected gift, quantity, total, and explicit Send button appear. Close it without sending or changing the wallet.
7. Confirm recommended-next creator cards appear after supporting room details and contain no video/iframe.
8. At 844×390 and 932×430, confirm the room is exactly one viewport high/wide, secondary sections are hidden, media is not stretched, and there is no page scrolling.
9. At 1440×900, confirm the mobile overlay/recommendations are hidden and the existing desktop creator bar, gift tray, and sticky chat remain visible.
10. Repeat labels in Chinese, inspect localhost logs for new warnings/errors, reset the viewport, and finish with `npm run db:seed`.

This browser pass does not authorize chat, gifting, following, reporting, private access, camera/microphone use, broadcast start, Cloudflare contact, Git push, or deployment.

## Verify mobile browser broadcasting locally

1. Run `npm run verify:mobile-broadcast`, then run the complete `npm run verify:staging` gate. These checks do not access a device or contact Cloudflare.
2. Sign in with the synthetic creator account, acknowledge the local test gate, and remain in the Live workspace.
3. At 320×568, 375×812, 390×844, 414×896, and 430×932, confirm the private-preview stage, Ready indicator, Step 1 permission explanation, and Allow camera and microphone button fit without horizontal scrolling. Do not press the permission button during read-only acceptance.
4. Confirm English/Chinese copy, a 44px-or-larger status/control surface, and the unchanged two-column Creator Studio at 1440×900.
5. Code-level verification must prove permission is requested only after a creator action, the bounded title is saved before publishing, active device switching uses track replacement, disconnected/failed states map to friendly health labels, and End live opens a confirmation before cleanup.
6. Reset any temporary browser viewport and run `npm run db:seed` after acceptance.

A physical phone test is separate. Immediately before it, the owner must explicitly approve camera/microphone permission and one short Cloudflare broadcast. Then test actual iOS Safari and Android Chrome as available: grant permission, verify preview, select devices/title, start, confirm audience audio/video on a second device, switch camera if the device exposes both, mute/unmute, rotate, background/foreground, end with confirmation, verify offline lifecycle, and reset demo data. Browser emulation is not evidence that physical-device capture works.

For the production-style private package, migration sequencing, readiness, backup/restore, upgrade, and rollback procedures, use `docs/Deployment-Runbook.md`.

The approved Linux staging operator begins with `sh deploy/verify-host-prerequisites.sh`. This is a read-only suitability check and is not authorization to deploy.

Run `npm run verify:production-compose` to reproduce the full local production-package build/start/readiness/private-metrics/gateway-boundary/shutdown smoke test. It uses a uniquely named disposable Docker project plus a temporary validator-approved environment with random secrets and Cloudflare disabled, then removes only those generated test containers/volumes and deletes the file.

Before creating the first Git baseline, run `npm run verify:release-preflight` and follow `docs/Release-Baseline-Checklist.md`. The preflight never stages, commits, tags, pushes, or deploys files.

For the protected metrics endpoint, initial 100-user alert thresholds, incident response order, structured-log verification, and local dependency-recovery drill, use `docs/Monitoring-Runbook.md`.

Run `npm run verify:supply-chain` for the offline lockfile/integrity/install-script/SBOM gate. Run `npm run verify:supply-chain:online` before a release when registry access is available; it performs the live production-dependency vulnerability audit and does not modify dependencies.

## Verify Cloudflare live playback

1. In Cloudflare Stream, open the existing local test Live Input and copy its RTMPS server URL and stream key into OBS. Keep the stream key private.
2. Start a short test broadcast from OBS.
3. Open `http://localhost:5173`, choose the **audience** demo role, acknowledge the clearly labeled test gate, select the live room, and confirm the embedded player starts.
4. Stop OBS when the test is complete. The local room will show a clear offline state if Stream is not broadcasting.

For synthetic testing, install FFmpeg on the local machine first. Do not place an RTMPS stream key in project files, command history, or source control.

## Owner-assisted camera and microphone broadcast test

This is the only test that uses Cloudflare Stream resources. Do not begin it until the owner explicitly confirms in chat immediately before OBS starts streaming.

1. The creator manually opens OBS and selects the intended camera and microphone sources.
2. The creator checks the OBS microphone meter and locally monitors audio; Codex does not inspect devices, permissions, OBS settings, or audio.
3. The creator manually starts a short private broadcast using the existing configured Cloudflare Live Input. Never paste the RTMPS URL or stream key into this repository, chat, or source code.
4. In Creator Studio, refresh the broadcast status. Codex verifies the lifecycle changes to `connecting` and then `live`.
5. In a local audience session, Codex verifies the authorized player appears. The creator confirms that video and audio are correct.
6. The creator manually stops OBS. Codex verifies the lifecycle returns to `offline` and the player is hidden.

This procedure does not authorize Cloudflare configuration changes, new Live Inputs, credential rotation, public deployment, recording deletion, or any real payment action.

## Owner-assisted Browser Quick Go Live test

This test uses the existing Cloudflare Stream input and requires fresh owner confirmation immediately before **Go Live** is selected. It does not require OBS and must not create or modify a Cloudflare resource.

1. Sign in as `demo-streamer` and open **Quick Go Live**.
2. Select **Enable camera and microphone**, approve the intended devices, verify the private preview, and confirm that the microphone meter moves. Permission alone does not broadcast.
3. Confirm camera-off, camera-on, mute, and unmute work in the private preview.
4. After the owner confirms, select **Go Live** once. Verify the creator state moves through connecting to provider-confirmed live; never treat the button click alone as live evidence.
5. In a separate signed-in audience browser or device, open the room and confirm WHEP video and audible sound. Verify chat, presence, one test gift, and goal progress remain functional.
6. Return to Creator Studio and select **End broadcast**. Verify browser media indicators turn off, the room returns offline, and the audience player closes.
7. Reset demo data with `npm run db:seed`. Inspect logs for only generic WebRTC errors; fixed publish/playback URLs, SDP, API tokens, and resource locations must be absent.

If WebRTC is unavailable, stop and use **Switch to professional OBS mode**. Do not silently mix browser WHIP publishing with HLS playback because Cloudflare currently requires WHIP/WHEP pairing.

The 2026-08-26 signed-WHEP repeat passed creator permission/private preview, WHIP ingest, provider live/offline lifecycle, server-signed creator and audience WHEP negotiation, real 640×480 playback with an advancing unmuted media clock, teardown, audience-ended behavior, and deterministic demo reset. The signing private JWK is Linux-only and must never be printed, copied to a browser, or committed. Every future physical broadcast still requires fresh immediate owner approval because it consumes Cloudflare Stream resources; audible quality must be confirmed by a human listener.

## Verify the minimal Broadcaster interface locally

1. Sign in as `demo-streamer`. Confirm the primary screen contains only the Holiwyn broadcast header, camera preview, title, essential camera/microphone controls, compact health, and live chat. At desktop width after permission, the preview and compact setup rail must fit in one ordinary laptop viewport without scrolling to reach **Go Live**. Earnings, analytics, goals, schedules, and operational dashboards must not appear in the broadcast workflow.
2. Before permission, confirm the camera/microphone explanation is clear. After explicit owner approval, allow devices and verify the private preview, title field, camera and microphone selectors, microphone level, and camera/microphone toggles.
3. At desktop width, verify video occupies roughly 70–75% and chat 25–30%. Chat must scroll independently, keep its input at the bottom, count unique audience identities, and show incoming gifts as highlighted events rather than a gift-purchase panel.
4. At 390×844, verify the setup view is camera-first. During a locally simulated live state, verify full-height video, live duration/viewer overlay, transient chat/gift activity, large Mute/Camera-or-Flip/Chat controls, and the chat bottom sheet.
5. At short landscape mobile size, verify video fills the viewport and chat remains hidden until explicitly requested.
6. Select End Stream and verify the confirmation appears before any termination. After confirmation, verify local media tracks stop and the simple duration/peak-viewer summary appears.
7. Run `npm run verify:broadcaster-ui`, `npm run verify:mobile-broadcast`, and `npm run verify:staging`, then reset demo data. This local workflow does not authorize a camera/microphone permission, encoder, Cloudflare usage, Linux deployment, or public release without explicit owner approval.
8. Open **Profile** without starting media. Confirm the viewer preview and all public fields appear in one compact responsive editor, timezone uses a supported selection, and only one **Save all public details** action is presented. Do not submit during a read-only smoke test.
9. Open **Earnings** and confirm the broadcast surface remains mounted, Back to Live returns without republishing, test balance equals the existing wallet ledger, gift/action totals are labeled as test coins, recent income excludes outgoing entries, and the gift ranking is ordered by cumulative gift value. Send no gift during a read-only check. The End Stream control must be solid red and must still require confirmation.

## Activate the approved public Stream input

The public deployment must start with `CLOUDFLARE_STREAM_ENABLED=false`. Before activation, rotate any token that has appeared in chat or logs and create a least-privilege account token limited to Cloudflare Stream Write for the approved account. Reuse the existing approved Live Input; do not create another one for this milestone.

Store the account ID, replacement token, customer subdomain, and existing Live Input ID only in the ignored owner-readable Linux `.env.production` file. Set `CLOUDFLARE_STREAM_ENABLED=true`, keep the file mode `600`, and run the production environment validator. Never print the values during inspection or handoff.

Back up PostgreSQL before resetting the disposable demo data. Run the seed once so the configured existing Live Input is assigned to `demo-streamer`, then rebuild/recreate only the Stream API and web services. Do not stop the Tunnel, PostgreSQL, Redis, Windows host, VM, Odoo, or any unrelated Compose project. Verify `/healthz`, `/ready`, streamer status refresh, offline audience behavior, and sanitized playback failure before starting an encoder.

After activation, the API automatically reconciles assigned Live Inputs every 15 seconds. Manual refresh remains a safe creator troubleshooting action, but normal audience state changes must occur without it. If the API is later scaled beyond one process, implement a single polling leader or distributed lock before enabling Stream on multiple API replicas.

During the owner-approved physical test, use OBS when available. The existing FFmpeg verifier is an equivalent bounded encoder test, automatically stops, checks both audio and video tracks through signed playback, and verifies offline recovery. A human on a second device/network must still confirm picture and sound quality before the milestone is complete.

The owner-approved 2026-08-26 public test used the already installed FFmpeg encoder because OBS was absent. It proved physical camera/microphone RTMPS ingest, automatic current-state lifecycle, signed playback authorization, Cloudflare audio/video tracks, Linux-side audience HLS access through `holiwyn.online`, and offline recovery. See `docs/Camera-Audio-Test-Report.md`. Every future execution still requires fresh immediate owner approval and a one-execution flag:

```powershell
$env:OWNER_APPROVED_CAMERA_TEST='yes'
npm run verify:camera-live
Remove-Item Env:OWNER_APPROVED_CAMERA_TEST
```

The synthetic external-broadcast verifier similarly requires `OWNER_APPROVED_CLOUDFLARE_BROADCAST=yes`. Neither command belongs in an automated or default gate.

## Verify Cloudflare credential

```powershell
npm run verify:cloudflare
```

## Verify local broadcast lifecycle

```powershell
npm run verify:lifecycle
```

This changes only disposable local demo-room state. It does not call Cloudflare. In Creator Studio, use **Refresh Cloudflare status** only when you explicitly want a read-only check of the existing configured Live Input.

## Verify the complete local test workflow

```powershell
npm run verify:expanded
```

This resets and uses only the named demo records, then verifies audience, streamer, and admin workflows. It remains entirely test-only.

## Run the staging verification gate

```powershell
npm run verify:staging
```

This local-only gate applies pending migrations, resets demo data, checks types and schema, confirms local services, and verifies realtime plus expanded application workflows. It deliberately does not contact Cloudflare or change any external configuration.

## Verify the responsive frontend foundation

```powershell
npm run verify:frontend-foundation
```

This static regression check covers semantic color tokens, the 480/768/1024/1440 mobile-first breakpoints, minimum touch controls, phone safe-area handling, keyboard focus and reduced-motion rules, accessible modal/bottom-sheet primitives, and discovery loading/empty states. It is included in `npm run verify:staging` and does not contact Cloudflare.

Rendered acceptance still requires a permitted browser surface at the target desktop, tablet, and phone widths. A browser-policy block is not evidence of visual acceptance and must be recorded as a limitation rather than bypassed.

## Verify desktop discovery structure

```powershell
npm run verify:desktop-discovery
```

This checks the Holiwyn audience header, creator-first search, collapsible recommendation/following rail, featured surface, reusable live cards, loading/empty states, responsive desktop/tablet/mobile rules, focus semantics, and the rule that unavailable viewer counts must not be fabricated. It is included in `npm run verify:staging`.

## Verify desktop live-room structure

```powershell
npm run verify:desktop-room
```

This checks the video-first two-column room, bounded sticky chat, compact creator/follow/gift controls, explicit report overflow, labeled realtime chat input, tablet stacking, 16:9 player sizing, and continued integration of both WHEP and iframe/HLS playback. The presentational room components are also checked for absence of duplicated API or Socket.IO logic. It is included in `npm run verify:staging`.

The 2026-08-27 Windows Chrome acceptance pass covered 1707×791, 1024×768, 390×844, and 320×568. Confirmed evidence: 16:9 player geometry, bounded desktop chat, one-column mobile fallback, discovery and room containment at 320px, and no application-origin console errors. Chrome-extension warnings are not Holiwyn errors and should be distinguished by their `chrome-extension://` source.

## Verify scale-out and 100-user capacity

```powershell
npm run verify:realtime:cluster
npm run db:seed
npm run verify:load:100
npm run db:seed
```

The cluster verifier starts one temporary second API process and proves Redis-coordinated presence and chat. The load verifier grows gradually to 100 synthetic active viewers, checks latency/resource thresholds, validates offline playback authorization without Cloudflare, and races one idempotent test purchase. See `docs/100-User-Load-Report.md` for measured evidence and limitations.

For release evidence against the exact digest-locked production containers, run `npm run verify:load:production:100`. It builds and starts only the localhost-bound production-style stack, seeds disposable synthetic accounts inside it, runs the same 100-user workload through the gateway, resets demo data, and shuts the stack down without deleting its named volumes.

## Verify operational resilience

```powershell
npm run verify:security
npm run verify:logs
npm run verify:resilience
```

The resilience command briefly stops and restarts the local PostgreSQL and Redis containers without deleting volumes. Run it only against the disposable local development Compose stack, never against a production database.

## Stop local services

```powershell
docker compose down
```

This does not delete data. Do not run a volume-removal command unless deliberately resetting disposable local data.

## Reset test-only demo records

```powershell
npm run db:seed
```

This removes only the predefined local demo accounts' room interactions and restores the Demo Audience's 20,000 test coins. It does not create a real balance or payment record.

## Verify creator actions and goal progress

`npm run verify:expanded` now covers creator action management, an idempotent audience action purchase, paired `room_action` test-ledger entries, and goal progress in addition to the existing local workflows. Run `npm run db:seed` after any manual browser purchase to restore the exact demo baseline.

## Verify creator session insights

Creator session insights and the public support feed are covered by `npm run verify:expanded`; realtime support activity is covered by `npm run verify:realtime`. Both commands remain local-only and use only the test ledger.

## Verify realtime video comments and test gifts

1. Run `npm run verify:expanded` to verify the eight fixed gift prices, high-value confirmation requirement, audience-only authorization, exactly-once deduction, equal creator credit, goal progress, and final demo reset.
2. Run `npm run verify:realtime` to verify room-scoped comment and gift events, gift symbol/quantity/tier data, and absence of private ledger or idempotency data.
3. In an audience room, select a gift and quantity and confirm the visible total before sending. Use only synthetic local accounts and test coins.
4. Open Creator Studio and the audience room in separate local sessions. Confirm new comments temporarily flow over both video surfaces and a gift event appears on both without exposing wallet balances.
5. Check the hide/show activity control, English/Chinese labels, reduced-motion behavior, and a 390×844 viewport with no horizontal page overflow.
6. Run `npm run db:seed` after manual checks. The baseline Demo Audience balance is 20,000 test coins.

Test tokens have no cash or yuan equivalence in the product UI. This workflow does not authorize payment, deposit, withdrawal, payout, Cloudflare usage, or deployment.

## Verify individual audience registration

```powershell
npm run verify:registration
```

This creates one uniquely named temporary audience account, verifies validation, password hashing, session/CSRF behavior, identity isolation, role denial, zero test-coin balance, logout, and case-insensitive login, then deletes only that temporary account. It does not send email, contact an identity provider, or retain personal data. The command is included in `npm run verify:staging`.

## Verify account lifecycle

```powershell
npm run verify:account-lifecycle
```

This creates one temporary audience account, opens three coarse-labeled sessions, verifies CSRF and profile updates, revokes one device and all remaining non-current devices, changes the password, proves every previous session and password are invalid, checks security-event records, and deletes the temporary account. It does not send email, use an external identity provider, or retain personal information.

The recovery flow is not executable. Its prerequisites and fail-closed design are documented in `docs/Account-Recovery-Design.md`.
# Creator application and approval verification

Run `npm run verify:creator-applications` while the local API is available. The verifier creates a temporary audience account, proves CSRF and role isolation, covers rejection and resubmission, approves the revised application, verifies all old applicant sessions are revoked, signs in with the new creator role, checks the profile and truthful offline/no-Cloudflare room, validates audit events and notifications, attempts a duplicate decision, and deletes the temporary account.

The complete gate runs this automatically through `npm run verify:staging`. Browser acceptance should confirm English/Chinese audience application states, the administrator pending-review card, and a 390-pixel layout without horizontal overflow. Use only temporary accounts and reset demo data afterward.

## Archived planning checks — not part of the active goal

```powershell
npm run verify:policy-plans
npm run verify:commercial-design
npm run verify:six-phase-audit
```

These optional static checks preserve historical document integrity only. They are not included in `npm run verify:staging`, are not active milestones, and must not be used to start legal or payment work.

Do not create a Stripe or alternate-processor resource, webhook, product, price, connected account, KYC record, checkout, real token, bank record, or payout from this runbook. Reintroducing that work requires a separate newly scoped owner request.
## Audience homepage responsive smoke test

After frontend discovery changes, verify both a guest and `demo-audience` at 1440×900 and 390×844. Confirm there is no permanent desktop sidebar or horizontal overflow; the guest header shows Sign in and Create account; the signed-in avatar menu closes on Escape and exposes Following/account/settings/creator application/sign out; the Following row remains visible when empty; and the mobile Filter button reveals category and language controls without hiding the active feed.
# Audience information-architecture verification

Run `npm run verify:audience-ia-cleanup` with the local API, PostgreSQL, and Redis available. It verifies canonical account/navigation source contracts, Community retirement, zero mutation from read-only navigation endpoints, empty offline chat history, and server refusal of an audience realtime join to an offline room. Then test `/discover`, `/account/following`, `/account/activity`, `/account/notifications`, and `/account/preferences` at desktop and 390×844. Confirm Enter in the shared search field navigates to `/discover?q=...` from an account or room route.
