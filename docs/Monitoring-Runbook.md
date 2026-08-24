# Monitoring and Alerting Runbook

## Private metrics boundary

The API exposes Prometheus text metrics at `/internal/metrics`. It requires `Authorization: Bearer <METRICS_TOKEN>`. The production web gateway does not proxy `/internal`, so the endpoint is reachable only from the API container network unless an operator explicitly changes that boundary.

`METRICS_TOKEN` must contain at least 32 characters in production and must come from the host secret store or ignored production environment file. Never place the token in a scrape URL, source code, browser bundle, or logs.

Example from an approved monitoring process on the private container network:

```text
GET http://api:3001/internal/metrics
Authorization: Bearer <secret supplied by the monitoring system>
```

The endpoint returns `Cache-Control: no-store`. Missing or incorrect credentials return `401`.

## Available signals

- HTTP request, error, rate-limit, and cumulative-duration counters.
- Readiness failure counter.
- Current and total realtime connections plus realtime error counter.
- Accepted chat-message counter.
- PostgreSQL total, idle, waiting, and pool-error signals.
- API resident memory and uptime.
- Redis used memory and connected client count.

The local administrator metrics view remains a protected human-readable diagnostic surface. It is not a substitute for automated scraping.

## Initial alert thresholds for the 100-user target

Use a one-minute scrape interval and require sustained breaches to avoid transient alerts:

| Signal | Warning | Critical |
|---|---:|---:|
| `/ready` unavailable | 1 minute | 3 minutes |
| HTTP 5xx ratio | >2% for 5 min | >5% for 5 min |
| PostgreSQL pool waiting | >0 for 2 min | >5 for 1 min |
| API resident memory | >400 MiB for 10 min | >512 MiB for 5 min |
| Realtime connections | >110 for 5 min | >125 for 2 min |
| Realtime error increase | >5/min for 5 min | >20/min for 2 min |
| Rate-limited mutations | >20/min for 10 min | >100/min for 5 min |
| Redis memory | >96 MiB for 10 min | >128 MiB for 5 min |
| Database pool error increase | any | >2 in 5 min |

These are conservative launch-candidate thresholds derived from the measured 100-user baseline. Recalibrate only after a longer soak on the approved staging host.

## Response order

1. Check `/health` to distinguish a dead process from dependency unavailability.
2. Check `/ready`, PostgreSQL health, Redis health, and the pool waiting/error signals.
3. Check HTTP error/rate-limit growth and realtime error/disconnect behavior.
4. Preserve logs and request IDs; never paste cookies, bearer tokens, passwords, Cloudflare tokens, or stream keys into an incident record.
5. If a recent application change caused the incident, follow `Deployment-Runbook.md` and return to the recorded known-good image/revision.
6. Restore a database only from a verified backup into a separate database first.

## Local verification

```powershell
npm run verify:security
npm run verify:logs
npm run verify:resilience
```

The resilience verifier temporarily stops and restarts only the local Compose Redis and PostgreSQL services. It asserts that liveness stays up, readiness fails closed with `503`, both dependencies recover, and outage counters increase. It never removes volumes.

No monitoring provider, alert destination, email, message, or public endpoint is configured by this repository. Choosing and connecting those services is an owner-approved private-staging operation.
