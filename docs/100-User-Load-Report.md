# 100-Concurrent-User Local Load Report

## Result

The 100-concurrent-active-user application target is demonstrated on the local digest-locked production-style Docker topology as of 2026-08-24. The final run used the locked Node, Nginx 1.30.4, PostgreSQL, and Redis manifests through the localhost gateway. This is evidence for the API, PostgreSQL, Redis, and realtime path; Cloudflare Stream carries video separately and no broadcast was started.

## Predefined thresholds

- 100 authenticated WebSocket clients connected in steps of 10, 25, 50, and 100.
- Zero unexpected WebSocket disconnects.
- Login p95 at or below 1,500 ms.
- Discovery, room reads, and offline playback authorization p95 at or below 750 ms.
- Realtime room join p95 at or below 1,500 ms; chat acknowledgement p95 at or below 1,000 ms.
- PostgreSQL pool never exceeds 20 and has no waiters after the workload settles.
- API RSS at or below 512 MiB and CPU at or below two single-core equivalents during the measured workload.
- Redis memory at or below 128 MiB.
- A ten-way identical action-purchase race produces one mutation, nine safe duplicates, and one exact wallet debit.
- An audience session is denied access to administrator operational metrics.

## Production-container evidence

| Measure | Observed | Threshold | Result |
|---|---:|---:|---|
| Connected WebSockets | 100 | 100 | Pass |
| Unexpected disconnects | 0 | 0 | Pass |
| Login p95 | 58 ms | 1,500 ms | Pass |
| Discovery p95 | 40 ms | 750 ms | Pass |
| Room read p95 | 40 ms | 750 ms | Pass |
| Offline playback authorization p95 | 45 ms | 750 ms | Pass |
| Realtime join p95 | 93 ms | 1,500 ms | Pass |
| Chat acknowledgement p95 | 47 ms | 1,000 ms | Pass |
| PostgreSQL pool | 20 total, 0 waiting | max 20, 0 waiting | Pass |
| API RSS | 160 MiB | 512 MiB | Pass |
| API CPU | 126% of one core | 200% | Pass |
| Redis memory | 1 MiB | 128 MiB | Pass |
| Duplicate purchase race | 1 write + 9 duplicates | exactly once | Pass |
| Cross-role probe | audience denied | denied | Pass |

## Workload model

The repeatable suite logs in 100 synthetic audience sessions with bounded concurrency, grows active room connections gradually, performs discovery and room reads, requests playback authorization while the room is offline, sends 20 bounded chat messages, verifies presence, exercises an idempotent action purchase under contention, reads safe operational counters, and disconnects cleanly. `npm run db:seed` resets the named demo records afterward.

Run it with:

```powershell
npm run db:seed
npm run verify:load:100
npm run db:seed
```

The release-grade reproducible command is:

```powershell
npm run verify:load:production:100
```

It owns the localhost-bound production-style stack for the duration of the check, uses the digest-locked images, resets disposable demo data, and shuts down without removing named volumes.

## Interpretation and limits

This proves the measured local application workload, not unlimited scale and not 100 simultaneous video transcodes. It uses repeated sessions for synthetic accounts rather than 100 unique people, a small seeded dataset, one active room, one local machine, and a short observation window. Internet latency, Cloudflare plan limits, a chosen Linux host, sustained multi-hour traffic, TLS overhead, database growth, backup I/O, and failure recovery under load require a private staging soak after owner approval.
