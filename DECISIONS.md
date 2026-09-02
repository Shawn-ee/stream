# Architecture Decisions

## 2026-09-02 — Languages and tags replace room categories

- Every room has exactly one primary language and at most two additional languages from a controlled standard-code catalog.
- Room language selection uses OR semantics in discovery; codes, not localized names, are stored in URLs and APIs.
- CONTENT, FORMAT, and MOOD tags classify content. COMMUNITY is controlled and voluntary. SYSTEM and MODERATION tags are internal.
- Trending and Featured remain system-owned. Creators cannot assign them.
- Country flags are not stored, inferred, or rendered.
- Legacy category fields are deprecated compatibility data; new Studio/public contracts do not use them.

## 2026-09-02 — Document receipt is not identity verification

Holiwyn accepts a private encrypted document only after `creator-agreement-v1` and explicit 18+ confirmation. Upload is `UPLOADED`, administrative inspection may be `REVIEWED`, and neither means verified. No external identity provider or Google OAuth is used. Auto-activation is server-controlled, creates no room, and adds creator capability without removing audience capability.

## 2026-09-02 — Creator access is stateful, server-authoritative, and side-effect free on navigation

- **Decision:** Replace implicit open-mode provisioning and the legacy application approval shortcut with an explicit creator state machine and ordered onboarding commands.
- **Reason:** A menu click or GET request must never silently change an audience account, create a room, or expose a discovery card. Hiding a button is not authorization.
- **Implementation:** Activation revalidates profile, unexpired identity result, current agreement acceptance, and restrictions inside one transaction. Automatic approval is a server flag and records pending, approved, and active transitions. Activation creates a creator profile only. Room creation and publication are separate explicit commands.
- **Privacy boundary:** Draft rooms require an active owner or administrator in realtime and are absent from every audience room projection and interaction endpoint.
- **Migration:** Existing legitimate streamer roles migrate to ACTIVE. No legacy audience-owned profile/room is deleted; a review-only database view identifies suspicious records.
- **Production boundary:** Mock identity is non-production only. Missing production identity configuration fails closed. Google login is authentication, not identity verification, and remains separate.
- **Deferred:** Current-agreement renewal enforcement for already-active creators and the new-state manual review administration require follow-up implementation before public creator onboarding.

## 2026-09-02 - Audience navigation is minimal; broadcast eligibility is centrally enforced

- Anonymous navigation exposes only discovery/search and one authentication entry. Registration is a mode inside that same modal, not a competing header action. Google and email options remain absent until a real verified provider is integrated.
- Authenticated audience navigation exposes only **Go live** and avatar. Every account-owned destination is grouped in the avatar menu; mobile reuses the same information architecture as a fixed-width sheet.
- `BROADCAST_ACCESS_MODE` defaults to `open`. Activation is a CSRF-protected server transaction that locks the user, rejects banned/admin accounts, and provisions one creator profile and room. Existing streamer-only endpoints accept the audience account only after verifying those owned resources, so broadcasting does not remove its audience capabilities.
- `approval_required` denies activation unless the account has already been approved/provisioned. The existing application/admin APIs remain as dormant foundation, but their incomplete audience UI is not exposed in open mode.

## 2026-09-01 - Public entry is audience-first and creator access is server-approved

- Holiwyn exposes one neutral sign-in/create-account flow. The browser never asks a visitor to choose audience, streamer, or administrator and never declares its own role; the authenticated server record remains authoritative.
- Anonymous visitors receive only audience discovery/viewing surfaces. Creator application is visible only after an audience account signs in, and the long form lives in Account & security rather than on the discovery feed.
- Applying does not grant broadcasting access. Administrator approval transactionally changes the account role and revokes existing sessions; only the resulting streamer session may render or call creator broadcast tools.
- Administrator and approved-streamer accounts may still use the neutral credential form, but no privileged account type or demo handle is advertised on the public surface.

## 2026-08-31 - Personalization is explicit, deterministic, and locally explainable

- Saved discovery preferences belong only to the authenticated audience account. Language/category interests affect ordering rather than filtering; temporary search/category/language controls remain independent and are never silently persisted.
- The ranking combines truthful live state, followed creators, selected interests, current viewer/follower popularity, live freshness, and at most five visits from the last 30 days. A one-hour repeat penalty adds variety without hiding a room. Stable title/slug tie-breaks make repeated results reproducible.
- Responses expose only bounded reason labels such as `preferred_language`, `preferred_category`, and `recently_watched`; visit counts and timestamps remain private server data. Turning personalization off removes every identity-derived scoring signal and restores the same ordering as an anonymous request.
- Guests retain global discovery and never receive a preference record. No cookies beyond the existing session, browser storage, tracking pixel, external analytics, ML model, profiling vendor, or behavioral data export is introduced.
- The raw CSS and compressed-asset ceilings remain unchanged; the preference surface reuses existing first-party components and styles.

## 2026-08-31 - Schedule reminders are follow-owned, deduplicated, and in-app only

- Reminder preference belongs to the audience-to-creator follow relationship and defaults on when a viewer deliberately follows. Only that audience account can change it; unfollowing removes the relationship, and opting out removes unread schedule notifications for that creator.
- A changed future `next_stream_at` creates at most one bilingual `schedule_updated` notification per viewer/time. When the Notifications surface checks within one hour of the scheduled time, the API creates at most one `schedule_reminder`; live rooms, past times, disabled preferences, and non-followers are excluded.
- Delivery uses the existing authenticated notification API, per-user Socket.IO room, and a one-minute active-app refresh. There is no background worker, email, SMS, browser push, service worker, third-party provider, or guarantee while Holiwyn is closed.
- Notification responses expose only public room slugs and display copy—not deduplication keys, viewer balances, provider credentials, or infrastructure errors. Creator schedule updates remain owner-only and timezone validated.
- The raw CSS ceiling remains 135 KiB. The combined compressed JS+CSS ceiling moves from 145 to 147 KiB for this first-party workflow; the resulting build is 145.6 KiB compressed and adds no dependency.

## 2026-08-31 - Canonical routes serve crawler previews without changing human navigation

