# Stream Platform Product Goal

Build a deployable, bilingual English/Chinese livestream-platform **launch candidate** with original design, code, name, and assets. It should provide the essential creator and viewer workflows of a modern streaming product while remaining meaningfully simpler than Stripchat.

## Target outcome

The finished product can be deployed to an owner-controlled Linux environment and is designed, load-tested, and operationally documented for **100 concurrent active users** (viewers, creators, and administrators combined). Video ingest, transcoding, and delivery remain Cloudflare Stream responsibilities; the application servers handle product logic, realtime interaction, and data.

“Deployable” means a private or limited-access launch candidate with repeatable infrastructure, secure authentication, backups, monitoring, and recovery procedures. It does not mean that real-money or adult-content operations may launch without separately approved legal/compliance gates.

## Completed milestone: Public End-to-End Live Broadcast

Completed on 2026-08-26 on the approved `holiwyn.online` deployment. The demo streamer used the Logitech camera and microphone through the approved FFmpeg encoder, Cloudflare Stream performed ingest/transcoding/delivery, and a signed-in Linux-side audience client received truthful live state, signed playback authorization, and the public HLS manifest. The delivered media contained both video and audio tracks. Production hides local fake-live controls, fails closed when Stream is disabled or unavailable, and does not expose the Cloudflare API token, ingest URL, stream key, raw provider error, or signed playback URL in logs or source control. Subjective picture/sound quality and OBS-specific usability remain owner acceptance items, not failures of the technical path.

## Completed milestone: Professional Creator Broadcast Cockpit

Completed locally on 2026-08-26. The feature-heavy Creator Studio scroll is now a professional, video-first operating workspace. The creator immediately sees how to start in OBS, receives a truthful signed audience-feed preview when live, monitors deduplicated viewers/chat/gifts/actions/goal/test earnings in real time, manages secondary settings without clutter, and receives an accurate owner-only session summary after broadcasting. The redesign is bilingual, responsive, original, and secret-safe; it does not add browser capture, real payments, or automatic OBS/device control. Linux/public deployment remains a separate approval-gated action.

## Active milestone: Browser-Native Quick Go Live

The local launch candidate now includes an explicit creator-only camera/microphone permission flow, private preview, device selection, microphone level, mute/camera controls, WHIP publishing, WHEP audience playback, safe stop, transport-aware lifecycle, and an OBS/HLS fallback. The existing production Live Input passed a read-only WHIP/WHEP capability check. Fixed provider publishing and playback endpoints remain server-side because the Linux API proxies signaling only; audio/video media continues directly between browser and Cloudflare.

Automated tests, the complete Cloudflare-free staging gate, bilingual browser review, and the production Compose gate pass. Completion still requires fresh owner approval for one short physical camera/audio broadcast, separate-device audience confirmation, clean stop/offline recovery, reviewed Git publication, and controlled Linux deployment.

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

The following are never implied by this goal and require separate explicit owner approval at the time of action: public deployment, DNS changes, Linux production changes, Cloudflare configuration or spend, real authentication-provider credentials, real payments/cashout, KYC, enforceable age verification, adult-content policy decisions, collection of real personal data, and legal/compliance claims.
