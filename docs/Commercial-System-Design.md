# Commercial System Design (Inactive)

Status: design-only; no payment credential, processor resource, real-money table, endpoint, checkout, token grant, creator balance, or payout is active.

This document is not legal, tax, accounting, PCI, sanctions, or payment-network advice and is not a claim of compliance. It describes a possible engineering boundary for professional review. Every activation stage requires the evidence in `Commercial-Activation-Checklist.md` and fresh written owner approval.

## Product and processor decision

- The user-facing action is **token purchase**, not “deposit.” Counsel and the approved processor must decide whether the proposed closed-loop token creates stored-value, money-transmission, refund, or consumer-protection obligations.
- Tokens are non-transferable, non-withdrawable closed-loop usage units unless an approved legal design says otherwise. A viewer cannot cash them out or transfer them to another viewer.
- The existing `test_ledger_entries`, demo balances, test gifts, and test actions remain synthetic and permanently separate. They must never be converted, copied, or reconciled into real-money records.
- Stripe is a **no-go** unless Stripe gives written approval for the exact disclosed entity, domain, countries, creator-content rules, live-chat, tipping, token, private-show, marketplace, and payout model. Stripe currently identifies creator platforms as review-required and adult content/adult live-chat as prohibited. The owner must not misclassify the business or bypass a processor restriction.
- A provider-neutral adapter may support an approved acquirer later. It may not be implemented with live credentials or resources without a separately approved activation stage.

## Accounting boundary and invariants

The real system uses an immutable, balanced, double-entry general ledger. Every journal must balance to zero in one currency's integer minor units before commit. Posted entries are never updated or deleted; corrections use linked reversal and replacement journals.

Minimum chart-of-account classes:

- operating cash and processor clearing;
- purchased-token liability;
- creator pending payable and creator available payable;
- platform fee revenue;
- processor fees;
- refunds and chargeback loss;
- creator reserve and negative-balance receivable;
- tax/withholding payable where professionally required;
- suspense for unreconciled exceptions.

Each journal records a stable business idempotency key, legal entity, currency, effective time, source event, configuration version, actor/system principal, and reversal linkage. Cross-currency entries are prohibited inside one journal. Exchange-rate and fee versions are immutable facts attached at transaction time.

### Design-only data model

No migration for these tables is authorized yet.

| Proposed table | Purpose and critical constraints |
|---|---|
| `money_accounts` | Legal-entity and currency-scoped ledger accounts; immutable identity and account class. |
| `money_journals` | One business transaction; unique idempotency/source keys, lifecycle, reversal links, version references. |
| `money_entries` | Signed integer minor-unit debits/credits; journal sum must be zero before atomic posting. |
| `purchase_orders` | Token pack, fiat amount/currency, purchaser, processor reference, and purchase state. |
| `processor_events` | Signed webhook inbox with provider event ID/type, payload hash, received/processed time, outcome, and retry status. |
| `token_grants` | Purchase-linked token lots and available/consumed/reversed quantity; never the accounting source of truth. |
| `creator_earnings` | Gift-linked pending/available/held/reversed payable projection derived from journals. |
| `payout_requests` | Owner, amount/currency, hold/review/approval state, processor reference, and immutable audit links. |
| `commercial_configuration_versions` | Effective-dated token packs, fee split, hold/reserve, terms, creator agreement, limits, and kill switches. |
| `reconciliation_runs` | Processor/ledger/settlement/bank comparison totals, variance, reviewer, evidence hash, and disposition. |

Database constraints, serializable or explicitly locked posting, and property-based balance tests must supplement application checks. Read models such as wallet and creator balance are projections; only posted journals determine value.

## State machines

Transitions are server-authorized, audited, monotonic where possible, and idempotent. Unknown states fail closed.

```text
Purchase order:
created -> checkout_pending -> paid
                           \-> failed
                           \-> expired
paid -> refunded | chargeback

Token grant:
pending -> available -> consumed
                    \-> reversed

Creator earning:
pending -> available -> held -> available
                    \-> paid
pending | available | held -> reversed

Payout request:
requested -> review -> scheduled -> paid
          \-> canceled
review | scheduled -> failed | canceled
paid -> reversed
```

Illegal transitions are rejected, logged without secrets, and routed to review. `paid` does not mean irreversibly settled; later disputes and chargebacks use compensating journals.

## Purchase and webhook flow

1. The authenticated server validates an enabled, versioned token pack and creates a local `purchase_order` with a unique business idempotency key.
2. A processor adapter creates a hosted checkout session using server-only credentials and a processor idempotency key. Prefer a processor-hosted page to reduce card-data scope.
3. The browser may redirect to checkout and later display “processing,” but the return URL never grants tokens and never marks the order paid.
4. A dedicated raw-body webhook endpoint verifies the provider signature and timestamp. IP allowlists may be defense-in-depth but are never the sole authentication.
5. The webhook inbox atomically deduplicates provider event ID and logical object/type, records a payload hash, and queues processing. Delivery order is not assumed.
6. The worker retrieves missing authoritative objects when needed, locks the purchase, posts one balanced journal, grants the token lot once, and records the result. Retries are safe and idempotent.
7. The UI reads the resulting local state; it does not trust client-supplied price, currency, quantity, processor state, or redirect parameters.

