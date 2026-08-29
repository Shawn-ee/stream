# Local Runbook

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

Do not interpret the displayed yuan reference as a real exchange promise. This workflow does not authorize payment, deposit, withdrawal, payout, Cloudflare usage, or deployment.

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
