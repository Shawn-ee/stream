# Stream MVP - Autonomous Development Charter

## Revised product goal

Build a private, locally runnable bilingual Stripchat-inspired streaming-business prototype. It includes discovery/search/categories, streamer profiles, Cloudflare Stream playback, live-room chat and presence, follows, notifications, multi-value test gifts, wallet/history, creator studio controls, admin operations, and test-coin private shows using tickets or per-minute access. It must use original design/code/assets, keep Cloudflare secrets server-side, and start from a clean Docker-backed checkout. It must not process real payments/cashouts, real identity/KYC data, enforceable age verification, real authentication, or public production traffic.

## Autonomy model

Codex may work continuously inside the active milestone, run local Docker services, install normal development dependencies, create test data, run tests, improve documentation, and conduct read-only reference research in the user-provided Chrome session. Codex records every meaningful change and verification result in the project. It must stop only for an explicit safety gate, a failed reproducible verification it cannot resolve, or a decision that materially changes scope, cost, or legal/compliance exposure.

## Required project control files

Maintain these files as the control plane for all future sessions:

1. `GOAL.md` - fixed success criteria and exclusions.
2. `BACKLOG.md` - only the current milestone plus the next milestone, with ordered tasks and acceptance checks.
3. `DECISIONS.md` - dated decisions, alternatives, and rationale.
4. `RUNBOOK.md` - exact local start, reset, test, and Cloudflare verification commands.
5. `CHANGELOG.md` - milestone-level progress visible to the owner.

## Harness loop

For each small slice: read the goal and current milestone; inspect the existing system; make the smallest coherent change; run type checks, unit/integration tests, and a local browser smoke test; fix failures; update the control files; commit a local checkpoint only after the acceptance gate passes. Do not begin the next milestone until its predecessor passes its exit gate.

### Reference-derived feature loop

When the owner provides a reference browser, Codex first observes a feature read-only and posts a compact decision note: neutral feature description, P0/P1/P2/P3 priority, why it matters, simplified local version, verification plan, and implement/defer/exclude decision. In-scope test-only P0/P1 work may continue without routine approval; P2 goes to the backlog; P3 is excluded. The detailed procedure and reusable future-session prompt live in `Harness-Engineer-Loop.md`. The loop ends when the simpler coherent product is achieved, never at literal feature parity.

## Expanded milestones

| Milestone | Scope | Exit gate |
|---|---|---|
| 0. Control plane and foundations | Repo hygiene, Docker runbook, health checks, database schema/migrations, test harness, error/logging convention. | Fresh local setup succeeds; services healthy; checks pass; no secret is tracked. |
| 1. Demo identities and bilingual shell | Dummy audience/streamer/admin sessions; EN/ZH switch; test age acknowledgement; route protection. | All three roles can enter intended pages; no real auth or age-verification claim. |
| 2. Discovery and room experience | Streamer directory, profile card, room layout, responsive player shell. | Audience can discover and open a seeded live room locally. |
| 3. Cloudflare Stream integration | Server-side Stream client, configured test input, signed playback token flow, clear offline/error state. | A test broadcast can be viewed in the room without exposing API credentials. |
| 4. Real-time interaction | WebSocket chat, presence, rate limits, reconnect behavior, room-scoped events. | Two browser sessions exchange chat and show presence without duplicate messages. |
| 5. Demo gifts and ledger | Seeded test balances, gift catalog, append-only test ledger, UI animation/event. | Gift transfer is atomic, idempotent, auditable, and visibly updates the room. |
| 6. Admin moderation | Admin panel, mute/ban for test users, room controls, audit events. | Admin action takes effect in a separate audience session and is recorded. |
| 7. Quality and deployment rehearsal | Security review, accessibility smoke checks, backup/restore drill, Docker deployment guide, migration rehearsal. | A clean-machine local rebuild passes; production exclusions and launch blockers are documented. |

| 8. Product expansion | Search, follows, categories, schedules, notifications, and audience history. | Major discovery and retention workflows work with seed data. |
| 9. Private shows | Test-coin ticket and per-minute access, locked preview, timer, access enforcement, and ledger entries. | A non-paying viewer is locked; a paying test viewer enters; earnings are auditable. |
| 10. Creator/admin operations | Creator studio controls, goals, metrics, reports, review tooling, and moderation workflow. | A streamer/admin can operate the major prototype workflows end-to-end. |

## Mandatory safety gates

Stop and ask before: spending money or enabling paid Cloudflare features beyond the existing test plan; creating/changing DNS, public exposure, domains, firewall, or Linux production configuration; changing Cloudflare token scope; sending messages or creating accounts on third-party services; adding payments, cashout, KYC, persistent age verification, or public adult content; deleting non-test data; or changing the defined MVP goal.

## Reference research rule

The signed-in Chrome session may be used as a read-only reference for interaction patterns and observable network architecture. Never send messages, alter settings, purchase anything, save media, inspect private browser storage, copy proprietary source code, or bypass access controls. Record only high-level observations that affect product requirements.

## Nightly completion standard

A productive unattended session should complete the current smallest runnable slice, not chase the entire product. Before ending, Codex must leave the repo runnable, tests passing, the next task written down, and a short owner-facing summary with changed files, verification results, risks, and the exact next action.
