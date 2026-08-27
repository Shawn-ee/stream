# Documentation Index

All published project documentation is Markdown so it remains searchable, reviewable, and diff-friendly on GitHub. Local Word working files are intentionally excluded from version control; the Markdown documents below are authoritative.

## Product and engineering control

- [`GOAL.md`](../GOAL.md) — launch-candidate target, product scope, completion evidence, and explicit owner approval gates.
- [`BACKLOG.md`](../BACKLOG.md) — completed product milestones and remaining owner-gated launch queue.
- [`DECISIONS.md`](../DECISIONS.md) — architecture, product, security, capacity, and operational decisions.
- [`CHANGELOG.md`](../CHANGELOG.md) — implementation and verification history.
- [`Harness-Engineer-Loop.md`](Harness-Engineer-Loop.md) — bounded feature-review and implementation loop.
- [`Autonomous-Development-Charter.md`](Autonomous-Development-Charter.md) — control-file and verification discipline.
- [`Non-Video-Completion-Plan.md`](Non-Video-Completion-Plan.md) — ordered application/account/safety/operations milestones independent from video delivery.

## Setup and operations

- [`RUNBOOK.md`](../RUNBOOK.md) — local setup and verification commands.
- [`Deployment-Runbook.md`](Deployment-Runbook.md) — private Docker deployment, migrations, backup/restore, upgrade, rollback, and incident boundaries.
- [`Account-Recovery-Design.md`](Account-Recovery-Design.md) — inactive recovery architecture, threat controls, data boundaries, and approval gates.
- [`Creator-Onboarding-Workflow.md`](Creator-Onboarding-Workflow.md) — test application, reasoned review, atomic offline provisioning, and production prerequisites.
- [`Audience-Retention-Design.md`](Audience-Retention-Design.md) — follow feed, structured schedules, lifecycle notifications, read state, and external-delivery boundary.
- [`Gift-Experience-Design.md`](Gift-Experience-Design.md) — bounded combos, accessible sound, premium motion, creator acknowledgement, and ledger invariants.
- Archived, out-of-scope background: [`Production-Moderation-Architecture.md`](Production-Moderation-Architecture.md), [`Compliance-Launch-Gates.md`](Compliance-Launch-Gates.md), and [`Compliance-Source-Register.md`](Compliance-Source-Register.md).
- Archived, out-of-scope background: [`Commercial-System-Design.md`](Commercial-System-Design.md), [`Money-Movement-Threat-Model.md`](Money-Movement-Threat-Model.md), [`Commercial-Activation-Checklist.md`](Commercial-Activation-Checklist.md), and [`Commercial-Processor-Scope-Questionnaire.md`](Commercial-Processor-Scope-Questionnaire.md).
- [`Test-Only-Product-Completion-Audit.md`](Test-Only-Product-Completion-Audit.md) — authoritative evidence for the revised four-phase, synthetic-coin-only product goal.
- [`Frontend-Modernization-Implementation-Map.md`](Frontend-Modernization-Implementation-Map.md) — audited frontend architecture, reuse boundaries, UX gaps, ordered responsive redesign and verification plan.
- [`Six-Phase-Completion-Audit.md`](Six-Phase-Completion-Audit.md) — archived audit from the superseded legal/commercial scope; not an active goal document.
- [`Monitoring-Runbook.md`](Monitoring-Runbook.md) — protected metrics, initial 100-user thresholds, and response order.
- [`Release-Baseline-Checklist.md`](Release-Baseline-Checklist.md) — version-baseline review and publication safeguards.
- [`Private-Staging-Approval-Checklist.md`](Private-Staging-Approval-Checklist.md) — exact host inputs, recommended no-public-listener boundary, approval statement, and Linux evidence sequence.
- [`Launch-Acceptance-Checklist.md`](Launch-Acceptance-Checklist.md) — repeatable human acceptance pass across roles, languages, media states, and reset.

## Architecture and readiness evidence

- [`Staging-Prototype-Architecture.md`](Staging-Prototype-Architecture.md) — application/video boundary and staging topology.
- [`100-User-Deployment-Plan.md`](100-User-Deployment-Plan.md) — phased route from local product to limited launch decision.
- [`Production-Readiness-Audit.md`](Production-Readiness-Audit.md) — original findings and closure status.
- [`Deployability-Report.md`](Deployability-Report.md) — consolidated launch-candidate result, evidence, risks, and remaining approvals.
- [`Launch-Candidate-Completion-Audit.md`](Launch-Candidate-Completion-Audit.md) — requirement-by-requirement evidence and the exact remaining owner-gated host proof.
- [`Linux-Staging-Deployment-Report.md`](Linux-Staging-Deployment-Report.md) — owner-approved private Linux deployment, host evidence, image IDs, restore proof, access boundary, and remaining risks.
- [`100-User-Load-Report.md`](100-User-Load-Report.md) — thresholds, locked-container measurements, workload model, and limitations.
- [`Camera-Audio-Test-Report.md`](Camera-Audio-Test-Report.md) — owner-approved physical-device Cloudflare playback proof and limitations.
- [`Base-Image-Lock.md`](../deploy/Base-Image-Lock.md) — immutable official container foundation references and update policy.

## Publication rule

Do not add `.docx`, temporary Word lock files, local environment files, generated builds, media captures, database backups, or credentials to the repository. When a planning document changes, update the relevant Markdown authority above and include it in the normal staged review.