- Canonical `/room/:slug` and `/creator/:slug` URLs remain the only public share URLs. Nginx internally routes a bounded list of common social-preview crawler user agents to the API HTML renderer; ordinary browser requests continue to the React SPA.
- Preview HTML is derived only from existing public room/creator fields. Every dynamic value is bounded and escaped, and preview images are allowed only from platform-owned normalized avatar or stream-thumbnail routes. External image URLs and raw infrastructure/provider details are excluded.
- Preview responses are public but short-lived (`max-age=60`, `stale-while-revalidate=300`) and vary by user agent and content encoding. This balances timely live/offline information with bounded crawler traffic; explicit cache purging is not introduced.
- The crawler list is intentionally narrow and link-preview focused. Search-engine SSR, generalized bot detection, prerender services, screenshot generation, dynamic edge workers, and Cloudflare configuration remain outside this local milestone.

## 2026-08-31 - Sharing is canonical, explicit, and progressive

- Share payloads always use the canonical same-origin room/profile path. Web Share is preferred where the browser exposes it; cancellation is silent, unsupported/rejected Web Share falls back to the Clipboard API, and a separate Copy link action remains available on desktop.
- Sharing is public and does not require authentication, mutate account state, spend R, or disclose private identifiers. Payloads contain only public creator/title information and the public URL.
- The SPA updates document title, canonical URL, Open Graph title, and Open Graph URL when its route changes. The static HTML contains an absolute `https://holiwyn.online/` canonical and generic Holiwyn Open Graph/Twitter fallback for crawlers that do not execute JavaScript.
- Route-specific crawler previews are intentionally not claimed: they require a separately designed server/edge HTML response and cache policy. No framework migration, backend rewrite, image generator, or external sharing service is introduced here.
- The existing 135 KiB CSS and 145 KiB compressed-asset limits remain unchanged; the share controls reuse established button and notice primitives.

## 2026-08-31 - Public audience surfaces use canonical same-origin URLs

- Discovery is `/`, a public room is `/room/:slug`, and its creator profile is `/creator/:slug`. Both detail routes use the existing stable public room slug and hydrate through the safe public room API.
- The current lightweight React application uses the browser History API rather than adding a routing dependency. Holiwyn-owned history state records the parent route so in-product Back returns predictably, while direct links recover to discovery instead of leaving the site.
- Refresh and browser Back/Forward are authoritative navigation inputs. Malformed or missing slugs show a bilingual recovery state and never silently substitute another creator.
- Authentication intent remains memory-only and can resume onto a canonical room/profile URL. Canonical routing does not weaken API authorization, private-show playback gates, or mutation consent.
- Client document titles are updated, but server-rendered Open Graph/social-card metadata and explicit Share/copy-link controls are intentionally deferred.

## 2026-08-31 - Authentication resumes one bounded intent and never implies consent to spend

- The client retains at most one typed authentication intent in memory. Closing the gate, logging out, changing to a non-audience role, or completing the intent clears it; it is not persisted in browser storage or sent as trusted authorization data.
- Navigation intents restore Following, Wallet/account, Inbox, creator application, or account destinations. Follow is the only interaction completed automatically because its POST is idempotent and the viewer explicitly requested that exact relationship.
- Chat drafts remain unsent, gift/action/private-access choices remain unpurchased, and reports remain unsubmitted. Authentication only reopens or focuses the relevant review surface and shows bilingual status feedback.
- Server authentication, role checks, CSRF, balance checks, lifecycle checks, idempotency, and ownership remain authoritative. The pending intent is UX continuity, not a security boundary.

## 2026-08-31 - Public viewing is anonymous; identity-bearing interactions require authentication

- Discovery, safe creator/room metadata, public broadcast lifecycle, public playback authorization, privacy-safe chat history, support activity, and room-scoped realtime presence are readable without an account. Anonymous viewers count toward truthful room presence.
- Anonymous realtime clients receive a synthetic connection-scoped guest identity only. They may join discovery/room channels but cannot join private user channels or send chat/mutation events.
- Chat send, follow state/mutation, gifts, action purchases, private-show purchase, wallet/ledger, reports, broadcasting, creator/admin surfaces, sessions, and account management require a server-verified session and existing role checks. The frontend gate is guidance, never the security boundary.
- Public room payloads do not expose Cloudflare live-input identifiers. Anonymous chat-history payloads omit internal sender UUIDs; authenticated creator moderation retains the identifiers it requires.
- Public playback remains lifecycle- and privacy-aware: offline/unavailable states stay truthful, public WHEP/HLS access is allowed only for eligible live rooms, and active private shows remain locked without purchased authenticated access.

## 2026-08-31 - Discovery may be rich, but commerce requires a live broadcast

- The deterministic private-staging catalog contains six synthetic creators with varied English/中文 metadata. These are fixtures for discovery and responsive QA, not fabricated live activity; seeded rooms remain offline.
- Mobile discovery uses one static creator preview per contained snap viewport. It does not autoplay or preload multiple video streams, and selecting a card reuses the existing truthful room lifecycle.
- Gifts, creator-priced actions, and private-show access are live-session interactions. Offline rooms prioritize follow, profile, schedule, and chat; both the UI and gift/action mutation endpoints fail closed when the broadcast is not `live`.
- Existing live gift/action ledger, idempotency, realtime, and goal behavior is preserved and explicitly tested by placing only the verification room into a bounded local live state, then restoring/resetting it.

## 2026-08-31 - Audience discovery is transparent and R remains non-monetary

- Language is optional discovery metadata. All languages is the default; English and 中文 are explicit filters and room-card tags, while the creator continues to set the stream language in pre-live metadata.
- The first recommendation model is deterministic and server-owned: truthful live state, followed-live status, current audience presence, follower count, and a bounded freshness boost. It does not use tracking, profiling, advertising, or machine learning.
- Mobile discovery uses a contained vertical scroll-snap feed and static thumbnails. Selecting a card opens the one existing room/player lifecycle; discovery never preloads or autoplays many streams.
- The product unit is displayed only as `R`. Simulated package orders are audience-only, schema-bounded, idempotent, and recorded in the existing synthetic ledger. R has no cash value and cannot be purchased with money, redeemed, withdrawn, or converted into RMB.

