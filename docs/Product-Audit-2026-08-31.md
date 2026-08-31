# Holiwyn Full Product Audit

Date: 2026-08-31
Environment: reset local private-staging data, local browser, Cloudflare-free
Scope: audience, streamer, administrator, responsive layouts, realtime/product infrastructure, and readiness for soak testing

## Executive assessment

Holiwyn is a substantial private-staging streaming product, not an empty prototype. It has the core audience, creator, realtime, test-wallet, moderation, and media-control paths expected from a simpler creator-first live platform. The codebase currently exposes 79 API routes and a broad automated staging gate.

It is not production-ready yet. The strongest parts are the video-first audience room, focused browser broadcaster, gift/action ledger boundaries, account/session security, and role authorization. The weakest parts are the administrator experience, discovery truth when nobody is live, consistency after realtime state changes, test-versus-production lifecycle clarity, and the absence of sustained runtime evidence.

Recommended classification: **functional private-staging launch candidate; not yet a public production candidate**.

## Audit method and evidence

- Started from migrated and reset synthetic data.
- Inspected the current API and UI inventory.
- Exercised public guest discovery, creator profile, offline room, and authentication gates.
- Exercised audience account/session management, R wallet, follow state, Following feed, reminders, recent visits, Upcoming, creator application, live-room gift/action entry points, chat, and profile navigation.
- Exercised streamer pre-live setup, creator menu, Earnings, Top supporters, Followers, Actions/goal, private-show settings, public-profile editing, settings, OBS guidance, layered broadcast health, local live state, live chat, and protected sign-out.
- Exercised administrator applications, local users, broadcast state, reports, test transactions, and moderation controls in English and Chinese.
- Visually inspected desktop discovery, live room, and administrator layouts.
- Used the already-passing complete local staging gate as regression evidence: 26 API/schema/media tests; desktop/mobile layout gates; account/auth; discovery; sharing; followers/reminders; gift/realtime; two-process Redis; lifecycle; security; bundle budgets; and expanded workflows.
- Did not request camera/microphone permission, contact Cloudflare, start real media, deploy, spend real money, or change external systems.

## Implemented functional inventory

### Audience

| Capability | Current state | Assessment |
|---|---|---|
| Public discovery | Guest browsing, search, category/language filters, featured card, creator rail, responsive cards | Functional; live/offline information hierarchy needs correction |
| Personalized discovery | Saved languages/categories, live/follow priorities, bounded recent-visit signal, opt-out/reset | Functional and privacy-bounded |
| Creator profiles | Canonical URLs, avatar, bio, category, schedule, follow, share/copy, current room, recommendations | Strong MVP; no cover, clips, social links, or history/VOD |
| Live rooms | Truthful lifecycle states, desktop video/chat split, mobile immersive layout, signed playback paths, recommendations | Strong structure; lifecycle inconsistencies still possible in local fallback |
| Chat and presence | Public read, authenticated send, presence, creator messages, moderation hooks, realtime updates | Functional; needs a longer reliability test |
| Following and retention | Follow/unfollow, Following feed, realtime counts, reminders, Upcoming, notifications, recent visits | Functional; discovery does not immediately re-rank after Follow |
| Gifts and actions | R balance, catalog, explicit confirmation, quantity, combos, premium animation, action purchases, realtime support feed | Strong test implementation; visual placement can be more immediate |
| Private show | Ticket/per-minute configuration and audience access ledger | Functional test path; setup UI is more technical than necessary |
| Wallet | R balance, simulated packages, idempotent orders, recent activity | Functional test wallet; not a commercial wallet |
| Account lifecycle | Profile/locale, password rotation, session inventory/revocation, inactive recovery design | Strong staging foundation |
| Creator application | Audience submission/withdrawal and administrator reasoned decision/provisioning | Functional |
| Sharing | Canonical links, Web Share/clipboard, crawler previews | Functional |

### Streamer

| Capability | Current state | Assessment |
|---|---|---|
| Quick Go Live | Camera/mic permission, preview, title/category/language/tags/thumbnail, WHIP publish, mute/camera/flip/end | Core path implemented; needs repeat physical-device endurance evidence |
| OBS mode | Existing Live Input guidance, safe status refresh, no exposed secrets | Functional fallback |
| Broadcast truth | Device, ingest, and audience-playback health shown separately | Good design; local lifecycle cleanup has an inconsistency |
| Live operating view | Large preview, chat, viewer count, gift events, essential controls, safe end/sign-out | Strong and appropriately minimal |
| Mobile broadcaster | Immersive viewport, overlay activity, chat sheet, camera flip, wake lock, recovery grace | Implemented; device/browser matrix remains incomplete |
| Earnings | Period totals, gift/action/private breakdown, paginated transactions | Functional test-income view |
| Supporters | Session/7/30/lifetime and gifts/all-support ranking | Functional; empty-state quality is good |
| Followers | Count, public identity fields, follow date/status, realtime refresh | Functional; page has duplicated heading/hierarchy |
| Actions and goal | CRUD-like action editing, activation, reordering, goal/progress | Functional; dense form treatment can be simplified |
| Private show | Ticket/per-minute settings and current state | Functional; irrelevant price field remains visible for the selected mode |
| Profile | Avatar upload/crop, room title, category, bio, schedule/timezone, thumbnail | Functional; still visually utilitarian |
| Moderation | Delete, mute, timeout, ban, slow mode, blocked terms, audit | Implemented, but discoverability and live-session ergonomics need review |
| Post-stream summary | Duration, audience/support/session totals | Implemented, but not yet endurance-tested |

