# Commercial Activation Checklist

Status: no-go / design-only. This checklist is not legal, tax, accounting, sanctions, PCI, or financial advice and is not a claim of compliance. Checking a box does not itself authorize activation. Missing, expired, conditional, or scope-mismatched evidence means **no activation**.

## Scope record

- [ ] Legal entity, merchant of record, contracting parties, domain, product name, content policy, countries served, viewer/creator eligibility, token terms, tipping/gifting, private-show behavior, refunds, and payout flow are frozen in a versioned scope document.
- [ ] The user-facing term “token purchase” and closed-loop/nontransferable/nonwithdrawable behavior have written counsel and accounting treatment; “deposit” is not used casually.
- [ ] Production and sandbox environments, legal entities, currencies, configuration versions, and data-retention jurisdictions are mapped.
- Evidence owner: product owner. Required approvers: owner, counsel, finance/accounting.

## Processor and banking approval

- [ ] Processor/acquirer gives written approval for the exact disclosed entity, domain, countries, creator-content rules, live chat, token, tipping, private-show, marketplace, refund, chargeback, and payout model.
- [ ] Stripe is treated as no-go unless the exact model receives written approval; no business/content misclassification, alternate merchant coding, undisclosed domain, or restriction bypass is permitted.
- [ ] Merchant-of-record, Connect/marketplace configuration, charge type, fee payer, negative-balance liability, reserves, settlement timing, and payout responsibility are signed off.
- [ ] An approved provider-hosted checkout and creator onboarding/KYC/payout-destination approach is selected; this application will not store raw card or bank data.
- Evidence owner: finance lead. Required approvers: processor/acquirer, banking partner where applicable, counsel, finance, owner.

## Legal, policy, privacy, and tax

- [ ] Every served and operated jurisdiction has a dated professional memo covering adult/minor rules as applicable, content, contracts, age/identity evidence, consumer/refund law, stored value/money transmission, marketplace liability, sanctions, privacy, records, and reporting.
- [ ] Binding viewer token terms, creator agreement, privacy notice, content policy, prohibited conduct, refunds/disputes, appeals, and victim/reporting channels are approved and operational.
- [ ] Privacy impact assessment defines KYC/tax/payment data minimization, role access, processors/subprocessors, transfers, retention/deletion, requests, breach response, and audit.
- [ ] Sales/use/VAT/GST, creator information reporting, withholding, unclaimed property, revenue recognition, liability classification, FX, and month-end close have written tax/accounting treatment.
- Evidence owner: counsel/privacy/tax leads. Required approvers: counsel, privacy, tax adviser, controller/CPA, owner.

## Trust & Safety and creator eligibility

- [ ] `Production-Moderation-Architecture.md` exit gate is met with trained named coverage, case/evidence system, critical playbooks, appeals, escalation contacts, retention, and response targets.
- [ ] Approved creator identity, age/eligibility, KYC/KYB, tax, sanctions, agreement, payout, reverification, and offboarding workflows are implemented and exercised.
- [ ] Prohibited-content monetization can be stopped promptly; room, transaction, journal, creator, viewer, and moderation evidence can be lawfully correlated by authorized staff.
- Evidence owner: Trust & Safety lead. Required approvers: T&S, counsel, privacy, processor, owner.

## Financial engineering and security

- [ ] The immutable balanced double-entry ledger, state machines, separate real/test ledgers, versioned economics, compensating reversals, and database constraints pass independent review.
- [ ] Signed, replay-safe, idempotent, duplicate/out-of-order-safe webhook inbox is authoritative; browser redirects never grant tokens.
- [ ] Refund, chargeback, reserve, hold, negative-balance, reversal, and payout-failure behavior passes property, transition, concurrency, and fault-injection tests.
- [ ] Daily processor-to-ledger-to-settlement-to-bank reconciliation, suspense, variance alerts, accounting exports, and close runbook pass with synthetic fixtures.
- [ ] Threat model controls for card testing, account takeover, self-gifting, collusion, refund abuse, payout changes, sanctions, insider risk, and recovery have evidence.
- [ ] Hosted payment/onboarding, PCI responsibility, CSP, authorization, secret management/rotation, SCA, encryption, audit, backups/restores, incident response, and redaction pass security review.
- Evidence owner: engineering/security/finance. Required approvers: security, finance/controller, privacy, external reviewer where required, owner.

## Operations and customer support

- [ ] Purchase, gifting, and payout have independent tested kill switches; refunds and evidence preservation remain possible during containment.
- [ ] Support can explain pending/failed/paid/refunded/chargeback states without seeing prohibited secrets or altering ledger records.
- [ ] Finance and T&S have documented separation of duties, dual approvals, access review, on-call ownership, reconciliation calendar, payout review, dispute response, and incident exercises.
- [ ] Capacity, monitoring, alerts, recovery-point/recovery-time objectives, provider outage handling, and rollback are tested for the approved pilot size.
- Evidence owner: operations lead. Required approvers: support, T&S, finance, security, owner.

## Staged authorization record

Each row requires a new written owner approval after all prior-stage evidence is attached. An approval for one row does not authorize the next.

| Stage | Allowed scope | Required evidence and signers | Status |
|---|---|---|---|
| Design review | Documents and offline models only | owner, counsel, finance, privacy, security, T&S | Current stage only |
| Provider sandbox | Synthetic identities and test values; no real money | written processor feasibility + implementation plan + fresh owner approval | Not authorized |
| Internal cents test | Named internal testers, fixed cap, no public access | full engineering/security gate + processor production approval + finance reconciliation + fresh owner approval | Not authorized |
| Capped pilot | Approved jurisdiction/cohort/caps/holds/manual review | legal/T&S/privacy/tax/operations sign-off + successful cents close + fresh owner approval | Not authorized |
| Launch | Only exact approved scope | every checklist item, named accountable owners, signed launch record + fresh owner approval | Not authorized |

## Explicit current result

No Stripe or alternative processor credential, product, price, checkout session, webhook endpoint, connected account, KYC record, bank account, real token, payout, migration, or real-money test is authorized. No credentials or resources may be changed. The current prototype must remain test-coin only until this checklist is fully evidenced and the applicable stage receives fresh explicit owner approval.
