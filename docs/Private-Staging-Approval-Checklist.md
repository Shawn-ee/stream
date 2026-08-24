# Private Linux Staging Approval Checklist

## Purpose

This checklist defines the information and explicit authorization required before any Linux host is inspected or changed. Completing it authorizes only the selected private staging actions. It never authorizes public launch, DNS, Cloudflare configuration/spend, payments, real identity, KYC/age verification, or legal/compliance claims.

## Recommended first staging boundary

- Deploy exact application-source commit `3d0b0ca6198785aded7203043d1a153ec7360c3e` from `https://github.com/Shawn-ee/stream`. The older `stream-launch-candidate-0.1.0` tag is an immutable historical baseline and does not contain the later environment and supply-chain hardening.
- Keep the application gateway bound to `127.0.0.1` on the Linux host.
- Reach it through an SSH tunnel from the owner's computer; no domain, DNS record, or public application port is required.
- Do not run the physical-media broadcast verifier during deployment. Media was already proven separately and needs fresh approval for every rerun.
- Use synthetic accounts and test coins only. Do not collect real-user or payment data.

This is the lowest-risk route to proving a real Linux deployment. A private VPN or approved TLS terminator can be a later separately scoped staging change when outside testers need access.

## Information the owner supplies

- [ ] Linux host address or SSH hostname.
- [ ] SSH username and approved authentication method. Do not paste a private key into chat or the repository; use the existing local SSH agent/key path or another owner-approved secret handoff.
- [ ] Linux distribution/version and whether Docker/Compose are already installed.
- [ ] Permission level: ordinary user with Docker access, or explicit approval for narrowly scoped administrator commands if installation/hardening is required.
- [ ] Host purpose confirmation: disposable/private staging, with no production or unrelated data in scope.
- [ ] Approved local gateway port (default `8080`) and SSH port.
- [ ] Minimum capacity expectation: 2 logical CPUs, 4 GiB RAM, and 20 GiB free workspace disk.
- [ ] Location for root-readable deployment secrets outside Git.
- [ ] Approved backup destination and encryption method. A database backup must never enter this repository.
- [ ] Log-retention period and who may access logs.
- [ ] Monitoring choice for the first soak: owner-observed private metrics only, or a separately approved private monitoring service and alert destination.

## Required credential decision

The Cloudflare token previously shared in chat must not be deployed. Before staging playback integration, the owner must revoke/rotate it and provide a narrowly scoped replacement through an approved secret channel. A Linux deployment may proceed without Cloudflare credentials only if the room remains truthfully `unavailable`/offline and media playback is excluded from that soak.

Synthetic account, database, and metrics secrets must be newly generated for staging. They must not reuse the repository placeholders or local development values.

## Exact approval statement

Fill the bracketed fields and send this statement when ready:

```text
I approve a private Linux staging deployment to [HOST] using SSH user [USER].
Use exact application-source commit 3d0b0ca6198785aded7203043d1a153ec7360c3e.
Keep the application bound to localhost and access it only through an SSH tunnel.
You may run the read-only host preflight and [may / may not] install or update Docker with narrowly scoped administrator commands.
Use [SECRET STORAGE METHOD] for newly generated staging secrets and [BACKUP METHOD] for encrypted backups.
Use [OWNER-OBSERVED PRIVATE METRICS / APPROVED MONITORING DESTINATION] during the soak.
Cloudflare playback is [excluded / approved with a rotated token supplied through APPROVED METHOD].
Do not change DNS, expose public ports, configure Cloudflare resources, or perform any public/commercial/compliance action.
```

## Codex execution sequence after approval

1. Verify the exact SSH target and run only `sh deploy/verify-host-prerequisites.sh` first.
2. Report host-preflight evidence and stop if minimums fail or permission scope is insufficient.
3. Fetch the owner repository, check out detached commit `3d0b0ca6198785aded7203043d1a153ec7360c3e`, and verify `git rev-parse HEAD` exactly matches it. Do not substitute the older tag or a moving branch name.
4. Create host-only staging configuration with newly generated secrets; run `npm run validate:production-env -- .env.production`, then validate Compose without starting services.
5. Build the digest-locked images and record the resulting application-image digests.
6. Start the localhost-bound stack, verify migrations, liveness, readiness, authentication, gateway isolation, and private metrics.
7. Create and encrypt a backup, restore it into a separate test database, and verify application readiness.
8. Run the private human acceptance pass and an agreed staging soak/load check without video traffic through the application server.
9. Exercise application rollback to the recorded source commit/image and confirm readiness; restore a database only into a separate database first.
10. Leave the host in the owner-approved running or stopped state and report every change, image digest, port, secret location (not value), backup location, result, and remaining risk.

## Staging exit evidence

- Host preflight passes.
- Exact release source and application-image digests are recorded.
- No public listener, DNS change, or unapproved external service exists.
- Migration, readiness, authentication, realtime, metrics isolation, backup/restore, and rollback pass on Linux.
- The agreed soak/load thresholds pass with resource measurements.
- Secrets and backups remain outside Git and browser payloads.
- Owner reviews the evidence before any broader access decision.
