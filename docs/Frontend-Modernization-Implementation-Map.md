# Holiwyn Frontend Modernization Implementation Map

Audit date: 2026-08-27. Scope: presentation and responsive behavior only. Preserve the working API, PostgreSQL schema, authentication, Socket.IO events, Cloudflare Stream lifecycle, WHIP publishing, WHEP/HLS playback, gift ledger, follow state, creator approval, and authorization boundaries.

## Current application map

| Area | Current implementation | Reuse decision |
|---|---|---|
| Framework | React 19 + TypeScript + Vite; one client entrypoint | Keep framework and build. Extract components incrementally; no migration. |
| Routing | Role and selected-room state inside `App`; no router dependency | Keep for this redesign. Introduce semantic view/layout components without changing URLs or backend contracts. |
| Styling | One global `styles.css` with Midnight Aurora colors, multiple late desktop-first media overrides | Keep the brand palette; add explicit tokens and mobile-first primitives, then migrate surfaces in order. |
| Authentication | Fastify session cookie, CSRF, scrypt credentials, account/session lifecycle | Reuse unchanged. Modernize sign-in/account presentation only. |
| Discovery | `/api/rooms`, categories, following feed, lifecycle Socket.IO updates | Reuse data. Build `LiveStreamCard`, desktop discovery shell/sidebar, and mobile live feed around it. |
| Stream room | One `RoomView` owns player, lifecycle, chat, gifts, follows, actions, support, profile, private state | Preserve hooks/calls. Extract visual units and introduce `DesktopStreamLayout` and `MobileStreamLayout`. |
| Video playback | Signed WHEP for browser broadcasts; signed Cloudflare iframe/HLS path for OBS; truthful offline/connecting/unavailable states | Preserve completely. Refactor only player shell, responsive sizing, labels, and recovery/discovery presentation. |
| Chat/realtime | Socket.IO room join, presence, history, moderation and chat/gift/action/broadcast events | Reuse unchanged. Desktop panel remains beside video; mobile uses overlays and an accessible bottom sheet. |
| Gifts | Server catalog, selected gift, explicit send, quantity, idempotent test ledger, combo events, premium overlay, optional sound | Reuse unchanged. Move picker into desktop tray/mobile sheet and improve visual hierarchy. |
| Following | Follow/status endpoints, followed feed and notification lifecycle | Reuse unchanged. Centralize one `FollowButton` presentation across cards, room and profile. |
| Creator profile | `CreatorProfile` fetches public profile, schedule, follower count and current room | Reuse endpoint. Build responsive creator header/profile surface; no fake clips/socials. |
| Browser broadcast | `QuickGoLive` uses `getUserMedia`, device enumeration, WHIP negotiation, track mute/camera state, heartbeat and safe stop | Preserve transport. Redesign as a mobile-first setup/live-control flow and add an end confirmation and friendly health labels. |
| Creator Studio | Functional section navigation, preview, quick live, chat/support/audience, goal/actions/profile/private settings | Preserve business logic. Replace dense control-card layout with responsive creator workspace. |
| Admin | Existing review/report/user/broadcast/test-transaction surfaces | Keep visually separate; only inherit shared tokens/accessibility primitives. |
| API/realtime server | Fastify + PostgreSQL + Redis Socket.IO adapter; role authorization and bounded events | No backend rewrite for modernization. Add API fields only if a visible requirement cannot be truthfully represented. |

## Current UX gaps