## 2026-08-31 - Followers are creator-owned, privacy-safe, cursor-paginated, and realtime

- Audience follow/unfollow remains the only relationship mutation; creators cannot add, remove, or manipulate followers.
- The creator Followers page exposes only public display name, account handle, follow timestamp, and the current `following` relationship. It does not expose email, wallet, sessions, presence history, IP/device data, or private activity.
- Creator follower reads are room-owner protected and use stable `(created_at, follower_id)` cursor pagination backed by `follows_streamer_created_idx`; limits are bounded to 1–50.
- A public `follow:changed` event carries only streamer/room identity and aggregate count. A private `follow:state` event goes only to the acting viewer and refreshes their Following feed, removing the prior reload requirement.
- Followers and financial supporters remain separate product concepts and separate creator pages.

## 2026-08-30 - Live moderation is room-scoped and broadcast health is layered

- Creator moderation affects one owned room: message deletion is a soft-delete with an audit event, mute/timeout/ban is persisted per viewer/room, and realtime payloads contain only the minimal room event. Global administrator restrictions remain separate.
- Slow mode and blocked terms are enforced server-side before message persistence. Expired timeouts stop restricting automatically; the creator can remove active restrictions from Settings.
- Broadcast health is presented as three distinct facts—local device readiness, Cloudflare ingest lifecycle, and audience playback readiness—so one green indicator cannot overstate the full delivery path.
- Pre-live metadata is saved before WHIP publication. Stream thumbnails and avatars are treated as untrusted media, normalized server-side to bounded WebP assets, and exposed through randomized public paths; upload exceptions remain route-specific at the gateway.
- Post-stream metrics remain session-local test evidence. They do not create production analytics, financial balances, payouts, or third-party tracking.
- The raw CSS guardrail moves from 125 KiB to 135 KiB for these first-party responsive/moderation surfaces. The stricter 145 KiB combined compressed-asset budget remains unchanged; no UI library or media dependency was added.
- Creator session truth may come from either the in-browser publisher runtime or the server-confirmed ingest lifecycle. A provider/OBS stream in `live` or `connecting` state must expose the live cockpit and moderation chat even when this browser did not publish the media.
- Pre-live metadata and thumbnail selection must remain available before camera/microphone permission. Device access gates preview and browser publication, not preparation of public stream information.
- The staging-operator verification prefers its digest-pinned Docker container. On Windows, if Docker is unavailable, it may run the identical read-only shell syntax and mocked admission checks through the existing Ubuntu WSL environment; this does not weaken deployment approval checks.

## 2026-08-29 - Creator identity lives behind one avatar menu

- The broadcaster header exposes one persistent avatar control. Creator utilities, language, and sign-out live in its popover; the old horizontal section strip is removed so mobile and desktop use the same understandable navigation model.
- Navigation continues to hide/show views around the one mounted broadcast controller. The avatar menu never owns camera, microphone, WebRTC, heartbeat, or room-socket lifecycle.
- Uploaded avatars are untrusted media. The API accepts only JPEG, PNG, or WebP up to 5 MB, decodes with a pixel limit, applies orientation, crops to 512×512, removes metadata, and stores a new randomized WebP. The browser never chooses the final path.
- The current single-server deployment stores avatars in an API-owned named volume. Database rows retain only public randomized URLs. This is portable through normal volume backup/restore; object storage/CDN becomes a later scaling step rather than a requirement for the current 100-user target.
- Avatar URLs are projected only with public creator identity. Upload/removal remains creator-owned and CSRF-protected; audience/admin roles cannot mutate it.

## 2026-08-29 - Creator Center reads one immutable test ledger

- Live remains the only owner of camera, microphone, WebRTC publication, heartbeat, and realtime room state. Creator Center sections are history-aware presentation views and never mount a second publisher.
- Available balance is the sum of the existing user ledger. Creator income includes only positive `gift`, `room_action`, and `private_show` references; session, 7-day, 30-day, and lifetime periods are server-derived.
- Detailed income rows are enriched server-side from their owned reference records. The browser receives display name, support label, quantity, room, time, amount, and a completed test state—not idempotency keys, wallet balances, or raw internal errors.
- Supporter ranking can include all support or gifts only. It is room-owner-only, capped, privacy-safe, and never exposed as public wallet data.
- A failed or version-mismatched wallet service is an unavailable state, not a zero balance or “no supporters” claim.
- Test tokens have no displayed yuan equivalence. Real purchases, deposits, refunds, withdrawals, payouts, KYC/tax handling, and cash claims remain excluded.

## 2026-08-29 - Creator earnings are a test-ledger view, not a financial account (superseded details)

- The creator Earnings page reads the existing balanced wallet ledger, room insights, and session summary. It does not create another balance owner or reinterpret test coins as currency.
- The first leaderboard ranked gifts only. The current Creator Center offers an explicit all-support ranking and a gift-only filter, both creator-owned and aggregate-only.
- Earnings and Profile are auxiliary views within the persistent streamer workspace. Opening either hides presentation but never unmounts the browser publisher, local tracks, heartbeat, or realtime room connection.
- Real deposits, token purchases, refunds, withdrawals, payouts, KYC/tax handling, and cash-value claims remain excluded.

## 2026-08-29 - Pre-live setup is a companion rail, not a second dashboard

- On desktop, the private camera preview and essential setup controls share one viewport. The preview owns the larger column; title, device selection, microphone confidence, and Go Live use one compact companion rail.
- An action appears only once in the pre-live workflow. Camera flip may remain over the preview because it directly affects framing; microphone and camera state changes live in the labeled setup controls.
- Profile editing uses the existing room and profile endpoints behind one visible save action. A lightweight viewer preview provides context without creating new creator-profile data, analytics, or media fields.
- Tablet and mobile continue to use their purpose-built stacked/camera-first layouts; the desktop grid is presentation-only and does not create another media controller.

## 2026-08-29 - Creator overlays remain legible without becoming video cards

