# Private Deployment Runbook

## Scope and boundary

This package is a launch-candidate topology for private staging and localhost verification. It does not authorize public exposure, DNS, a Linux production change, TLS certificate issuance, Cloudflare changes, or launch. The web container is deliberately bound to `127.0.0.1` by default. A production operator must place an approved TLS terminator in front of this boundary.

## Services

- `web`: compiled React assets and same-origin reverse proxy for `/api` and `/socket.io`.
- `api`: compiled Fastify and Socket.IO application with readiness and graceful shutdown.
- `migrate`: one-shot, ordered database migration using the same API image.
- `postgres`: durable application records.
- `redis`: durable Socket.IO coordination state and cross-process broadcasts.

Cloudflare Stream remains outside this topology and carries all video ingest, transcoding, and playback bandwidth. The API returns authorization only; it never proxies video.

All Dockerfile and Compose base/service images are locked to multi-architecture digests recorded in `deploy/Base-Image-Lock.md`. Run `npm run verify:image-lock` before a build. Digest updates are reviewed maintenance changes and require a fresh release verification cycle.

## Prepare an environment

After the owner selects and approves a private Linux staging host, run the read-only admission check from the repository root before placing any secret on it:

```sh
sh deploy/verify-host-prerequisites.sh
```

The check requires Linux on x86-64 or ARM64, Docker 24+, Docker Compose 2.20+, at least 2 logical CPUs, 4 GiB memory, 20 GiB free workspace disk, Docker daemon access, and an available `APP_PORT` (8080 by default). It may warn when clock or port inspection tools are unavailable. It never installs software, changes firewall/network state, reads project secrets, or starts a container. Passing it is evidence of minimum host suitability, not permission to deploy.

1. Copy `.env.production.example` to `.env.production` outside source control.
2. Replace every `replace-with-...` value. Use a long random database password and synthetic-account password.
3. Set `WEB_ORIGIN` to the exact approved private HTTPS origin.
4. Keep secrets in the host secret store or a root-readable environment file. Never bake them into an image.
5. Rotate the previously exposed Cloudflare test token before any approved deployment. Cloudflare configuration is a separate owner gate.

Validate without starting services:

```powershell
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
```

## Build and start privately

```powershell
$env:PRODUCTION_ENV_FILE='.env.production'
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml up -d
docker compose --env-file .env.production -f docker-compose.production.yml ps
Remove-Item Env:PRODUCTION_ENV_FILE
```

The migration must exit successfully before the API starts. The API must report healthy before the web gateway starts. Verify the gateway at `http://127.0.0.1:8080/healthz` and readiness from inside the API container:

```powershell
$env:PRODUCTION_ENV_FILE='.env.production'
docker compose --env-file .env.production -f docker-compose.production.yml exec -T api wget -qO- http://127.0.0.1:3001/ready
Remove-Item Env:PRODUCTION_ENV_FILE
```

Do not seed synthetic demo users on a real deployment. Seeding is only part of disposable localhost validation.

The complete disposable localhost production-package smoke test is:

```powershell
npm run verify:production-compose
```

It builds the images, runs the migration service, waits for health/readiness, verifies the localhost gateway, confirms `/internal/metrics` is unavailable through the public web boundary but accessible with authentication inside the API network, and runs `down` without deleting volumes.

## Backup and restore

The automated disposable restore drill is:

```powershell
npm run verify:backup-restore
```

For an approved private host, take a PostgreSQL custom-format backup from the database container, encrypt it using the operator's approved backup system, and store it off-host. Do not place backups or credentials in this repository. A restore must first target a separate database and pass row-count and application-readiness checks before it replaces any active database.

The repository verifier creates and destroys only the exact disposable database `stream_mvp_restore_check`; it never overwrites the normal application database.

## Upgrade and rollback

1. Back up PostgreSQL and verify the backup before an upgrade.
2. Record the current source revision and image digests.
3. Build the candidate and run migrations in private staging.
4. Run readiness, authentication, security, realtime, and smoke checks.
5. For application-only failure, restore the previous source revision/image and restart it.
6. Database migrations are forward-only. If a migration changes data incompatibly, stop and restore the verified pre-upgrade backup into a separate database before switching the application. Never improvise a destructive rollback against the active database.

## Shutdown and incident checks

```powershell
$env:PRODUCTION_ENV_FILE='.env.production'
docker compose --env-file .env.production -f docker-compose.production.yml down
Remove-Item Env:PRODUCTION_ENV_FILE
```

`down` preserves named data volumes. Inspect structured API logs, `/ready`, the administrator-only operational counters, PostgreSQL health, Redis health, and reverse-proxy health. External alerts and a managed monitoring destination remain required before public launch.
