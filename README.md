# Stream Launch Candidate

Stream is an original bilingual English/Chinese livestream-platform launch candidate. The application handles discovery, accounts, realtime room interaction, creator operations, test-only gifts/actions/private access, moderation, and administration. Cloudflare Stream remains responsible for video ingest, transcoding, and delivery.

The current release is intended for private evaluation and an owner-approved Linux staging environment. It is not approved for public launch, real payments or cashout, real customer identity, enforceable age verification, KYC, or legal/compliance claims.

## Current evidence

- Secure synthetic-account authentication with hashed passwords, expiring/revocable server sessions, CSRF protection, and server-derived WebSocket identity.
- English/Chinese audience, creator, and administrator workflows using the original Midnight Aurora interface.
- Physical camera and microphone delivery through the existing Cloudflare Live Input, signed playback tracks, and truthful offline recovery.
- Digest-locked Node, Nginx, PostgreSQL, and Redis container foundations with repeatable private Docker packaging.
- Backup/restore, dependency resilience, structured logging, protected metrics, security boundaries, and deterministic demo reset.
- A fresh digest-locked production-container test with 100 active sockets, zero unexpected disconnects, and every defined latency/resource threshold passing.

See the [documentation index](docs/Documentation-Index.md) for requirements, operations, architecture, verification evidence, and approval boundaries.

## Version baseline

The immutable initial baseline is commit [`8aa41bf`](https://github.com/Shawn-ee/stream/commit/8aa41bf688336c1f8a0a8478e69d556d094477b5), with annotated tag [`stream-launch-candidate-0.1.0`](https://github.com/Shawn-ee/stream/tree/stream-launch-candidate-0.1.0). The current local application-source candidate is `4cadd6a631544377b826ea998dcd1102d5f5799c`; it adds the owner-approved hardening already on GitHub plus a guarded private-Linux staging operator. It must not be deployed or pushed until separately approved. An approved staging operator must use that exact application-source commit (or a later owner-approved immutable release tag that contains it) and record the built application-image digests used on the host.

## Local development

Prerequisites: Node.js 24, Docker Desktop/Engine, and Docker Compose.

```powershell
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run verify:staging
npm run dev
```

Open `http://localhost:5173`. The API liveness endpoint is `http://127.0.0.1:3001/health` and dependency-aware readiness is `http://127.0.0.1:3001/ready`.

Copy `.env.example` to `.env` for a new local setup and replace placeholders locally. Never commit `.env` or paste its values into issues, logs, or documentation.

## Release verification

```powershell
npm run verify:release-preflight
npm run verify:staging
npm run verify:production-compose
npm run verify:backup-restore
npm run verify:load:production:100
```

External camera/Cloudflare broadcast checks are deliberately excluded from default gates and require fresh explicit owner approval for each execution.

## Deployment boundary

The production-style Compose gateway binds to localhost by default. Do not expose it publicly or change DNS, Cloudflare configuration, Linux infrastructure, payments, identity providers, age/KYC, or compliance policy without the approvals defined in [GOAL.md](GOAL.md).

For an approved private Linux staging host, begin with the read-only admission check:

```sh
sh deploy/verify-host-prerequisites.sh
```

Then follow [the private deployment runbook](docs/Deployment-Runbook.md). No deployment is performed by cloning this repository alone.
