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

The check requires Linux on x86-64 or ARM64, Git, Docker 24+, Docker Compose 2.20+, at least 2 logical CPUs, 4 GiB memory, 20 GiB free workspace disk, Docker daemon access, and an available `APP_PORT` (8080 by default). It may warn when clock or port inspection tools are unavailable. It never installs software, changes firewall/network state, reads project secrets, or starts a container. Passing it is evidence of minimum host suitability, not permission to deploy.

1. Copy `.env.production.example` to `.env.production` outside source control.
2. Replace every `replace-with-...` value. Use a long random database password and synthetic-account password.
3. Set `WEB_ORIGIN` to the exact approved private HTTPS origin.
4. Keep secrets in the host secret store or a root-readable environment file. Never bake them into an image.
5. Rotate the previously exposed Cloudflare test token before any approved deployment. Cloudflare configuration is a separate owner gate.

Set `PRIVATE_SSH_TUNNEL=true` only for the recommended localhost-only SSH-tunnel boundary, with `WEB_ORIGIN=http://localhost:<APP_PORT>`. Otherwise keep it `false` and use the exact approved private HTTPS origin. Set `CLOUDFLARE_STREAM_ENABLED=false` and leave all four `CLOUDFLARE_*` values blank when media playback is excluded; when enabled, all four rotated values are required.

On Linux, keep the completed environment file owner-only. The guarded operator runs the validator inside the locked Node container, so Node/npm is not required on the host. It reports field names and modes only and never prints secret values:

```sh
chmod 600 /approved/secret/path/.env.production
export STREAM_PRIVATE_STAGING_APPROVED=I_APPROVE_PRIVATE_STAGING
export EXPECTED_RELEASE_COMMIT=e1f64ad73e26792a84a94460afba50e0e16d5db3
export PRODUCTION_ENV_FILE=/approved/secret/path/.env.production
sh deploy/private-staging-operator.sh plan
```

The `plan` action verifies the exact clean source commit, runs the read-only host admission check, validates the environment, and validates Compose without starting a service. These environment variables record operator intent for one shell; they are not a substitute for the owner's approval statement.

## Build and start privately

After the approved `plan` passes, require a separate action-specific confirmation and start through the guarded operator:

```sh
export APPROVED_STAGING_ACTION=start
sh deploy/private-staging-operator.sh start
unset APPROVED_STAGING_ACTION
```

The migration must exit successfully before the API starts. The API must report healthy before the web gateway starts. Verify the gateway at `http://127.0.0.1:8080/healthz` and readiness from inside the API container:

`start` builds, runs migrations, starts services, then verifies the localhost-only published gateway, migration exit code, API readiness, and authenticated private metrics. A later read-only repeat is:

```sh
sh deploy/private-staging-operator.sh verify
```

Do not seed synthetic demo users on a public, customer-facing, or real-identity deployment. An explicitly owner-approved, localhost-bound private staging instance may seed the predefined synthetic accounts only after an initial backup, while Cloudflare and every commercial/identity/compliance feature remain disabled. Record that exception in the staging report and never treat those accounts or test coins as production data.

The complete disposable localhost production-package smoke test is:

```powershell
npm run verify:production-compose
```

It builds the images in a uniquely named verification project, runs the migration service against fresh disposable volumes, waits for health/readiness, verifies the localhost gateway, confirms `/internal/metrics` is unavailable through the public web boundary but accessible with authentication inside the API network, and removes only that exact verification project's containers/network/test volumes. It never targets normal development or approved staging volumes.

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

```sh
export APPROVED_STAGING_ACTION=stop
sh deploy/private-staging-operator.sh stop
unset APPROVED_STAGING_ACTION
unset STREAM_PRIVATE_STAGING_APPROVED EXPECTED_RELEASE_COMMIT PRODUCTION_ENV_FILE
```

`down` preserves named data volumes. Inspect structured API logs, `/ready`, the administrator-only operational counters, PostgreSQL health, Redis health, and reverse-proxy health. External alerts and a managed monitoring destination remain required before public launch.
