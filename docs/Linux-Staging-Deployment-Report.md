# Private Linux Staging Deployment Report

## Outcome

On 2026-08-26, the owner approved and the launch candidate was deployed to an owner-controlled private Linux virtual machine. The deployment remains reachable only through an SSH tunnel; no public listener, DNS record, TLS certificate, Cloudflare resource, payment service, identity provider, or compliance system was created or changed.

The existing applications on the host were not restarted or modified. Stream was installed in a new isolated subdirectory and uses the separate Compose project `stream-launch-candidate`.

## Exact source and host admission

- Application source: `e1f64ad73e26792a84a94460afba50e0e16d5db3` in detached-HEAD state.
- Host: Ubuntu 20.04.6 LTS virtual machine, Linux AMD64.
- Admission result: 8 logical CPUs, 11,964 MiB memory, 52 GiB free workspace disk, Git 2.25.1, Docker 26.1.3, Docker Compose 2.27.1, synchronized clock, and private gateway port available.
- Production environment: mode `600`, generated distinct random secrets, private SSH-tunnel origin, and Cloudflare Stream disabled.
- Published gateway: `127.0.0.1:8080` only.

The initial immutable tag remains historical and was not moved. The deployment uses the later exact application commit because it contains the production-environment, supply-chain, guarded-operator, and host-admission hardening.

## Deployment evidence

- Digest-locked API and web images built successfully on the Linux host.
- PostgreSQL and Redis foundations use the reviewed digest locks.
- Ordered database migration exited successfully.
- PostgreSQL, Redis, API, and web services became healthy.
- API readiness and authenticated private metrics passed.
- The web gateway health endpoint returned HTTP 200 through the SSH tunnel.
- `/internal/metrics` remains unavailable through the web gateway.
- All four Stream containers reported zero restarts during the initial stability observation.
- The separate existing Compose project remained running.

Recorded application image IDs:

- API: `sha256:b292dfb47604d983e38511dfd42dc5fbded4e5480bbebe37e71b94894f2f0df0`
- Web: `sha256:1d717f152b1ff137c3e2bdb9c1c8b250749c2b8d8e34d2b790b6df78b016ab1d`

## Private staging data

Because this is a private test environment with no public customer identity system, the owner-approved staging instance contains only the four predefined synthetic accounts, two test rooms, fake gifts/actions, and test coins. Audience, streamer, and administrator authentication passed using the randomly generated host-only test password. No real user, payment, payout, KYC, or age-verification data was added.

Two mode-`600` PostgreSQL custom-format backups were created under the ignored host-only `work/staging-backups` directory:

- Pre-seed schema backup: SHA-256 `4a7d3c005aebf8b07444b7d3cab0e8f34569159a6c5e1dc53940d7b7258bf76a`.
- Post-seed staging backup: SHA-256 `cc7682a75523ef9d1919cef329786359d2439d4c4fd0bed2434ecc3cf06139fb`.

Each backup was restored into the exact disposable database `stream_mvp_restore_check`, verified, and removed. The post-seed restore contained four users and two rooms. Backups did not enter Git.

## Access

The Windows operator uses a local SSH tunnel from `localhost:18080` to the Linux gateway at `127.0.0.1:8080`. The browser URL is `http://localhost:18080/`. Closing the SSH tunnel removes access without stopping the Linux containers.

## Remaining limitations and gates

- Ubuntu 20.04 is outside standard support; upgrade or extended security maintenance is required before any broader or long-lived production use.
- Backups currently remain on the same VM. Encrypted off-host backup storage is not yet configured.
- The host observation was short. No 100-user load test was run on this shared host because it could compete with another application; the separate local digest-locked 100-user evidence remains authoritative.
- Cloudflare Stream is disabled on Linux. Enabling playback requires a rotated, narrowly scoped token and fresh owner approval.
- No public exposure, DNS, public TLS, external monitoring/alerts, real identity, payments/cashout, KYC/age enforcement, or legal/compliance readiness is approved.
- The first deployment has no prior Stream application image to exercise as a rollback target. Source/image identifiers and verified database backups are recorded for the next upgrade drill.