- Transient creator chat and gift activity is rendered as foreground information over the camera, not as opaque panels. Text shadow, role color, animation, and gift-symbol glow provide hierarchy without hiding a large part of the broadcast preview.
- The desktop stage sizes from its available width; tablet and mobile keep their explicit device-specific height and fullscreen rules. Camera, WebRTC publishing, chat, gift, and ending behavior are unchanged.

## 2026-08-28 - Streamer auxiliary views must not own the publisher lifecycle

- `QuickGoLive` remains mounted for the lifetime of the signed-in streamer workspace. Profile and future lightweight session tools are presentation views layered around that owner; hiding a view must never invoke WebRTC/media cleanup.
- Profile navigation writes a small same-document history entry. UI Back to Live and browser Back restore the live view without renegotiation. A true document exit remains distinct and receives a browser leave warning while a publish session exists.
- Mobile retains a compact Profile/Back entry in the broadcaster header. The active camera surface stays minimal, but navigation may not become an invisible trap.

## 2026-08-28 - Browser broadcasting fails through a bounded recovery state

- A browser publisher sends a 15-second authenticated heartbeat and receives a 50-second server resource lease. A missing heartbeat never leaves an unlimited Cloudflare resource or permanently active database session.
- Page exit sends a best-effort, keepalive interruption signal. Mobile backgrounding remains browser-dependent, so the UI warns the creator, requests a screen wake lock while visible, and offers one-tap republishing when the peer cannot recover.
- An interrupted room uses the existing `connecting` lifecycle through the remaining publisher lease and a 45-second recovery grace. Viewers retain the room and chat but do not receive a false live player. A recovered Cloudflare live input returns to `live`; expiry returns truthfully to `offline` without an offline-to-connecting state reversal.
- Resume Live uses a dedicated session-handoff route. It must not reuse intentional End Stream or generate false offline/live follower notifications; only an explicit end or expired recovery becomes a genuine ended lifecycle.
- Camera flip prefers the semantic `user`/`environment` constraint and falls back to a different enumerated device. The current published track is replaced in place. On mobile hardware that cannot open both cameras concurrently, the old camera is released only after the seamless attempt fails; a failed retry attempts to restore the prior camera and always gives the creator feedback.
- Recovery remains bounded to one API process for this deployment. Moving publisher lease ownership across multiple API replicas requires Redis-backed resource/recovery coordination before horizontal media-control scaling.

## 2026-08-27 - Broadcasting is a focused runtime, not a Creator Studio dashboard

- The primary streamer route presents only preview/live media, stream title, understandable connection health, viewer count, chat, incoming gifts, microphone, camera, camera flip, and confirmed ending.
- Desktop uses video and chat side by side. Mobile uses one camera-first surface, transient activity over video, and an on-demand chat bottom sheet. Landscape mobile maximizes video and suppresses nonessential chat.
- Earnings, goals, action configuration, schedules, analytics, moderation tables, OBS guidance, and other operational tools must not appear inside the active broadcasting workflow.
- Existing media and realtime ownership remains unchanged: the current `QuickGoLive` controller owns local tracks and WHIP publication; the existing room socket supplies chat, presence, and gift events.
- Device permission remains deliberate. Preview is local until Go Live is selected, and End Stream always requires confirmation before the publisher and media tracks are closed.

## 2026-08-27 - Discovery requests are debounced, race-safe, and failure-aware

- Creator text search waits 250ms after the last input before requesting rooms. Category changes and explicit retries remain immediate.
- Each room-list request receives a local sequence identifier; only the newest response may update rooms, loading, or failure state.
- Loading, valid empty results, and service failure are separate user states. A failed API request must not tell users that no creators exist.
- Below-fold non-media discovery surfaces may use `content-visibility: auto` with intrinsic sizing. The featured surface and live player remain immediately renderable.
- Production web assets are guarded by explicit raw and gzip budgets. Raising a budget requires evidence from a measured feature, not silent bundle growth.

## 2026-08-27 - Public creator profiles use only supported product data

- The public profile reads the existing streamer profile, room lifecycle, schedule/timezone, follower count, and follow-status APIs; it does not create a second profile or follow data owner.
- Creator identity in discovery and the room may open the profile, while the current-room call to action returns to the same room and existing player flow.
- Missing cover images use original non-media artwork. Verification, social links, clips, recent VODs, private analytics, wallet data, and fabricated viewer counts are excluded until real product data and APIs exist.
- Offline, connecting, unavailable, and live states remain distinct. An offline creator profile may advertise schedule and room metadata but must not render an active player or claim a live broadcast.

## 2026-08-27 - Mobile broadcasting remains one protected WHIP controller

The mobile creator flow is a staged presentation around the existing Browser Quick Go Live controller, not a second publisher. Camera/microphone permission remains user-initiated; the preview stays local until the creator explicitly starts; the existing server-authorized WHIP exchange, heartbeat, opaque session identifier, lifecycle events, safe DELETE, and Cloudflare secret boundary remain unchanged.

The current room title is saved through the existing creator-owned metadata endpoint before negotiation. Active device changes use `RTCRtpSender.replaceTrack` so a compatible phone can switch camera or microphone without ending or renegotiating the provider session. Ordinary creators see Ready, Connecting, Excellent, Reconnecting, or Unavailable rather than raw WebRTC diagnostics.

Ending is a two-step action. Confirmation closes the peer, deletes only the current opaque publishing session, stops local tracks, and returns the UI to idle. Browser emulation proves presentation and control boundaries but cannot prove physical iOS/Android camera behavior; that remains an owner-assisted actual-device and Cloudflare test requiring explicit approval immediately before media starts.

## 2026-08-27 - Mobile room chrome wraps the existing room controller

The immersive mobile room is a responsive presentation of the existing `RoomView`, not a second room implementation. Player lifecycle, WHEP/HLS selection, Socket.IO, chat draft/send, presence, follow/report, private access, gift catalog, test wallet, idempotent ledger transfer, goal progress, and support feed remain owned by the existing controller.

Mobile controls call those existing callbacks. Chat and gift bottom sheets render the same current state without opening another socket or fetching another catalog. Desktop chat/gifts remain the rendered desktop surfaces and are hidden only at phone/short-landscape breakpoints.

