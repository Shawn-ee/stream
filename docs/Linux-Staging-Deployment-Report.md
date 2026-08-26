# Linux Launch-Candidate Deployment Report

## Outcome

On 2026-08-26, the owner approved and the launch candidate was deployed to an owner-controlled Linux virtual machine. The original deployment was private; the current Stream web gateway is published at `https://holiwyn.online` through the separately managed Cloudflare Tunnel. Cloudflare Stream handles video delivery separately. No real payment, identity provider, KYC, or compliance system was added.

The existing applications on the host were not restarted or modified. Stream remains in its isolated project directory and uses the separate Compose project `stream-launch-candidate`.

## Exact source and host admission

- Current application source: `6aa776def4b6f13da7d4ad237e6f9732aaa6caa5` on local branch `main`. The initial deployment used `e1f64ad73e26792a84a94460afba50e0e16d5db3`.
- Host: Ubuntu 20.04.6 LTS virtual machine, Linux AMD64.
- Admission result: 8 logical CPUs, 11,964 MiB memory, 52 GiB free workspace disk, Git 2.25.1, Docker 26.1.3, Docker Compose 2.27.1, synchronized clock, and private gateway port available.
- Production environment: mode `600`, generated distinct random secrets, public HTTPS origin through Cloudflare Tunnel, and an existing configured Cloudflare Stream Live Input.
- Published gateway: `127.0.0.1:8080` only.

The initial immutable tag remains historical and was not moved. The deployment uses the later exact application commit because it contains the production-environment, supply-chain, broadcast, and creator-cockpit hardening.

## Browser-native Quick Go Live deployment

The owner-approved inactive upgrade moved the public launch candidate to `6aa776def4b6f13da7d4ad237e6f9732aaa6caa5` using a reviewed GitHub push and fast-forward-only Linux pull. It did not request camera/microphone permission or start a Cloudflare broadcast.

- Host-only rollback artifacts were created at `backups/pre-quick-go-live-20260826T230203Z.*`: database dump SHA-256 `6ea1f137ef13e0bc18ec770b5d5857ea20a576973e3f554b864c195e88717a51`, empty tracked-source patch SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`, project archive SHA-256 `15a4d09c10895a390090badeefb41eedff1ece0104c2f346a796eb91aee73482`, and state record SHA-256 `088f09b73fee42d493f57a4cdc05f28d575d6beccb1920b21f1519d9fea13ffc`.
- An earlier database-only rollback dump at `backups/pre-quick-go-live-20260826T230128Z.dump` was also retained, validated with the PostgreSQL 16 restore tool, and restricted to mode `600`; SHA-256 `17c99c4e97da1e90b1af2f60ddbf756375e209564cee664c55677fcbeae3ebd2`.
- Migration `012_browser_quick_live.sql` applied and the `broadcast_transport` column plus `broadcast_sessions` table were verified.
- Only the Stream API and web containers were recreated. PostgreSQL, Redis, Cloudflare Tunnel, and the unrelated Odoo containers were not recreated or restarted.
- Current images are migration `sha256:0c511e59c4d1a5a0806fee55ff08d73ad41867b93e80951472fe1024b4a3f133`, API `sha256:ee49399b27d1d509f98921b9b583dd747ea02febbb25445cad6285eb7a948444`, and web `sha256:c2d8aabcea4ebca9c5efcf81e37672a7c6953ee282568ac5b077a7ae8dbe1263`.
- Production readiness remained fail-closed and secret-safe. Creator Studio reported browser Quick Go Live available while retaining `obs_hls` as the reset default. The existing Live Input reported HTTPS WHIP and WHEP capability in a read-only check; provider URLs were withheld.
- `https://holiwyn.online` returned HTTP 200 through Cloudflare, served the new Quick Go Live bundle, and returned `Permissions-Policy: camera=(self), microphone=(self), geolocation=()`. A read-only browser smoke test loaded the bilingual sign-in shell with no console errors.
- Synthetic demo data was reset after deployment. Physical camera/audio WHIP-to-WHEP proof remains a separate owner-confirmed acceptance test.

## Creator cockpit public upgrade

The owner-approved upgrade moved the public launch candidate to `2a0ac1ef1a7ad6c52f573a3b530944a75ee7d4ee` using a reviewed GitHub push and a fast-forward-only pull on Linux.

