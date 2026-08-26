# Staging Prototype Architecture

## Purpose

This repository is a private, locally runnable staging prototype. It demonstrates the essential workflows of a modern livestream platform without claiming production or launch readiness.

## Runtime topology

```text
Browser (React/Vite, localhost:5173)
  | HTTPS-style application requests + Socket.IO during local development
  v
Fastify API (localhost:3001)
  |-- PostgreSQL 16 (localhost-only Docker port): users, rooms, chat, test ledger,
  |   private-show access, reports, moderation, audit events
  |-- Redis 7 (localhost-only Docker port): reserved local realtime/cache service
  `-- Cloudflare Stream API: server-side playback authorization only

Streamer test encoder (OBS or synthetic FFmpeg)
  -> Cloudflare Stream Live Input
  -> Cloudflare ingest, transcoding, playback delivery
  -> signed playback iframe returned by the Fastify API

Creator browser Quick Go Live
  -> explicit getUserMedia camera/microphone permission and private preview
  -> API-proxied WHIP signaling (fixed provider URL remains server-side)
  -> direct browser-to-Cloudflare WebRTC media
  -> API-authorized WHEP signaling
  -> direct Cloudflare-to-audience WebRTC media
```

## Ownership boundaries

| Concern | Owner |
|---|---|
| Web UI, demo sessions, discovery, chat, gifts, private-show rules, moderation | This application |
| Demo records, append-only test ledger, reports, room state | PostgreSQL |
| Live ingest, transcoding, video delivery, player iframe | Cloudflare Stream |
| WHIP/WHEP endpoint discovery and protected signaling authorization | This application API |
| Video bandwidth and segments | Cloudflare Stream, never the local API |

Cloudflare credentials remain in `.env` and are used only by the API. OBS viewers receive only an authorized playback URL. Browser-native creators/viewers receive SDP answers and opaque local session identifiers; they never receive the Cloudflare API token, fixed WHIP/WHEP endpoint, or upstream resource URL.

## Essential request paths

1. A viewer selects a seeded room and the API records a local visit.
2. The viewer requests playback. The API applies private-show access checks, then returns a signed Cloudflare Stream iframe URL when authorized.
3. The creator may explicitly refresh the configured Live Input's read-only status. The API normalizes it into a persisted `live`, `connecting`, `offline`, or `unavailable` room state; local verification uses a labeled fallback without contacting Cloudflare.
4. Chat and presence use Socket.IO. Messages are validated, room-scoped, stored in PostgreSQL, and blocked when global or creator room-scoped moderation applies.
5. Gifts and private-show purchases use test coins only. Each transfer writes paired, append-only ledger records for the viewer and creator.
6. Creator and admin actions are role-checked server-side and recorded as moderation/audit events.

## Local validation

```powershell
docker compose up -d
npm run db:migrate
npm run db:seed
npm run check
npm run verify:expanded
npm run verify:realtime
npm run verify:cloudflare
```

`npm run db:seed` restores the named demo users and clears disposable demo interactions.

## Explicit staging boundaries

This repository does **not** include public deployment, DNS, production Linux configuration, real payments or cashout, real authentication, KYC, enforceable age verification, creator verification, collection of real personal data, or legal/compliance claims. Those require a separately approved production-readiness phase.
