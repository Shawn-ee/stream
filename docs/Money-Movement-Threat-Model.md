# Money Movement Threat Model (Design Only)

Status: inactive planning. This is not legal, financial, PCI, fraud, sanctions, or accounting advice and is not a claim of compliance. It authorizes no credential, processor resource, real-money code path, identity collection, or payout.

## Protected assets

- cash, processor clearing, token liability, creator payable, reserves, revenue, and tax balances;
- immutable balanced ledger and reconciliation evidence;
- account sessions, payment and payout authorization, processor credentials, webhook secrets, and signing keys;
- creator/customer identity, tax, sanctions, bank, dispute, and moderation information;
- platform availability, processor reputation, and the safety of creators and viewers.

## Trust boundaries

Browser, API, database, queue/worker, admin console, processor, creator onboarding/KYC provider, tax vendor, bank, support staff, Trust & Safety, finance, and deployment operators are separate trust zones. Browser success URLs, realtime events, email, screenshots, support claims, and administrator-entered amounts are not authoritative payment evidence.

## Required abuse controls

| Threat | Required prevention/detection/response before activation |
|---|---|
| Card testing and purchase velocity | Processor risk tooling, per-account/device/network velocity with privacy review, step-up/decline rules, generic errors, rate limits, and alerting. |
| Account takeover | Strong authentication/recovery, session revocation, sensitive-action reauthentication, payout-change notification/cooldown, and support identity procedure. |
| Webhook forgery or replay | Raw-body signature and timestamp verification, unique event/logical-object dedupe, payload hash, asynchronous inbox, least-privilege endpoint, and no IP-only trust. |
| Duplicate or partial financial work | Stable business and provider idempotency keys, atomic balanced posting, unique constraints, outbox, retry/fault tests, and immutable reversals. |
| Price/currency manipulation | Server-owned versioned catalog, integer minor units, server-calculated totals, no client authority, and currency-scoped journals. |
| Self-gifting and creator/viewer collusion | Linked-account/device/payment/payout analysis with privacy review, velocity/relationship signals, reserve/hold, investigation trail, and appeal. |
| Refund/chargeback abuse | Token-lot provenance, pending earnings, payout delay, reserve, negative-balance policy, dispute evidence, and compensating journals. |
| Payout destination takeover | Processor-hosted collection, reauthentication, change cooldown, multi-channel notice, risk hold, dual review for exceptions, and no raw bank storage. |
| Insider theft or unauthorized adjustments | Least privilege, separation of support/T&S/finance/deployment, dual approval, immutable audit, no direct ledger edit, and periodic access review. |
| KYC/sanctions evasion | Approved provider checks, capability/requirements monitoring, country and identity consistency review, ongoing rescreening policy, and payout hold. |
| Minor or ineligible creator | Approved age/identity workflow, evidence access controls, re-verification triggers, immediate hold/escalation, and jurisdiction-specific counsel review. |
| Prohibited content monetization | Enforced content policy, trained moderation, processor-approved business model, transaction/room linkage, rapid kill switches, evidence preservation, and no processor misclassification. |
| Reconciliation suppression | Automated processor-ledger-settlement-bank comparison, suspense, immutable variance, independent reviewer, close checklist, and escalation thresholds. |
| Secret or personal-data exposure | Server-only secrets, rotation, vault/host controls, strict redaction, hosted payment/onboarding, retention schedule, incident response, and tested revocation. |
| Availability/ransomware | Backups, restore drills, queue recovery, provider outage states, read-only ledger recovery, independent purchase/gift/payout switches, and no unsafe replay. |

## High-risk operation matrix

| Operation | Requester | Independent control | Durable evidence |
|---|---|---|---|
| Commercial configuration activation | Product/finance | owner + finance + compliance approval | signed version and effective time |
| Manual token/ledger correction | finance | second finance approver | reversal/replacement journal and reason |
| Release compliance/risk hold | T&S/compliance | finance confirms payout effect | case link and release decision |
| Exceptional payout | creator/operations | finance dual approval | eligibility snapshot and provider result |
| Payout destination change | creator | reauthentication + cooldown | provider status and notices |
| Kill-switch change | incident commander | named owner review after containment | actor, reason, time, scope, recovery evidence |
| Production credential rotation | security/operator | second operator verification | secret version, rollout, revocation test |

No one person may both invent and approve a value-bearing manual adjustment. Database administrators must not use direct writes as a business process.

## Detection and response priorities

1. Protect people: stop prohibited or harmful monetization and preserve mandated evidence.
2. Stop further value movement with the narrowest safe kill switch; payout can stop while refunds remain operable.
3. Preserve processor events, journals, logs, configuration versions, and case evidence without copying sensitive data into chat/tickets.
4. Reconcile the exposure by entity/currency/account and identify every affected customer/creator.
5. Notify the named legal/privacy/processor/security owners under approved incident rules.
6. Restore only after the root cause, compensating journals, control test, and named approval are recorded.

## Test strategy before any real-money pilot

- property tests prove every posted journal is balanced and conservation holds across purchase, gift, refund, dispute, earning, reserve, and payout;
- state-machine tests reject every illegal and repeated transition;
- fault injection covers timeout before/after provider success, duplicate/out-of-order webhook, queue redelivery, database rollback, partial provider outage, and stale reads;
- authorization tests cover every role, object owner, hold, approval, and configuration version;
- security tests cover signature/replay, CSRF, session fixation, ATO recovery, secret/log redaction, and privilege escalation;
- reconciliation fixtures cover missing, duplicated, late, reversed, cross-day, fee, refund, chargeback, payout failure, and bank variance cases;
- synthetic fraud exercises cover card testing, self-gifting, collusion, refund abuse, payout change, sanctions hit, and insider adjustment;
- restore tests prove the ledger, inbox, outbox, and audit trail recover without double movement.

## Threat-model exit gate

Security, finance/accounting, privacy, Trust & Safety, counsel, processor/acquirer, and the owner must accept named residual risks and remediation evidence. Any missing or conditional approval means no activation. A fresh owner approval is required for sandbox setup and again for every first real-money test, pilot, and launch stage.