Provider secrets, payment-method data, onboarding evidence, and raw webhook bodies must not appear in browser payloads or normal logs. Secrets are server-only, least-privilege, rotated, separately scoped by environment, and covered by a tested revocation procedure.

## Gift-to-earning conversion

A real gift is a new commercial transaction, not an extension of the test-gift transfer:

1. lock/serialize the viewer wallet projection and validate token availability;
2. consume purchased-token liability for the exact server-priced gift;
3. create creator pending payable and platform fee revenue in the same balanced journal;
4. attach gift-catalog, platform-fee, currency/FX, terms, and creator-agreement versions;
5. publish the room celebration only after durable journal commit;
6. use the commercial transaction ID for retry-safe realtime presentation.

The fee split and economic ownership require accounting and legal approval. A gift animation cannot be evidence that money posted successfully.

## Refunds, disputes, and negative balances

- Counsel and the processor approve rules for unused tokens, partly consumed token lots, cancellations, minors, fraud, service failure, and statutory refunds.
- Refund and chargeback webhooks post compensating journals. They never delete token grants or earnings history.
- If consumed value cannot be reversed from an available creator payable, the creator moves to held/negative status, reserve or future earnings absorb the amount under an approved agreement, and manual review decides collection or loss treatment.
- The platform must choose and document processor negative-balance liability. Reserves, payout delay, velocity limits, and chargeback thresholds are versioned controls, not ad hoc operator edits.
- No workflow silently creates tokens, erases a liability, or permits a payout while an unresolved chargeback would make the payable negative.

## Creator onboarding and payouts

A creator may accrue or receive real value only after all applicable gates are satisfied: approved creator application, binding agreement, identity/business verification, age/eligibility evidence, tax collection, sanctions screening, processor capability status, payout destination, and Trust & Safety eligibility.

Prefer approved processor-hosted onboarding so raw bank/card and identity-document data is not stored by this application. Store only necessary provider IDs, status, requirements summary, timestamps, and audit references under an approved retention schedule.

Payout eligibility requires available—not pending—payable balance, minimum amount, configured hold period, reserve, no active compliance/risk hold, and unchanged payout destination past a cooldown. A payout uses dual approval for exceptional/manual release, processor idempotency, and an immutable journal. Purchase, gifting, and payout kill switches are independent; a stop does not delete or rewrite ledger history.

## Reconciliation and financial operations

Daily controls compare, per legal entity and currency:

1. signed processor events and authoritative processor objects;
2. purchase/refund/dispute/payout operational records;
3. balanced ledger journals and account balances;
4. processor settlement reports and clearing balance;
5. bank deposits/withdrawals when available.

Differences enter suspense, create a variance alert, and require named disposition. Operators cannot “fix” a variance by editing posted entries. Accounting exports carry journal IDs and evidence hashes. Month-end close, abandoned balances, unclaimed property, tax/VAT/GST/sales-tax treatment, creator reporting, and withholding need written professional decisions.

## Privacy, security, PCI, and resilience

- Use hosted payment and onboarding surfaces where an approved provider supports them; never store raw card or bank details.
- Apply strict CSP, CSRF/session controls, server-side authorization, dependency/SCA review, encryption, access logging, separation of duties, backup/restore, and disaster-recovery exercises.
- Redact payment/KYC/tax details from logs and support tooling. Restrict evidence by role and record every access where required.
- Process webhooks asynchronously after signature, replay-window, and duplicate checks; account for retries and out-of-order delivery.
- Use transactional outbox/queue semantics so a committed journal cannot lose its downstream notification and a retry cannot double-post.
- Monitor ledger imbalance attempts, webhook backlog, reconciliation variance, negative balances, payout failures, provider capability changes, and kill-switch state.

## Rollout sequence and exit gate

1. Counsel, processor/acquirer, privacy, security, Trust & Safety, tax/accounting, and finance approve the exact written model.
2. Owner gives fresh approval for a provider sandbox using synthetic identities and test values only.
3. Implement tables, adapter, state machines, property/fault tests, reconciliation, and kill switches; complete security review.
4. Owner separately approves a controlled internal real-money cents test after processor written approval and production readiness.
5. Run a capped, jurisdiction-limited pilot with manual reconciliation and conservative payout holds.
6. Launch only after the signed checklist has no conditional or missing approval.

Until that exit gate passes, the current application remains test-coin only. No credentials, processor resource, real checkout, token purchase, payout destination, or money movement may be created.