Portrait prioritizes a tall black media stage while preserving video with `object-fit: contain`; it does not stretch or crop a 16:9 source. Short landscape phone viewports suppress secondary content and application chrome so the existing player occupies exactly the viewport. No fake quality, share, playback, or live state was introduced.

## 2026-08-27 - Mobile discovery is a presentation over existing room state

The mobile audience receives a dedicated content-first feed, but it does not own fetching, realtime connections, lifecycle normalization, following state, or room navigation. `App` continues to own those concerns and passes current data and callbacks into `MobileDiscoveryFeed`.

For You is a live-first ordering of the existing room result, Following uses the existing followed-creator response, and Live filters only rooms whose normalized lifecycle state is `live`. Empty states remain honest when those sets are empty. Category and creator search continue through the existing filters.

Discovery uses static original gradient artwork only. It does not initialize video, iframe, WHEP/HLS, or autoplay in the feed, avoiding bandwidth and CPU growth as more creators are listed. Video initialization remains exclusive to the selected room.

## 2026-08-27 - Mobile global navigation reuses existing product views

Holiwyn keeps one shared responsive application with a mobile-only header and five-item bottom navigation rather than creating a separate mobile site or router. Home returns to discovery; Discover opens existing creator search/live content; Go Live opens the existing creator-application entry point for audience accounts; Inbox opens existing visited-room/notification activity; and Me opens existing profile, password, and session controls.

Mobile navigation uses immediate section movement because long smooth-scroll animations made rapid tab changes appear stale. Page-level smooth scrolling is disabled below 768px only. The navigation uses safe-area insets and 52px controls, and the global body no longer enforces a fixed 320px minimum that conflicts with the scrollbar gutter.

No new route, server endpoint, tracking, browser storage, invented inbox, payment flow, broadcast transport, or role permission was added. Mobile discovery and immersive room sheets remain separate bounded phases.

## 2026-08-27 - Desktop room layout does not own product logic

The desktop viewer room is a presentation grid: flexible video/engagement content beside a bounded 21.5rem sticky chat panel, with the creator bar immediately below playback and secondary details below the core interaction area. Tablet widths below 1024 pixels stack video, creator, chat, and engagement without changing state ownership.

`RoomCreatorBar` and `LiveChatPanel` are callback-driven presentation components. They do not fetch, mutate, open sockets, negotiate media, or calculate balances. `RoomView` retains the existing signed WHEP and iframe/HLS playback, lifecycle, Socket.IO, gift/action ledger, follow/report, private-show, and wallet paths.

## 2026-08-27 - Discovery uses truthful available metadata

Desktop discovery is creator-first: a Holiwyn product header, creator search, featured room, live-card grid, and collapsible recommendation/following rail all reuse `/api/rooms`, `/api/me/following`, categories, and `discovery:broadcast` events. The UI does not fabricate concurrent viewer counts, verification badges, thumbnails, clips, or recommendation scores that the current API does not provide.

The presentation components accept room data and open callbacks while `App` continues to own fetching and selected-room state. This keeps navigation incremental and avoids a router, API, database, or realtime rewrite. Real viewer counts and creator media may be added later as explicit data contracts.

## 2026-08-27 - Frontend modernization is incremental and mobile-first

Holiwyn will retain one React application and shared business state while using responsive layout wrappers for desktop and mobile viewing. The UI foundation uses semantic Midnight Aurora tokens, a small spacing scale, explicit 480/768/1024/1440 breakpoints, safe-area insets, minimum touch targets, visible focus, and reduced-motion behavior.

Existing Fastify APIs, PostgreSQL records, Socket.IO events, role authorization, gifts/follows, browser WHIP publishing, WHEP playback, and OBS/HLS fallback remain the source of truth. Presentation work must reuse these paths; a visual problem is not permission to replace working backend or media infrastructure. Desktop navigation/discovery is the next bounded phase before live-room and mobile immersive layout changes.

## 2026-08-27 - Compliance is a signed gate set, not a software feature

The project will not label itself compliant based on an age checkbox, moderation queue, KYC vendor, processor account, or passing test. `Compliance-Launch-Gates.md` requires a frozen content/business model, jurisdiction opinions, age/creator eligibility, policies and victim channels, privacy governance, operational Trust & Safety, processor/commercial feasibility, security/vendors, and a signed launch packet.

Production moderation requires separated roles, restricted-evidence handling, immutable cases/actions, independent appeals, explicit retention/deletion/holds, and trained critical-incident procedures. The current local admin/report UI is a product prototype only.

Stripe is not assumed. Its current official restrictions make adult content/services and adult live-chat incompatible, while content-creation platforms require review. The project will not misclassify or route around a processor decision. Commercial activation requires written eligibility for the exact disclosed model or a no-go/change in business model.

## 2026-08-27 - Gift polish cannot change financial truth

Gift combos are a room/viewer/catalog-gift presentation chain with a ten-second window, serialized database calculation, and a hard 10,000 cap. Each purchase retains its own server-calculated cost, idempotency key, gift row, and paired ledger transfer; the combo counter never multiplies price.

Sound is locally synthesized, default-off, and activated only by user choice. Premium motion is original CSS and must preserve semantic live-region text and `prefers-reduced-motion`. This avoids unlicensed assets, autoplay assumptions, and external tracking.

A creator acknowledgement is one persisted room-owner action per gift, not a ledger mutation or private communication. Minimal realtime payloads contain only the acknowledgement/gift identifiers, creator/sender display names, and bounded message key.

## 2026-08-27 - Retention stays in-app and lifecycle-driven

Follow is the initial favorite primitive: one account-to-creator relationship drives a private followed feed and later lifecycle notifications. The feed prioritizes truthful live rooms, then explicit next-stream timestamps and regular schedule copy.

Notifications are created only on persisted broadcast transitions, not every status poll. A per-user lifecycle key makes delivery idempotent. Title/body are selected from the follower's stored locale, and notification read changes are owner-scoped. This milestone deliberately avoids email, SMS, push permissions, external analytics, and third-party messaging until consent/privacy/provider gates exist.

