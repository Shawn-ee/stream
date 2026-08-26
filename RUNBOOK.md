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

## Verify the Creator Broadcast Cockpit locally

1. Sign in as `demo-streamer` and confirm the video stage is the first operational surface below the compact header.
2. In the collapsed technical-help section, use the local development selector to verify `offline`, `connecting`, `live`, and `unavailable`; no Cloudflare call is made.
3. Confirm each state changes the stage, status badge, and OBS operating guidance without claiming playback when unavailable.
4. Confirm Chat, Gifts & support, and Audience tabs render independently and the displayed audience count uses unique audience identities.
5. Confirm room/profile/private-show settings remain available in Room setup, actions remain under Earning tools, and OBS troubleshooting remains under Technical help.
6. Transition `live` to `offline` locally and confirm the owner-only session summary appears. An audience request to the same summary endpoint must be rejected.
7. Check English and Chinese at desktop width and inspect the mobile layout at 390 px when a resizable browser surface is available.
8. Run `npm run verify:staging` and reset demo data. This local workflow does not authorize an encoder, Cloudflare usage, or Linux/public deployment.

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

## Verify individual audience registration

```powershell
npm run verify:registration
```

This creates one uniquely named temporary audience account, verifies validation, password hashing, session/CSRF behavior, identity isolation, role denial, zero test-coin balance, logout, and case-insensitive login, then deletes only that temporary account. It does not send email, contact an identity provider, or retain personal data. The command is included in `npm run verify:staging`.