1. Signed-out production opens as a centered test console rather than recognizable live discovery.
2. The audience header lacks a strong Holiwyn brand/navigation/search/wallet/notification hierarchy.
3. Discovery has creator cards but no persistent desktop creator rail, featured hierarchy, mobile feed, or global bottom navigation.
4. `RoomView` is a long all-surfaces component; desktop is video/chat capable, but mobile is still a sequential desktop stack rather than immersive video plus sheets.
5. Follow, report, profile, gift, wallet and secondary support blocks visually compete with the video.
6. Global CSS uses repeated raw colors/radii/spacing and mostly `max-width` overrides rather than the specified mobile-first breakpoint system.
7. Important mobile actions do not consistently guarantee a 44px target or safe-area clearance.
8. Mobile chat and gifts are permanent page sections rather than overlays/bottom sheets that preserve playback.
9. Quick Go Live already supports browser camera/microphone, but it lacks the requested mobile setup sequencing, camera-facing labels, friendly connection health and end confirmation.
10. Loading and empty states exist as text in places but are not standardized reusable skeleton/empty-state primitives.
11. The monolithic `main.tsx` makes layout work risky; component extraction should follow working feature boundaries, not start with a full rewrite.

## Reusable presentation architecture

```text
App
├── SignedOutExperience
├── ProductShell
│   ├── DesktopHeader / MobileHeader
│   ├── DesktopDiscoveryRail
│   └── MobileBottomNav
├── DiscoveryView
│   ├── FeaturedStream
│   ├── LiveStreamCard / LiveStreamGrid
│   ├── MobileLiveFeed
│   └── FollowingFeed / EmptyState
├── RoomView (existing state and effects retained)
│   ├── StreamPlayerShell
│   ├── CreatorBar / FollowButton
│   ├── ChatPanel / MobileChatSheet
│   ├── GiftPicker / MobileGiftSheet / GiftOverlay
│   ├── RecommendedCreators
│   └── DesktopStreamLayout / MobileStreamLayout
├── CreatorProfile
└── StreamerStudio
    ├── BroadcastSetup
    ├── CameraPreview
    ├── BroadcastControls
    └── existing goal/chat/support/settings units
```

Data fetching, mutations, sockets and WebRTC controllers remain owned by their current feature container until extraction can be proven regression-safe. Presentational children receive state and callbacks; they must not duplicate API calls.

## Implementation order and acceptance

1. **Shared responsive design system:** semantic color/space/type/radius/control tokens; 44px controls; focus/reduced-motion; `Modal`, `BottomSheet`, `Skeleton`, `EmptyState`; safe-area primitives. No API change.
2. **Desktop navigation and discovery:** recognizable Holiwyn header, 220px collapsible creator rail, featured/live-first content, reusable cards, inline creator-priority search. At 1440px live creators appear immediately.
3. **Desktop live room:** video is largest object; rail may collapse before 320–380px chat; creator/follow bar directly below video; secondary support is visually subordinate.
4. **Mobile global UI:** dedicated header and five-item bottom navigation; 320–430px widths; no page overflow; safe areas and keyboard-safe inputs.
5. **Mobile discovery:** one-column content-first feed, large preview, tabs and search overlay; lazy static artwork; no multi-stream autoplay.
6. **Mobile live room:** viewport-dominant player, creator/action overlays, temporary chat messages, chat/gift sheets, recommended next creator, landscape simplification.
7. **Mobile broadcasting:** staged permission/preview/title/device/start flow, front/back camera affordance where devices allow it, explicit mic state, friendly connection health, end confirmation. Reuse WHIP logic.
8. **Creator profile:** shared responsive public profile using only supported data; no invented cover, verification, social, clips or recent-VOD APIs.
9. **Polish and performance:** standardized loading/empty/error states, lazy non-critical images, layout-shift and bundle/request audit, orientation/network interruption checks.

## Breakpoints

Mobile defaults start at 320px. Enhancements use `min-width: 480px`, `768px`, `1024px`, and `1440px`. Tablet removes the desktop discovery rail and may use collapsible chat. Desktop receives multi-column shells only from 1024px. Large desktop increases density without narrowing the video.

## Verification strategy