Creator schedules combine human-readable recurring copy with one optional next occurrence and validated IANA timezone. This is intentionally smaller than a recurrence engine; calendars, reminders, and external delivery remain future separately reviewed work.

## 2026-08-26 - Creator workspace navigation (P0)

Creator Studio uses six persistent product workspaces: Live, Earnings, Actions, Private Show, Profile, and Settings. Live is always the default because broadcasting and operating the current session are the creator's primary job. It contains the deliberate camera/microphone permission path, private preview, Go Live/End Broadcast, truthful lifecycle, audience activity, support, and goal context.

Configuration is separated by frequency and intent. Goal/action editing, test earnings, private access, public profile, moderation, OBS guidance, and local-development tools cannot crowd the primary live workflow. The sections reuse existing server-authorized APIs and realtime events; navigation is a presentation boundary, not a new authorization mechanism. On phones it remains horizontally scrollable while the page itself must not overflow.

## 2026-08-26 - Audience product hierarchy (P0)

The signed-in audience surface uses a persistent product header and a discovery-first information hierarchy. Room cards provide original visual identity, truthful broadcast state, creator/category context, and schedule/follower metadata without copying reference branding, assets, or exact layouts.

Inside a room, video and chat are the primary desktop surfaces. Goal/support actions, gifts, public support activity, creator profile, wallet, and private-show information remain available as secondary layers. On narrow screens these surfaces become one ordered column without horizontal overflow. Existing authorization, ledger, realtime, playback, and private-show behavior is unchanged; this decision restructures presentation rather than weakening product boundaries.

## 2026-08-26 - Browser-native Quick Go Live with signaling proxy (P0)

Creators receive an explicit browser permission and private-preview flow before any camera or microphone is accessed. Quick Go Live uses Cloudflare Stream WHIP publishing and WHEP playback; OBS continues to use RTMPS ingest and signed HLS playback. A room stores the selected transport so viewers never receive the wrong player. The two transports cannot publish simultaneously to one room.

The API fetches fixed WebRTC endpoints using the server-only Stream token and proxies only SDP signaling. Provider endpoint URLs and upstream resource locations never enter browser responses, logs, cookies, local storage, or the database. Media flows directly between browser and Cloudflare, so Linux does not relay video bandwidth. Publishing is room-owner-only, single-session, CSRF-protected, rate-limited, no-store, and auditable. Audience WHEP signaling reuses room/private-show authorization.

Endpoint discovery is cached and concurrent requests are deduplicated so audience joins do not create a Cloudflare API request stampede. Authenticated one-minute heartbeats keep legitimate publisher/viewer resources alive; resources without a heartbeat are terminated after three minutes. This bounds abandoned server memory and upstream sessions without imposing a fixed duration on a valid broadcast.

Cloudflare WebRTC is beta and currently requires WHIP ingest to pair with WHEP playback. OBS/HLS therefore remains a visible professional fallback. A physical camera/audio broadcast and Linux deployment remain fresh owner-approval gates.

## 2026-08-26 - Server-generated signed WHEP playback (P0)

The assigned Live Input keeps `requireSignedURLs=true`. With explicit owner approval, exactly one account Stream signing key was created and its private JWK was installed only in the ignored, mode-600 Linux production environment. The security setting was not weakened.

The API locally generates five-minute RS256 tokens whose subject is the assigned Live Input, substitutes the token only into the WHEP playback endpoint, and proxies SDP as before. The private JWK, key ID, fixed provider URL, and raw provider errors never enter browser responses. Production Quick Go Live fails closed unless the base Stream configuration and both signing fields are present. The owner-approved physical test proved successful signed WHEP negotiation, real audience video playback, explicit teardown, and offline recovery. OBS/RTMPS with signed HLS remains the professional fallback because Cloudflare WebRTC is beta.

## 2026-08-26 - Video-first creator cockpit (P0)

Creator Studio is an operating surface, not an administration dashboard. Its primary hierarchy is: signed audience-feed confidence monitor, truthful lifecycle/start guidance, realtime audience/support activity, then secondary configuration. The site does not claim it can start OBS or capture devices; the primary offline action confirms that the creator started streaming in OBS and performs a safe status refresh.

Creator preview reuses the existing role-authenticated signed playback endpoint and never reveals the playback token outside the iframe URL already required by the player. Audience count is based on deduplicated audience identities rather than raw Socket.IO connection count. Session summaries are server-calculated from persisted lifecycle boundaries and room-scoped support records and are restricted to the room owner.

## 2026-08-26 - Explicit production media activation boundary (P0)

Cloudflare Stream is enabled only when `CLOUDFLARE_STREAM_ENABLED=true` and every required server-side field is present. Production never exposes the local broadcast-state simulator. Status and playback fail closed with non-sensitive application messages, while playback-token failures are converted to a generic service-unavailable response. The first public proof reuses the existing `stream-mvp-local-test` Live Input; it does not create another input or change DNS/Tunnel configuration.

When fully configured, the single launch-candidate API process polls assigned Live Inputs every 15 seconds so viewers do not depend on a creator pressing refresh. Polling is dormant when Stream is disabled, processes rooms independently, and persists/emits only actual lifecycle transitions. Multi-process polling leadership remains part of the later horizontal-scaling gate.

## 2026-08-26 - Public physical media proof and credential retirement (P0)

The public deployment uses one account-owned, least-privilege Cloudflare Stream Write token named `stream-holiwyn-production`. Both duplicate expiring development tokens were deleted after explicit owner confirmation. The secret was transferred through restricted temporary files, installed only in the ignored Linux production environment, and the temporary files were removed after the test.

The owner-approved physical proof reused the existing Live Input and the installed FFmpeg encoder because OBS is unavailable. Automatic polling—not a manual fake-live state—reported the Logitech camera/microphone stream live. The public signed manifest contained video and audio, a Linux-side audience client authenticated through `holiwyn.online` and fetched the signed HLS manifest, and the lifecycle returned offline after encoder stop. This is technical delivery evidence; subjective picture/sound quality and OBS workflow acceptance remain human checks.

## 2026-08-23 - Local-first monorepo