- Recovery artifacts were created before the pull and kept outside Git in the host-only `backups` directory: database dump SHA-256 `3d5b63582ab025d22f2476e2bbfb34203850416a8c7bc5fa3f75557afbad53a6`, tracked-source patch SHA-256 `953b2228d9051c050dda075fc193970d3feb7a7ba905f88dedd72aeec394f4cd`, and project-tree archive SHA-256 `3b54be3968b3eca7b75465d22d1f99148c195f5deee322bbdae3388d743106be`.
- The pre-upgrade tracked source changes remain available in the host recovery stash `pre-creator-cockpit-github-upgrade`; it was not reapplied because the reviewed commit contains the intended changes.
- Ordered migrations completed, then only the Stream API and web containers were recreated. PostgreSQL, Redis, Cloudflare Tunnel, and the unrelated Odoo containers were left running.
- Current application images are API `sha256:a3fe6128ec32e74515e832113654a8a7641d8ea70d0991704bb7a1320b97e844` and web `sha256:91b2fe9255d4ab95b126e724bce95993f68e1db149a09c3ccceefd94d3810354`.
- API and web are healthy with zero restart counts. PostgreSQL and Redis remain healthy. The three Odoo containers remained running after the upgrade.
- The synthetic demo dataset was reset. The production readiness verifier confirmed the configured creator, truthful offline lifecycle, fail-closed playback, absent fake-live production route, and no Stream credential exposure.
- The public origin returned HTTP 200 and served the new Creator Studio/Live Session application bundle.

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

## Individual-account upgrade evidence

The first private in-place upgrade moved the application from `e1f64ad73e26792a84a94460afba50e0e16d5db3` to `e32058df1abc76c08e0bdc041206fa7a98f81c8c` without recreating PostgreSQL or Redis and without touching the separate Odoo Compose project.

- A mode-`600` pre-upgrade custom-format backup was created at the ignored host-only backup path. SHA-256: `ab0249f1d0de9765900d80c8a40f3f054bbb489f5cef99ec93f5bb2e7a61aeee`.
- The backup restored into the exact disposable database `stream_mvp_restore_check`, where four users and two rooms were verified; the disposable database was then removed.
- Migration `011_individual_accounts.sql` and index `users_handle_casefold_unique_idx` are present on the active database.
- Current API image: `sha256:48978b765bb14841927a8803d87166e3a718979b9df306897478ffa406a823e4`.
- Current web image: `sha256:a927e4f2c019d11fd248b360735bb00a5b0b287c67ba29cb1bcf1c41758ffb2b`.
- All four Stream services are healthy with zero restart counts after the upgrade; PostgreSQL and Redis retained their original container images.
- A generated temporary audience account registered through the SSH-tunneled Linux gateway, retained its identity through session and age acknowledgement, stored a password hash, remained audience-only, and was deleted. The database returned to four synthetic users and two rooms.
- English and Chinese registration views rendered successfully through `http://localhost:18080/`.

The guarded operator's initial-deployment `plan/start` path currently treats the live Stream-owned gateway port as a host conflict, so it cannot directly perform an in-place upgrade. The upgrade therefore used the same validated Compose file and secret environment after a guarded read-only verification, followed by explicit `build` and `up -d`. Add an upgrade-aware operator action before the next host upgrade.

## Private staging data

Although the launch-candidate URL is public, the application remains a test-only environment with no public customer identity system. It contains only the predefined synthetic accounts, two test rooms, fake gifts/actions, and test coins. Audience, streamer, and administrator authentication passed using the randomly generated host-only test password. No real user, payment, payout, KYC, or age-verification data was added.

Two mode-`600` PostgreSQL custom-format backups were created under the ignored host-only `work/staging-backups` directory:

- Pre-seed schema backup: SHA-256 `4a7d3c005aebf8b07444b7d3cab0e8f34569159a6c5e1dc53940d7b7258bf76a`.
- Post-seed staging backup: SHA-256 `cc7682a75523ef9d1919cef329786359d2439d4c4fd0bed2434ecc3cf06139fb`.

Each backup was restored into the exact disposable database `stream_mvp_restore_check`, verified, and removed. The post-seed restore contained four users and two rooms. Backups did not enter Git.

## Access

The primary browser URL is `https://holiwyn.online`. Cloudflare Tunnel forwards that hostname to the Linux gateway, which remains bound to `127.0.0.1:8080`; the gateway is not exposed directly on the VM network. An operator may still use an SSH tunnel to `localhost:18080` for private diagnostics.

## Remaining limitations and gates

- Ubuntu 20.04 is outside standard support; upgrade or extended security maintenance is required before any broader or long-lived production use.
- Backups currently remain on the same VM. Encrypted off-host backup storage is not yet configured.
- The host observation was short. No 100-user load test was run on this shared host because it could compete with another application; the separate local digest-locked 100-user evidence remains authoritative.
- Cloudflare Stream is configured and its lifecycle is verified, but each physical camera/microphone broadcast remains an owner-started action that consumes Stream resources.
- Public DNS/TLS and Tunnel routing are active. External monitoring/alerts, real identity, payments/cashout, KYC/age enforcement, and legal/compliance readiness remain incomplete.
- The previous Stream source and application-image IDs are now recorded as a rollback target, but an intentional rollback was not exercised because the upgrade passed. The operator still needs an upgrade-aware guarded action.
