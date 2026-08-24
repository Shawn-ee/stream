# Local Runbook

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

Use `docs/Launch-Acceptance-Checklist.md` for the repeatable human browser pass across audience, creator, administrator, English/Chinese, truthful media states, and final demo reset. It records browser evidence separately from the automated gates below.

For the production-style private package, migration sequencing, readiness, backup/restore, upgrade, and rollback procedures, use `docs/Deployment-Runbook.md`.

The approved Linux staging operator begins with `sh deploy/verify-host-prerequisites.sh`. This is a read-only suitability check and is not authorization to deploy.

Run `npm run verify:production-compose` to reproduce the full local production-package build/start/readiness/private-metrics/gateway-boundary/shutdown smoke test.

Before creating the first Git baseline, run `npm run verify:release-preflight` and follow `docs/Release-Baseline-Checklist.md`. The preflight never stages, commits, tags, pushes, or deploys files.

For the protected metrics endpoint, initial 100-user alert thresholds, incident response order, structured-log verification, and local dependency-recovery drill, use `docs/Monitoring-Runbook.md`.

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

This procedure does not authorize Cloudflare configuration changes, new Live Inputs, credential rotation, public deployment, recording, or any real payment action.

The owner-approved 2026-08-24 test used the already installed FFmpeg encoder because OBS was absent. It proved physical camera/microphone RTMPS ingest, current-state lifecycle, signed playback authorization, Cloudflare audio/video tracks, and offline recovery. See `docs/Camera-Audio-Test-Report.md`. Every future execution still requires fresh immediate owner approval and a one-execution flag:

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

This removes only the predefined local demo accounts' room interactions and restores the Demo Audience's 500 test coins. It does not create a real balance or payment record.

## Verify creator actions and goal progress

`npm run verify:expanded` now covers creator action management, an idempotent audience action purchase, paired `room_action` test-ledger entries, and goal progress in addition to the existing local workflows. Run `npm run db:seed` after any manual browser purchase to restore the exact demo baseline.

## Verify creator session insights

Creator session insights and the public support feed are covered by `npm run verify:expanded`; realtime support activity is covered by `npm run verify:realtime`. Both commands remain local-only and use only the test ledger.
