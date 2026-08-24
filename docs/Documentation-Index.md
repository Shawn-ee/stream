# Documentation Index

All published project documentation is Markdown so it remains searchable, reviewable, and diff-friendly on GitHub. Local Word working files are intentionally excluded from version control; the Markdown documents below are authoritative.

## Product and engineering control

- [`GOAL.md`](../GOAL.md) — launch-candidate target, product scope, completion evidence, and explicit owner approval gates.
- [`BACKLOG.md`](../BACKLOG.md) — completed product milestones and remaining owner-gated launch queue.
- [`DECISIONS.md`](../DECISIONS.md) — architecture, product, security, capacity, and operational decisions.
- [`CHANGELOG.md`](../CHANGELOG.md) — implementation and verification history.
- [`Harness-Engineer-Loop.md`](Harness-Engineer-Loop.md) — bounded feature-review and implementation loop.
- [`Autonomous-Development-Charter.md`](Autonomous-Development-Charter.md) — control-file and verification discipline.

## Setup and operations

- [`RUNBOOK.md`](../RUNBOOK.md) — local setup and verification commands.
- [`Deployment-Runbook.md`](Deployment-Runbook.md) — private Docker deployment, migrations, backup/restore, upgrade, rollback, and incident boundaries.
- [`Monitoring-Runbook.md`](Monitoring-Runbook.md) — protected metrics, initial 100-user thresholds, and response order.
- [`Release-Baseline-Checklist.md`](Release-Baseline-Checklist.md) — version-baseline review and publication safeguards.
- [`Private-Staging-Approval-Checklist.md`](Private-Staging-Approval-Checklist.md) — exact host inputs, recommended no-public-listener boundary, approval statement, and Linux evidence sequence.
- [`Launch-Acceptance-Checklist.md`](Launch-Acceptance-Checklist.md) — repeatable human acceptance pass across roles, languages, media states, and reset.

## Architecture and readiness evidence

- [`Staging-Prototype-Architecture.md`](Staging-Prototype-Architecture.md) — application/video boundary and staging topology.
- [`100-User-Deployment-Plan.md`](100-User-Deployment-Plan.md) — phased route from local product to limited launch decision.
- [`Production-Readiness-Audit.md`](Production-Readiness-Audit.md) — original findings and closure status.
- [`Deployability-Report.md`](Deployability-Report.md) — consolidated launch-candidate result, evidence, risks, and remaining approvals.
- [`100-User-Load-Report.md`](100-User-Load-Report.md) — thresholds, locked-container measurements, workload model, and limitations.
- [`Camera-Audio-Test-Report.md`](Camera-Audio-Test-Report.md) — owner-approved physical-device Cloudflare playback proof and limitations.
- [`Base-Image-Lock.md`](../deploy/Base-Image-Lock.md) — immutable official container foundation references and update policy.

## Publication rule

Do not add `.docx`, temporary Word lock files, local environment files, generated builds, media captures, database backups, or credentials to the repository. When a planning document changes, update the relevant Markdown authority above and include it in the normal staged review.