- Preserve and run the complete local staging gate after each bounded milestone.
- Add structural UI tests for shared tokens, touch targets, safe areas, layout wrappers and sheet accessibility.
- Browser smoke test representative 320×568, 390×844, 768×1024, 1024×768, 1440×900 and 1920×1080 sizes when the permitted browser surface can reach the local app.
- Perform actual-device camera/microphone tests only with explicit owner participation and permission; emulation cannot prove iOS/Android media behavior.
- Do not start Cloudflare broadcasts, deploy, change DNS/Linux/Cloudflare, or alter production as part of frontend modernization without a separate request.

## Phase 0 result

No backend, database, media-transport, realtime, authentication or production change is required to begin. The safest first implementation slice is the shared token/control/sheet/skeleton foundation, followed by desktop discovery.

## Phase 1 result

Completed locally: the shared semantic token layer, breakpoint/safe-area/touch/focus/reduced-motion rules, accessible modal and bottom sheet, skeletons, and discovery empty states. The focused verifier and complete staging gate pass.

## Phase 2 result

Completed locally: the signed-in audience now has a Holiwyn product header, inline search, collapsible creator rail, truthful featured surface, reusable light stream cards, a following section, and responsive one-to-four-column layouts. Existing room/category/follow APIs and realtime lifecycle events remain unchanged. No viewer count, thumbnail, verification, clips, or other unsupported data is invented.

Next bounded phase: desktop live-room hierarchy. Rendered localhost acceptance remains pending because the permitted in-app browser blocked the URL; production build and structural/staging checks pass.

## Phase 3 result

Completed locally: the audience room now prioritizes a 16:9 player beside a bounded sticky live-chat panel, with a compact creator/follow/gift bar directly below video and secondary engagement/detail surfaces afterward. Tablet widths stack the same shared components without changing playback, authorization, realtime, gifts, follows, private access, or wallet behavior.

Next bounded phase: mobile global UI. A Windows Chrome pass now covers 1707px, 1024px, 390px, and 320px; it found and resolved gift-tray and narrow-header overflow, confirmed exact player geometry and zero application console errors, and restored Chrome to its normal viewport afterward.

## Phase 4 result

Completed locally: signed-in audience mobile surfaces now have a compact header, expandable creator search, direct account access, and a fixed bilingual five-item bottom navigation with safe-area clearance and 52px controls. The shell routes to existing discovery, creator-program, audience-activity, and account surfaces without duplicating APIs, realtime state, authentication, or role behavior.

Windows Chrome acceptance covers 320×568, 375×812, 390×844, 414×896, and 430×932. It confirmed immediate tab routing, correct active state, search/account presentation, zero horizontal overflow, and readable room transitions at both edge widths. The pass found and fixed the old 320px body minimum and caught a shared React import regression before the production/staging gate.

Next bounded phase: mobile discovery. Build a content-first one-column feed and mobile-specific discovery/search treatment while preserving static truthful preview behavior and avoiding simultaneous video initialization.

## Phase 5 result

Completed locally: mobile discovery is now a dedicated one-column creator feed with For You, Following, and Live tabs, compact category filtering, integration with the expandable creator search, large truthful static previews, skeleton loading, and useful empty states. It consumes existing room/following data and lifecycle state through callbacks and contains no media initialization or duplicate network ownership.

Windows Chrome acceptance covers 320×568, 375×812, 390×844, 414×896, and 430×932 with 44px tabs, 16:9 cards, no horizontal overflow, correct search/category filtering, honest Following/Live empty states, and complete Chinese labels. A 1440×900 regression check confirms the desktop featured surface, rail, and grid remain unchanged.

Next bounded phase: mobile live room. Prioritize viewport-dominant playback, compact creator/actions, temporary chat overlays, chat/gift sheets, recommended-next discovery, and landscape simplification without touching the working WHEP/HLS, Socket.IO, ledger, follow, or authorization paths.

## Phase 6 result

Completed locally: the mobile room now suppresses global app chrome, makes the truthful player/offline surface dominant, overlays creator identity and compact existing actions, retains transient chat/gift activity over video, opens full chat and the eight-item synthetic gift catalog in accessible sheets, and keeps recommended-next discovery below supporting details.