### Administrator and operations

| Capability | Current state | Assessment |
|---|---|---|
| Creator review | Pending queue, reasoned approve/reject, provisioning | Functional |
| User moderation | Mute/unmute/ban/unban API and audit | Server works; UI is hard-coded to Demo Audience and is not production-usable |
| Reports | Open report list, reviewed/dismissed actions | Functional but visually primitive |
| Broadcast health | Room state and last check | Functional list; lacks filtering, warning hierarchy, and detail view |
| Test transactions | Gift/private/action ledger visibility | Functional list; lacks search/filter/detail |
| Operational security | Protected metrics, log redaction, environment validation, digest locks, backup/restore and deployment checks | Strong engineering groundwork |
| Load readiness | Existing 100-user load scripts | Scripts exist; a controlled sustained soak has not yet produced evidence |

## Layout and UX assessment

### Audience desktop

What is good:

- Immediately recognizable as a streaming site.
- Clear header, search, creator rail, featured creator, visual cards, and video-first room.
- Desktop room gives the video most of the width and keeps chat visible.
- Creator identity, Follow, Gift, Share, and profile routes are easy to find.
- Empty/offline room states preserve discovery and schedule information.

What needs improvement:

1. **“Live now” is false when every room is offline.** Offline creators should move under Recommended/Upcoming; an empty Live now state should be explicit.
2. The featured hero can feature an offline creator without making “recommended, not live” prominent enough.
3. After following a creator, counts and Following update, but the already-rendered For You ordering does not immediately refresh.
4. The Account surface combines profile, password, sessions, wallet, and recovery in one dense view. Wallet and security deserve separate destinations.
5. Desktop gifting is lower in the page hierarchy than the Gift CTA suggests. A modal/side sheet would preserve video context better.
6. Search is a filter field, not a modern creator autocomplete with live/offline results.
7. Six synthetic creators are enough for testing but not enough to judge discovery density, pagination, or feed performance.

### Audience mobile

What is good:

- Dedicated bottom navigation and content-first feed rather than a shrunken desktop page.
- One-card-per-swipe static-preview structure avoids initializing many players.
- Immersive room layout, chat/gift sheets, safe areas, large touch targets, and landscape rules are implemented.
- Prior physical screenshots show the product behaving like a mobile streaming interface.

What needs improvement:

1. The feed is still card/snapshot navigation, not a true TikTok-style current-stream player with bounded previous/current/next playback.
2. Inbox is primarily notification-oriented; it is not a mature messaging/inbox product.
3. Physical acceptance is incomplete across iPhone Safari, iPhone Chrome, Android Chrome, and Samsung Internet.
4. Rotation, background/foreground recovery, weak-network recovery, keyboard/chat-sheet behavior, and long sessions need sustained device testing.
5. Mobile discovery needs a clearer distinction between live swipe content and offline profile recommendations.

### Streamer desktop

What is good:

- The current broadcaster is focused: preview, metadata, device permission, health, chat, and go-live controls.
- Creator operations are contained behind the avatar menu rather than cluttering the broadcast view.
- Earnings, supporters, followers, actions, profile, and settings are logically separated.
- Active-session sign-out is protected by a confirmation that explains the stream will end.

What needs improvement:

1. **Local End stream/sign-out can leave the room reported live.** Production polling may later correct this, but local/staging truth must be deterministic.
2. When the local fallback says live without an active publisher, the header and ingest/playback health claim Live while the preview still says “Ready to set up.” This is useful for tests but confusing to humans.
3. Followers contains duplicated heading/hierarchy.
4. Actions/goal is form-heavy; inline autosave or a smaller action editor would feel more professional.
5. Private-show setup shows both ticket and per-minute prices even when only one mode is selected.
6. Settings mixes moderation, health, OBS guidance, and local developer controls. Production and local-only tools need stronger separation.
7. Moderation tools need faster in-live discoverability and clearer confirmation/undo behavior.

### Streamer mobile

What is good:

- Full-viewport camera-first design, overlay status, minimal controls, chat overlay/sheet, and compact end control match the intended broadcaster workflow.
- Navigation protection and publisher persistence were specifically designed around accidental route changes.

What needs improvement:

1. Prove repeated front/rear camera switching on several real devices.
2. Prove that a 30–60 minute broadcast does not accumulate memory, heat, audio drift, or reconnection failures.
3. Improve weak-network feedback and automatic retry progression.
4. Verify that browser back, tab switching, screen lock, calls/interruptions, and permission revocation always resolve to a truthful room state.
5. Add a clear reconnect/resume timer and recovery action when the browser cannot resume automatically.