The MVP uses TypeScript workspaces: a React/Vite client, Fastify API, PostgreSQL, Redis, and Docker for stateful services. Applications run on the Windows host during development; PostgreSQL and Redis bind only to localhost.

## 2026-08-23 - Video boundary

Cloudflare Stream owns live ingest, transcoding, and delivery. The API owns authorization, metadata, chat, balances, gifts, and moderation. Cloudflare credentials are server-side only.

## 2026-08-23 - Test-only commercial boundary

Balances and gifts are fake, non-monetary test data. Payments, cashouts, real authentication, KYC, and launch compliance are out of scope until explicitly approved.

## 2026-08-23 - Expanded product direction

The product is a Stripchat-inspired streaming-business prototype, not a copy. It will implement comparable major workflows, including discovery, creator tools, variable-value gifts, private shows, audience history, and admin operations, using original visual design and code. Private-show tickets and per-minute access remain test-coin simulations until the owner approves a separate legal, payment, and compliance phase.

## 2026-08-23 - Harness Engineer reference loop

Future product expansion uses a deliberate reference-derived loop rather than unstructured feature copying. Each visible reference feature receives a P0/P1/P2/P3 importance classification, a rationale, a simplified local proposal, explicit verification, and a recorded outcome. In-scope test-only P0/P1 work may proceed autonomously after a concise owner-facing note; P2 is deferred; P3 and all production/payment/identity/compliance changes require owner direction. The stop condition is a coherent simpler product, not feature parity.

## 2026-08-23 - Midnight Aurora visual system (P1)

The local prototype uses an original dark visual system: `#0B1020` background, `#151B2E` surfaces, `#202A44` raised surfaces, `#7C5CFC` primary violet, `#FF4D6D` live coral, `#F6B73C` gift gold, and state-specific green/red accents. Video remains near-black and visually dominant. This is a product identity decision, not a copy of Stripchat styling or assets.

## 2026-08-23 - Read-only admin test-transaction audit (P1)

The admin dashboard may view the latest gift and private-show entries from the local append-only test ledger. This projection is restricted to the demo admin role and intentionally excludes real financial data, payout controls, balance adjustments, exports, and production reporting.

## 2026-08-23 - Broadcast lifecycle status (P0)

`live`, `connecting`, `offline`, and `unavailable` are stored as separate normalized lifecycle states. Cloudflare is read only when a creator explicitly refreshes status; regular local work uses a labeled local fallback and cannot claim a stream is live after a status failure. Only signed playback is returned for the `live` state.

Cloudflare normalization reads only `result.status.current.state`. Historical states are audit context and must never determine current room availability; current `disconnected` takes precedence over any earlier `connected` record.

## 2026-08-24 - Owner-approved physical media proof

With immediate owner approval, the existing Logitech camera and microphone were encoded by the preinstalled FFmpeg tool into the existing Cloudflare RTMPS Live Input. Signed playback contained both audio and video tracks, lifecycle transitioned live then offline, and no Cloudflare resource or setting changed. OBS-specific UI remains untested because OBS is not installed.

## 2026-08-23 - Test action menu and contribution goal (P0)

Creator actions are room-scoped, creator-owned test-coin prompts with a short title, optional duration label, active state, and display order. A purchase is idempotent and records paired local ledger entries before advancing one shared room goal. Gifts and actions both qualify for the goal, while the audience UI keeps their controls and feedback distinct. This is a local product interaction model only: no adult-content taxonomy, payment, hardware integration, cashout, or external action service is implied.

## 2026-08-23 - Local creator session insights (P1)

Creator insights are a read-only, room-owner-only projection of existing local gifts and action purchases. They summarize test-coin support, action use, one top supporter, recent activity, current room presence, and the existing goal. The public room feed intentionally exposes only a display name, support type, item label, and test-coin value. No cross-room analytics, tracking, exports, real financial data, or personal data is collected.

## 2026-08-23 - OBS broadcast-readiness boundary (P0)

The platform does not capture camera or microphone media in the browser. Creators configure those sources inside OBS, while the app only provides non-secret readiness guidance and a read-only lifecycle refresh. A real camera/audio test is owner-assisted and requires immediate explicit confirmation before a Cloudflare Stream broadcast starts; its result is verified through truthful lifecycle and audience playback behavior.

## 2026-08-23 - Deployable 100-user target

The product goal is now a deployable, owner-controlled launch candidate designed and load-tested for 100 concurrent active users. Cloudflare Stream remains responsible for video delivery; application capacity covers APIs, PostgreSQL, Redis, and realtime connections. Production deployment is a staged, evidence-based outcome rather than automatic permission to launch; payment, age/KYC, legal/compliance, public exposure, and Cloudflare configuration/spend remain separate approval gates.

## 2026-08-24 - Database-backed synthetic identity

Local test accounts now authenticate with scrypt-hashed synthetic passwords and opaque, hashed, expiring server sessions. HTTP and WebSocket authorization derive identity from the same session; client-declared roles are rejected. A strict same-site session cookie plus double-submit CSRF token protects mutations. No real identity data or external provider is involved.

## 2026-08-24 - Local security and readiness boundary

The API enforces a bounded request body, production-configurable origin and proxy trust, fixed-window mutation limits, bounded Socket.IO payloads and room joins, safe error envelopes, and baseline security headers. `/health` remains a process liveness signal while `/ready` verifies PostgreSQL and Redis dependencies.

## 2026-08-24 - Reproducible private deployment boundary

The launch-candidate topology is compiled into separate API and web images and orchestrated with PostgreSQL, Redis, one-shot migrations, readiness checks, and a same-origin reverse proxy. The gateway binds to localhost by default; external TLS, public exposure, DNS, Linux host changes, managed secrets, and monitoring remain owner-gated operations.

## 2026-08-24 - 100-user application capacity evidence

The API uses a 20-connection PostgreSQL pool and Redis-backed Socket.IO coordination. Cluster-aware presence was proven across two API processes. A predefined stepped local workload passed with 100 authenticated active sockets, zero unexpected disconnects, bounded latency/resources, offline playback authorization, cross-role denial, and exactly-once test-ledger mutation under a ten-request duplicate race. This evidence covers the application layer, not Cloudflare video capacity or an internet soak.