Portrait Chrome acceptance covers 320×568, 375×812, 390×844, 414×896, and 430×932 with no horizontal overflow and at least 44px controls. Short-landscape acceptance at 844×390 and 932×430 confirms exact full-viewport media with no page scrolling. A 1440×900 regression check confirms the desktop room remains unchanged; English/Chinese controls and sheet close labels pass with no localhost console errors.

Next bounded phase: mobile broadcasting. Refine the existing WHIP-based Browser Quick Go Live into a staged phone workflow with understandable permission/preview/device/start/live/end states, friendly connection health, camera switching, and end confirmation. Actual device and Cloudflare broadcast validation remains owner-assisted and separately approved.

## Phase 7 result

Completed locally: Browser Quick Go Live now presents a deliberate phone-first permission step, private preview, bounded title and device setup, explicit start, friendly connection health and duration, camera/microphone controls, active track replacement, and confirmed ending. It continues to use the existing owner-authorized room metadata, WHIP signaling proxy, opaque session heartbeat/cleanup, lifecycle events, realtime activity overlay, and Cloudflare secret boundary.

Read-only browser acceptance covers 320×568, 375×812, 390×844, 414×896, 430×932, 844×390, and 1440×900 without horizontal overflow or localhost console warnings/errors. The pass found and fixed a connection-indicator class collision and compact Creator Studio grid overflow. It intentionally did not request camera/microphone permission or start a Cloudflare broadcast; actual-device iOS/Android validation remains owner-assisted and separately approved.

Next bounded phase: responsive creator profile. Build a creator-first public identity and current-stream surface from existing profile, room, schedule, category, follower, and follow data without inventing cover media, verification, social accounts, clips, or VOD history.

## Phase 8 result

Completed locally: audience discovery and room identity now open a dedicated responsive creator profile backed by the existing public profile and follow-status endpoints. The profile presents truthful lifecycle state, current room, biography, category, follower count, next schedule/timezone, follow control, and recommended-next discovery. It uses original gradient artwork when no media API exists and deliberately does not invent a cover, verification badge, social account, clips, or VOD history.

Desktop localhost acceptance at 1280×720 confirms the full English/Chinese profile, 44px controls, current-room and recommendation hierarchy, and zero page overflow. A focused structural verifier covers the mobile stack, safe area, supported-data boundary, shared follow ownership, room entry points, and reduced-motion behavior. Actual-device mobile validation remains part of the final responsive QA phase.

Next bounded phase: polish and performance. Standardize remaining loading/error/empty states, audit bundle and initial requests, reduce real layout shift and unnecessary work, then run representative mobile/tablet/desktop orientation and interruption regression checks without modifying the working media pipeline.

## Phase 9 result

Completed locally: session startup now holds a stable bilingual Holiwyn loading surface until authentication is known; creator search is debounced and sequence-guarded; discovery and Following distinguish loading, valid empty data, and service failure with retry; skeleton status is localized; and below-fold non-media surfaces defer rendering with intrinsic layout sizing.

The production bundle is now a staging gate rather than an informal observation. Current output is JavaScript 356.8 KiB raw/106.9 KiB gzip and CSS 94 KiB raw/18 KiB gzip, below the documented 450 KiB JavaScript, 125 KiB CSS, and 145 KiB combined-gzip limits.

Browser acceptance verified that rapid entry of “Night” produced exactly one final room request, with correct results and no console warning/error. Responsive checks at 320×568, 390×844, 768×1024, and 1440×900 found no horizontal overflow, retained 52px mobile navigation controls, and switched cleanly between mobile and desktop discovery. The viewport override was reset afterward.

Frontend modernization Phases 1–9 are complete locally. The next product milestone is public discovery and low-friction test onboarding: safe anonymous room/profile browsing with authentication required only for protected interaction and creator actions.
