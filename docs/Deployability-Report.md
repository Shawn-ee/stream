# Launch-Candidate Deployability Report

## Outcome

The repository is a secure, reproducibly packaged private launch candidate for the existing bilingual streaming product, and its application layer has passed a local 100-concurrent-user gate. It is not approved for public launch and does not claim legal, payment, identity-verification, KYC, age-verification, or adult-content compliance.

## Completed capabilities

- Original English/Chinese audience discovery, truthful room lifecycle and authorized Cloudflare playback boundary.
- Realtime room presence/chat, test gifts/actions/goals/private access, creator cockpit, moderation, reports, and administrator review.
- Scrypt-hashed synthetic credentials, opaque hashed/expiring/revocable server sessions, strict cookies, CSRF checks, and session-derived WebSocket roles.
- Central JSON-schema validation for critical financial-simulation and moderation mutations, bounded bodies/lists/events, mutation and realtime limits, security headers, safe errors, strict origin/proxy settings, and banned/cross-role enforcement.
- A 20-connection PostgreSQL pool, capacity indexes, Redis Socket.IO adapter, cluster-aware presence, and two-process realtime proof.
- Production-oriented API/web images, localhost-only Compose topology, one-shot migrations, dependency-aware readiness, structured logs, graceful shutdown, placeholder-only environment template, and reverse-proxy/TLS boundary.
- Tested disposable PostgreSQL backup/restore and repeatable 100-user load suite.
- Protected machine-readable operational metrics, credential-redacted JSON logging, predefined 100-user alert thresholds, and verified PostgreSQL/Redis outage recovery.

## Verification evidence

- Full Cloudflare-free staging gate.
- Repeatable production-Compose build, migration sequencing, dependency health/readiness, internal-metrics isolation, localhost gateway, and graceful shutdown smoke test.
- Repository and built-web-container checks proving browser artifacts contain no local environment files or server-only credential variable names.
- A repeatable human browser acceptance checklist spanning all three roles, English/Chinese, truthful playback, creator operations, administrative boundaries, and deterministic reset.
- Owner-approved physical camera/microphone proof through the existing Cloudflare Live Input: current-state lifecycle, signed audience authorization, audio/video playback tracks, automatic stop, and offline recovery.
- Focused authentication, security, schema, lifecycle, realtime, two-process realtime, expanded workflow, build, deployment-start, backup/restore, and 100-user checks.
- Fresh-volume, random-secret, digest-locked production-container load result: 100 connected sockets, zero unexpected disconnects, all p95 targets passed, 20 pooled database connections with zero settled waiters/errors, 160 MiB RSS, 121% single-core-equivalent CPU, 1 MiB Redis memory, and exactly-once handling of a ten-request duplicate race.
- All Node/Nginx/PostgreSQL/Redis foundations are multi-architecture digest-locked; the web gateway uses official stable Nginx 1.30.4, and a verifier rejects floating image references.
- The npm lockfile is restricted to HTTPS registry artifacts with SHA-512 integrity, production install scripts are pinned to the two exact reviewed esbuild versions, an offline CycloneDX SBOM gate runs in staging, and the latest online production-dependency audit reported zero known vulnerabilities.
- Synthetic demo data reset after verification.

## Operational requirements

- A supported Linux host with Docker/Compose, adequate CPU/RAM/disk, private secret storage, encrypted off-host PostgreSQL backups, log retention, and an approved TLS terminator.
- Run the repository's read-only Linux admission check before secrets or services are placed on the approved host; the minimum is 2 logical CPUs, 4 GiB RAM, and 20 GiB free workspace disk.
- Exact production origin and trusted-proxy configuration.
- A completed host-only environment file that passes the fail-fast production validator: distinct strong secrets, internally consistent database/Redis URLs, explicit private HTTPS or localhost-tunnel origin, strict file permissions, and complete-or-disabled Cloudflare credentials.
- Managed availability/error/resource monitoring and alert routing.
- A private staging soak on the intended host, followed by restore and rollback drills there.
- Cloudflare Stream plan and live-input review only after explicit owner approval.

## Known limitations and unresolved risks

- Synthetic local accounts are production-shaped test identity, not a real customer account lifecycle. Email/OAuth, recovery, verification, deletion/export, MFA, and credential-abuse operations are not implemented.
- The load proof is short, local, single-room, and uses repeated synthetic account identities; it is not a multi-hour internet soak with a production-sized dataset.
- External monitoring/alert delivery, encrypted off-host backup storage, managed secrets, TLS certificates, and host hardening cannot be proven without an approved target environment. The scrape format, authentication boundary, signals, and alert thresholds are ready for that integration.
- The immutable historical baseline is commit `8aa41bf688336c1f8a0a8478e69d556d094477b5` with annotated tag `stream-launch-candidate-0.1.0`. The current local application-source candidate is commit `e1f64ad73e26792a84a94460afba50e0e16d5db3`, which adds environment, dependency-supply-chain, guarded private-staging-operator, and aligned host-admission hardening. It still requires publication approval and is not tagged; application-image digests must be recorded after an approved staging build so host rollback identifies both source and deployed images.
- Physical camera/microphone and actual Cloudflare signed audio/video tracks are verified. OBS-specific UI and a human visual/audio quality assessment remain unverified because OBS is not installed and the in-app browser blocked a fresh localhost reload during the short live window.
- The previously shared Cloudflare test token must be revoked/rotated before any deployment. No token was used or modified in this work.
- Payments/cashout, enforceable age verification, KYC, privacy/compliance policy, content governance, and jurisdiction-specific legal readiness remain intentionally excluded.

## Owner-approval gates remaining

1. Approve a specific private Linux staging host and secret/TLS/monitoring approach before any deployment action.
2. Separately approve and obtain professional direction for real identity, payments, age/KYC, content policy, privacy, and legal/compliance work before public launch.

Use `Private-Staging-Approval-Checklist.md` for the recommended localhost-bound SSH-tunnel option and the exact information/authorization required for item 1.

The 100-user local application-readiness claim is demonstrated. Public-production readiness is not claimed until the remaining owner-gated evidence and operational controls are completed.