### Administrator

What is good:

- The necessary datasets and mutations exist.
- Creator application decisions require a reason.
- Broadcast, report, transaction, account, and audit information are available.

What needs improvement:

1. **The moderation UI is hard-coded to Demo Audience.** Four global mute/unmute/ban/unban buttons cannot be used safely for arbitrary users.
2. The administrator page has an oversized marketing-style Holiwyn header and a long single-column test console rather than an operator workspace.
3. User rows have no select/detail/action menu, search, filtering, pagination, confirmation, reason entry, or current restriction details.
4. Reports and transactions are raw paragraphs rather than scannable tables/cards with filters and detail drawers.
5. Broadcast health has no warning prioritization, last-error reason, filter, or room drill-down.
6. Chinese localization is incomplete: moderation verbs, roles, statuses, and dates remain English.
7. No explicit destructive-action confirmation is visible for admin moderation.
8. Metrics exist behind protected APIs but are not summarized into an operator health surface.

## Priority improvement plan

### P0 — Truth and safe operation

1. Make End stream authoritative across browser publisher, OBS/local fallback, realtime room state, and discovery.
2. Split local synthetic lifecycle simulation from human broadcaster status so “Live” cannot coexist with “Ready to set up” without an explicit simulation banner.
3. Make Live now contain only live rooms; add truthful empty, Recommended, and Upcoming sections.
4. Re-fetch/re-rank discovery immediately after follow/unfollow and lifecycle/presence changes.
5. Replace hard-coded admin moderation with selected-user moderation, reason, confirmation, and audit feedback.

### P1 — Production-quality information architecture

1. Redesign Admin into Applications, Users, Reports, Broadcasts, Transactions, and Audit sections with search/filter/pagination/detail views.
2. Separate audience Account, Wallet, Notifications, and Security instead of one long panel.
3. Simplify streamer Actions/goal and mode-specific private-show pricing.
4. Finish administrator and operational Chinese localization.
5. Add live creator autocomplete search and explicit live/offline grouping.
6. Improve moderation discoverability in live chat, including confirmation and recent-action feedback.

### P1 — Mobile product quality

1. Implement a bounded current/previous/next live-player feed for actual live creators; retain static cards for offline recommendations.
2. Complete a real-device matrix for camera flip, rotation, keyboard, sheets, background/foreground, weak network, and interrupted publishing.
3. Add clearer reconnect/resume timing and failure recovery.
4. Test long creator and audience sessions for memory, thermal, battery, audio/video drift, and stream continuity.

### P2 — Retention and polish

1. Separate notifications/inbox from future direct messaging.
2. Improve discovery diversity and cold-start explanations using the existing explainable preference model.
3. Add creator cover media and richer profile presentation only after core discovery/live truth is stable.
4. Add richer post-stream comparisons and moderation summaries without turning the broadcast page into analytics software.
5. Improve transaction/support detail presentation and creator acknowledgment workflow.

## Recommended soak-test milestone

A soak test should follow the P0 truth fixes, not replace them.

### Stage A — Cloudflare-free application soak

- Duration: 2 hours initially, then 8 hours after stabilization.
- Load: ramp 10 → 50 → 100 concurrent simulated users.
- Mix: 60% discovery/profile/room reads, 20% long-lived Socket.IO presence, 10% chat, 5% follow/reminder changes, 5% synthetic gift/action transactions against an explicitly simulated live room.
- Include reconnects, tab churn, repeated follow/unfollow, idempotent retries, and Redis/API two-process operation.
- Keep camera, microphone, Cloudflare Stream, DNS, deployment, and real payment out of this stage.

Acceptance thresholds:

- HTTP error rate below 1% excluding intentional validation errors.
- API p95 below 500 ms locally under the planned 100-user load.
- Realtime event delivery p95 below 1 second.
- No duplicate paired-ledger transaction, negative wallet, cross-room event, or unauthorized response.
- No unbounded memory trend; final steady-state memory within 20% of the stabilized first-hour baseline.
- No database-pool exhaustion, Redis presence leak, or room count drift greater than 5% after disconnect cleanup.
- Process recovery and realtime reconnection complete within 60 seconds for an injected local API/Redis interruption.

### Stage B — Owner-approved real-media endurance

- Separate explicit approval immediately before starting.
- One browser broadcaster plus several audience devices for 30–60 minutes through Cloudflare Stream.
- Measure publish/playback continuity, reconnect behavior, audio/video drift, camera flip, mute, background/foreground, explicit end, and final offline propagation.
- This stage consumes Cloudflare resources and is not authorized by the application soak.

## Recommended next milestone

**Truthful Live Discovery and Authoritative Stream Termination**

Deliver the five P0 truth/safety items first, then run Stage A of the soak plan. The administrator redesign should be the next product milestone after the first application soak is stable.