## 2026-08-24 - Private operational telemetry boundary

Machine-readable metrics use a constant-time bearer-token check and a non-proxied `/internal/metrics` route. The endpoint exposes bounded process, HTTP, realtime, PostgreSQL-pool, and Redis signals without user, wallet, credential, or Cloudflare data. Initial alert thresholds are documented but no external monitoring or notification service is connected without owner approval.

## 2026-08-26 - Individual audience registration boundary

Private staging may create individual audience accounts using a non-email ASCII handle, display name, and scrypt-hashed password. Handles are normalized to lowercase and uniquely enforced by the database; registration is rate-limited by source address and always assigns the audience role. New accounts receive no test coins automatically. Creator/admin elevation, email delivery, OAuth, recovery, MFA, real personal-data collection, public exposure, and commercial identity claims remain separate approval-gated milestones.

## 2026-08-27 - Test-token gifts and video activity overlays (P0)

The product uses eight fixed gift prices—1, 5, 10, 20, 50, 100, 1,000, and 10,000 test tokens—with bilingual names, original symbols, and bounded visual tiers. `1 test token = ¥1 reference value` is display-only product language; it does not create a currency, sale, deposit, withdrawal, redemption, or creator payout obligation.

Gift totals are calculated by the API from the active catalog and bounded quantity. Every successful gift is idempotent, produces equal sender-debit and creator-credit entries in the append-only test ledger, advances the local goal, and emits only a minimal room-scoped event. Totals of 1,000 or more require an explicit test-only confirmation. Comments remain persisted in chat, but their video overlay is transient; users may hide it and reduced-motion preferences disable entrance animation.

## 2026-08-27 - Account lifecycle foundation and recovery boundary (P0)

Account profile changes are limited to display name and interface locale; handles remain immutable so ownership, ledger, moderation, and audit references stay stable. Password changes require the current password, enforce the registration-strength policy, reject reuse, rotate password material, revoke every existing session, and issue one fresh current session. Session lists expose only a random public session ID, a coarse device label, and bounded timestamps—never token hashes, IP addresses, raw user agents, or CSRF values.

Recovery is design-only. The application does not collect an email address or claim a reset path exists. Activation requires approved privacy/retention policy, verified-email storage, transactional mail delivery, enumeration-safe responses, hashed short-lived single-use tokens, rate limits, complete session revocation, and separate owner approval.

## 2026-08-27 - Real money is a separate ledger and activation program

The synthetic test ledger will never be promoted or converted into financial truth. Any approved commercial system must use a legal-entity/currency-scoped immutable balanced double-entry ledger, explicit purchase/token/earning/payout state machines, compensating reversals, signed duplicate-safe webhook authority, daily reconciliation, and independent purchase/gift/payout kill switches. Browser redirects and animations are never proof of payment.

Commercial activation is staged and fail-closed. Stripe is no-go unless it gives written approval for the exact disclosed entity, domain, countries, content rules, live-chat, token, tipping, private-show, marketplace, refund and payout model; misclassification and bypass are prohibited. Provider sandbox, internal cents test, capped pilot and launch each require completed professional evidence and fresh owner approval. No real-money migration or processor resource is part of the current implementation.

## 2026-08-27 - Owner removes legal and real-money work from the active goal

The active product goal ends at a deployable bilingual test-only streaming platform. Legal/compliance implementation, jurisdiction analysis, enforceable age/KYC, payment processors, real token purchases, refunds/chargebacks, creator financial balances, withdrawal and payouts are not deferred steps inside this goal; they are excluded. The synthetic test ledger and reference-value labels remain non-monetary and cannot be converted into real balances. Any future commercial or legal program must begin as a new explicitly scoped owner request.
# 2026-08-27 - Creator approval provisions an offline local identity atomically

- Audience accounts may apply with only category, public bio, proposed schedule, and motivation; the test product does not solicit identity documents, KYC, tax, contract, or payout information.
- Approval and provisioning are one locked database transaction. It creates a single creator profile and offline room, changes the role, writes decision/audit/notification records, and revokes all applicant sessions.
- Rejection leaves the audience account intact and supports a revised application. Every administrator decision requires a non-sensitive reason; duplicate decisions fail closed.
- A provisioned room has no Cloudflare Live Input. Media resource assignment and creator eligibility/compliance remain separately owner-gated.
## 2026-08-31 - Live claims and destructive moderation require authoritative state

- “Live now” is reserved for rooms whose normalized lifecycle is `live`; offline and unavailable creators remain discoverable in a separately labeled recommendation section.
- Follow and lifecycle realtime events trigger an authoritative ranked discovery reload instead of only mutating visible labels and counts.
- Local lifecycle controls are simulation-only and must say that they do not publish or stop media. Simulated live status is visibly distinguished from provider-confirmed live status.
- Status source is persisted as `local` or `cloudflare` in migration `023`; message text is presentation and is never an authorization, discovery, playback, social-metadata, or ending-policy boundary.
- Streamer sign-out during an active browser/local session must first receive a successful server-side end result. Production OBS ingest cannot be stopped by the website, so an active OBS broadcast returns a conflict and instructs the creator to stop OBS first.
- Administrator moderation requires an explicitly selected non-admin account, a server-validated 2–500 character reason, and a final confirmation. No hidden fixed demo target, fixed reason, or administrator target is allowed.
- The raw CSS ceiling remains 135 KiB. The combined compressed JS+CSS ceiling is narrowly calibrated from 147 to 149 KiB for these first-party safety flows; no dependency was added.

## 2026-09-02 - Audience navigation is contextual, not a permanent rail

- The audience homepage reserves horizontal space for live content; Following belongs in a compact creator row and the account avatar menu rather than a permanent sidebar or standalone global-nav item.
- Guest authentication keeps explicit Sign in and Create account actions. Signed-in account, settings, creator application, and sign-out actions are grouped behind one accessible avatar menu; Wallet remains a direct high-frequency action.
- Live status and homepage ranking continue to use existing authoritative room data. Category and schedule surfaces are views of existing fields, not synthetic recommendations or new backend truth.
