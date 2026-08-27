# Stream Platform Product Goal

## Current frontend milestone status

Frontend Modernization Phases 1–9 are complete locally. The responsive product now has the shared design system, desktop/mobile discovery and room layouts, mobile broadcasting workflow, public creator profiles, stable loading/error/empty states, debounced race-safe search, deferred below-fold rendering, and production bundle budgets. The next bounded product milestone is public discovery with low-friction test onboarding; deployment, payment, identity, compliance, and Cloudflare approval boundaries remain unchanged.

Build a deployable, bilingual English/Chinese livestream-platform **launch candidate** with original design, code, name, and assets. It should provide the essential creator and viewer workflows of a modern streaming product while remaining meaningfully simpler than Stripchat.

## Target outcome

The finished product can be deployed to an owner-controlled Linux environment and is designed, load-tested, and operationally documented for **100 concurrent active users** (viewers, creators, and administrators combined). Video ingest, transcoding, and delivery remain Cloudflare Stream responsibilities; the application servers handle product logic, realtime interaction, and data.

“Deployable” means a private or limited-access, test-only launch candidate with repeatable infrastructure, secure authentication, backups, monitoring, and recovery procedures. It does not include legal/compliance implementation, real-money commerce, or creator payouts.

## Active four-phase product goal

The owner revised the active scope on 2026-08-27. The product remains a bilingual streaming application with synthetic test coins only.

1. **Account lifecycle:** account profile, secure password change, active-session visibility/revocation, and an approval-gated recovery design.
2. **Creator onboarding:** audience-to-creator application, administrator review, auditable decision, and transactional creator profile/offline-room provisioning.
3. **Audience retention:** follows/favorites, notification read state, creator schedules, and a followed-creator feed with truthful lifecycle updates.
4. **Gift polish:** optional accessible sounds, larger original premium motion, bounded combo gifts, and creator acknowledgements while preserving idempotent test ledgers.

## Explicitly skipped and out of scope

- Legal/compliance implementation, legal conclusions, jurisdiction launch analysis, enforceable age verification, KYC, and production evidence operations.
- Real token sales, deposits, Stripe or another payment processor, refunds/chargebacks, creator financial balances, withdrawal, cashout, and payouts.
- Real email recovery and external identity-provider activation.

Existing planning documents for moderation/commercial systems remain non-authoritative background records only. They do not represent active milestones. Reintroducing any skipped area requires a new owner request and a newly scoped goal; it is not a continuation of this test-only goal.

## Completed milestone: Public End-to-End Live Broadcast

Completed on 2026-08-26 on the approved `holiwyn.online` deployment. The demo streamer used the Logitech camera and microphone through the approved FFmpeg encoder, Cloudflare Stream performed ingest/transcoding/delivery, and a signed-in Linux-side audience client received truthful live state, signed playback authorization, and the public HLS manifest. The delivered media contained both video and audio tracks. Production hides local fake-live controls, fails closed when Stream is disabled or unavailable, and does not expose the Cloudflare API token, ingest URL, stream key, raw provider error, or signed playback URL in logs or source control. Subjective picture/sound quality and OBS-specific usability remain owner acceptance items, not failures of the technical path.

## Completed milestone: Account Lifecycle Foundation

Completed locally on 2026-08-27. Every authenticated role can edit its display name and interface locale, inspect privacy-safe active-session records, revoke one or all other sessions, and change its password after current-password verification. Password changes rotate password material, revoke every prior session, and create one new current session. Account security events are bounded and exclude IP addresses, raw user agents, credentials, and tokens. Recovery is deliberately inactive and documented as an approval-gated verified-email/single-use-token design. Focused verification, the complete staging gate, bilingual desktop review, and 390×844 responsive review pass; no real email, external identity provider, or personal-data recovery path exists.

## Completed milestone: Creator Application and Provisioning

Completed locally on 2026-08-27. An audience account can submit, withdraw, inspect, and revise a creator application. Administrators review a bilingual queue and must record a reason when approving or rejecting. Approval transactionally creates exactly one creator profile and truthful offline room, changes the account role, records audit/notification evidence, and revokes every applicant session before creator access is granted on the next login. Repeated decisions fail safely. The workflow collects no identity, KYC, tax, contract, or payment data and creates no Cloudflare resource.

## Completed milestone: Audience Retention Loop

Completed locally on 2026-08-27. Audience accounts can follow/unfollow creators, return through a live-first followed-creator feed, see regular and next-stream schedules with validated IANA timezones, receive deduplicated bilingual in-app notifications on truthful live/end transitions, and control single/all notification read state. Ownership and role boundaries, schedule validation, lifecycle deduplication, English/Chinese behavior, and 390×844 rendering pass. No email, SMS, browser push, tracking, or external notification provider is active.

## Completed milestone: Gift Experience Polish

Completed locally on 2026-08-27. Test gifts support persisted, serialized ten-second combos; original large premium presentation; default-off locally synthesized accessible sound cues; reduced-motion behavior; and one-time room-owner creator acknowledgements delivered as minimal realtime events. These presentation features cannot change server-calculated price or the paired idempotent test ledger. Focused ledger/combo/authorization/realtime checks, bilingual audience/creator browser checks, and mobile rendering pass. No external media, real payment, redemption, or payout exists.

## Completed milestone: Mobile Browser Broadcasting Experience

