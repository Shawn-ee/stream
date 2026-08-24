# Container Base-Image Lock

The launch-candidate container foundations are locked to multi-architecture OCI index digests. Tags remain as human-readable version context; Docker resolves the immutable digest.

| Purpose | Locked reference |
|---|---|
| Node build/runtime | `node:24-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43` |
| Web gateway | `nginx:1.30.4-alpine@sha256:97d490c12ba55b4946b01546d1c3ed324e8d41ab1c9fcb2a616aa470620e5b46` |
| PostgreSQL | `postgres:16-alpine@sha256:cf78e76683b9ca8c5733cbbdce6c9262b45b6767934dd0a95e671f9a0fc20685` |
| Redis | `redis:7-alpine@sha256:ff02b58f971e7d7d156a1267e283fcbbeee91773b6aa36c49dac28ecfe28eadf` |

Lock review date: 2026-08-24. The official multi-architecture manifests include both Linux AMD64 and ARM64 variants. The Nginx base was moved from the old 1.27 series to the official stable 1.30.4 Alpine image before locking.

Digest locks intentionally prevent silent base-image drift. Updating a lock is a maintenance change: inspect the official image metadata and release notes, change the tag and digest together, rebuild the production package, run the complete staging/production/backup/load gates appropriate to the change, and create a new reviewed release identifier. Never update only a tag while retaining an unrelated digest.