Completed locally on 2026-08-27. The existing protected browser-to-Cloudflare WHIP publisher now has a staged phone-first creator workflow: explicit permission, private preview, room-title save, camera/microphone selection, active track replacement, friendly connection health, duration and mute/camera controls, and confirmed ending. Read-only English/Chinese browser acceptance passes from 320px mobile through desktop without requesting devices or contacting Cloudflare. Physical iOS/Android capture and a short real audience broadcast remain owner-assisted acceptance items requiring explicit approval immediately before media begins.

## Archived background: Production Moderation and Compliance Planning

Archived background package created on 2026-08-27 before the owner removed legal/compliance work from the active scope. It is not an active milestone, legal conclusion, launch approval, or implementation requirement.

## Archived background: Commercial Architecture and Activation Gates

Archived background package created on 2026-08-27 before the owner removed real payments and payouts from the active scope. No commercial implementation was created, and none is planned under this goal.

`docs/Test-Only-Product-Completion-Audit.md` is the authoritative current-state audit for the revised scope.

## Completed milestone: Professional Creator Broadcast Cockpit

Completed locally on 2026-08-26. The feature-heavy Creator Studio scroll is now a professional, video-first operating workspace. The creator immediately sees how to start in OBS, receives a truthful signed audience-feed preview when live, monitors deduplicated viewers/chat/gifts/actions/goal/test earnings in real time, manages secondary settings without clutter, and receives an accurate owner-only session summary after broadcasting. The redesign is bilingual, responsive, original, and secret-safe; it does not add browser capture, real payments, or automatic OBS/device control. Linux/public deployment remains a separate approval-gated action.

## Completed milestone: Browser-Native Quick Go Live

The deployed launch candidate includes an explicit creator-only camera/microphone permission flow, private preview, device selection, microphone level, mute/camera controls, WHIP publishing, signed WHEP audience playback, safe stop, transport-aware lifecycle, and an OBS/HLS fallback. Fixed provider publishing/playback endpoints and signing material remain server-side because the Linux API proxies signaling only; audio/video media continues directly between browsers and Cloudflare.

Automated tests, the complete Cloudflare-free staging gate, bilingual browser review, production Compose gate, reviewed Git publication, migration `012`, controlled Linux deployment, and public HTTPS checks pass. With explicit owner approval, exactly one Stream signing key was created and installed only in the mode-600 Linux production environment. A second physical test proved Logitech camera/microphone preview, WHIP ingest, provider-confirmed live state, server-signed WHEP negotiation, real 640×480 audience playback with an advancing media clock, explicit stop, realtime audience-ended behavior, provider disconnect, offline recovery, and final demo reset. Subjective sound quality remains a human acceptance check; OBS/HLS remains the stable fallback.

## Product scope

- Discovery: live grid, categories, search, featured rooms, creator profiles, schedules, follows, and clear room status.
- Audience: English/Chinese UI, authenticated accounts, room chat, presence, notifications, report/block tools, and safe viewing states.
- Rooms: Cloudflare Stream playback authorization, goals, original gift/action interactions, private-room access rules, and realtime activity.
- Creator Studio: browser-native Quick Go Live, optional OBS/Cloudflare broadcast mode, title/category/goal controls, action menu, supporter insights, private-show configuration, and room moderation.
- Admin: user/creator review, reports, moderation, audit history, and operational visibility.
- Operations: Docker-based deployment, HTTPS, secrets management, database migrations/backups, health checks, structured logs, metrics, rate limits, and 100-user load testing.

## Delivery phases and exit gates

1. **Product completion:** close remaining P0/P1 prototype gaps and verify an owner-assisted OBS camera/audio broadcast to audience playback.
2. **Production foundations:** replace dummy roles with secure email/password or approved OAuth login; session security, authorization hardening, input validation, CSRF/CORS policy, rate limits, and security review.
3. **Deployment readiness:** environment separation, Linux Docker Compose deployment, reverse proxy/TLS, secrets outside source control, migration/back-up/restore procedures, and rollback runbook.
4. **100-user readiness:** Socket.IO scaling plan, Redis-backed realtime coordination, connection limits, database indexes/connection pooling, load tests for 100 concurrent users, capacity baseline, and alerting/logging.
5. **Limited launch decision:** owner reviews operational evidence and explicitly approves a private deployment. No public launch occurs automatically.

## Completion evidence

- A clean environment can build, migrate, seed required non-production data, deploy, and roll back using documented commands.
- Automated tests, browser smoke tests, security checks, backup/restore test, and load tests pass.
- A 100-concurrent-active-user test demonstrates acceptable product/API/realtime behavior while video delivery stays outside the application server.
- Secrets stay server-side and are absent from source control, browser payloads, logs, and documentation.
- The owner has explicit deployment approval and understands the remaining compliance boundaries.

## Harness Engineer development rule

Future work follows `docs/Harness-Engineer-Loop.md`. Each reference-derived feature gets a P0/P1/P2/P3 decision note. The harness loop continues through the target outcome and phase exit gates, not toward literal feature parity. It may autonomously implement in-scope local P0/P1 work, but it must stop for owner approval before any deployment, Cloudflare cost/configuration change, public exposure, payment, identity, age-verification, KYC, legal, or compliance action.

## Explicit approval gates

The following are never implied by this goal: public deployment, DNS changes, Linux production changes, Cloudflare configuration or spend, real authentication-provider credentials, collection of real personal data, or any skipped legal/commercial work. Legal/compliance implementation, real payments/cashout, KYC, enforceable age verification, and creator payouts require an entirely new owner-scoped goal, not merely an approval inside this one.
