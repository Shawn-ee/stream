# Production Moderation Architecture

> Engineering and operations design only; not legal advice and not a claim of compliance. No production moderation or evidence collection is active. Qualified U.S. counsel and counsel for every served jurisdiction must approve the final policy, workflow, retention schedule, and staffing model before launch.

## 1. Operating principles

1. Safety reports must never compete with ordinary product support.
2. A platform decision and a legal-reporting decision are separate, auditable decisions.
3. Preserve the minimum evidence needed for a defined purpose; do not duplicate harmful media into ordinary tickets or logs.
4. Moderators receive least-privilege, time-bounded access. Highly sensitive evidence uses a segregated queue, strong authentication, access reasons, and immutable audit events.
5. Automated signals may prioritize review but may not silently make irreversible high-impact decisions without a documented, counsel-approved exception and an appeal path.
6. Every enforcement action must identify the policy version, reason code, actor, affected object/account, timestamp, and appeal eligibility.

## 2. Roles and separation of duties

| Role | May do | Must not do alone |
|---|---|---|
| Community moderator | Triage chat/room reports; temporary mute/room restriction; preserve a case pointer | View restricted evidence; permanent creator ban; legal report |
| Trust & Safety analyst | Review ordinary evidence; temporary suspension; policy classification; appeal recommendation | Change policy; export evidence; make law-enforcement disclosure |
| Senior incident lead | Emergency disable; approve permanent action; coordinate active threats | Unilaterally disclose data or override preservation rules |
| Restricted-evidence specialist | Review counsel-approved CSAM/NCII/trafficking queue with recorded access reason | Copy media to tickets/devices; use material for training/QA |
| Legal/privacy liaison | Decide reporting/disclosure/preservation basis; process legal demands and privacy conflicts | Modify production evidence or operate without dual control |
| Security incident lead | Investigate compromise, insider access, and credential abuse | Reuse moderation evidence outside the incident purpose |
| Appeals reviewer | Independent second review with the original record and policy version | Be the sole original decision-maker for the appealed action |

Production accounts for these roles require phishing-resistant MFA, managed-device policy, no shared accounts, quarterly access review, and immediate offboarding. The current `admin` role is not sufficient for production.

## 3. Case and evidence model

A future moderation case should contain:

- case ID, source, reporter/account/room references, jurisdiction signals, timestamps, severity, policy code/version, and assigned queue;
- immutable action/audit entries with actor, reason, before/after state, and correlation ID;
- pointers to original content and provider object IDs, not copied media by default;
- evidence manifest with cryptographic hash, source, collection time, custody/access events, preservation basis and expiry;
- legal-report/preservation references stored separately from the ordinary moderator narrative;
- decision, notification template/version, appeal deadline/status, and independent appeal outcome;
- deletion hold and final disposal proof.

Never place credentials, full payment data, government-ID images, raw CSAM/NCII media, or unredacted legal requests in application logs, chat exports, analytics, or ordinary issue trackers.

## 4. Severity and response targets

| Severity | Examples for routing (not legal conclusions) | Initial target | Default containment |
|---|---|---:|---|
| P0 critical | Credible imminent danger; apparent child sexual exploitation; active trafficking/coercion; restricted-evidence leak | Immediate staffed escalation | Disable access/stream as needed; preserve pointers; restricted queue; legal/safety lead |
| P1 urgent | Nonconsensual intimate imagery request; credible threat; suspected minor/identity evasion; severe targeted abuse | Under 1 hour when staffed | Temporarily restrict content/account; protect reporter; senior review |
| P2 high | Repeated harassment; sexual solicitation; impersonation; fraud; ban evasion | Under 24 hours | Limit interaction or temporarily suspend based on policy |
| P3 standard | Spam; off-topic content; ordinary conduct disputes | Under 72 hours | Queue, rate limit, warn, or dismiss with reason |

These are product targets, not statutory deadlines. The FTC states that a covered platform's valid TAKE IT DOWN Act notice/removal workflow may require removal of nonconsensual intimate depictions and known identical copies within 48 hours; counsel must determine coverage and the exact clock/workflow before launch ([FTC guidance](https://www.ftc.gov/business-guidance/resources/complying-take-it-down-act)).

## 5. Critical incident playbooks

### Apparent child sexual exploitation

1. Stop ordinary handling; do not download, forward, or repeatedly view media.
2. Contain access using the least action that prevents further availability.
3. Route to the restricted-evidence specialist and legal liaison; record only safe descriptors and source pointers in the ordinary case.
4. Counsel determines whether the service is a covered provider with an actual-knowledge reporting duty and what must be included, preserved, or disclosed.
5. Use only the approved CyberTipline/provider workflow and trained staff; record report and preservation references without copying report contents broadly.
6. Lock preservation material in a segregated, monitored store and expire it only under the approved schedule/hold process.

Current federal text describes provider reporting duties after actual knowledge and a one-year preservation treatment for completed CyberTipline submissions, with restricted access to preserved material ([18 U.S.C. §2258A](https://uscode.house.gov/view.xhtml?req=%28title%3A18+section%3A2258A+edition%3Aprelim%29)). NCMEC describes the CyberTipline as receiving reports from the public and electronic service providers ([NCMEC CyberTipline data](https://ncmec.org/gethelpnow/cybertipline/cybertiplinedata)). Counsel must translate current law into the platform's exact procedure.

### Nonconsensual intimate depictions / deepfakes

1. Provide a plain-language victim notice channel that does not require a public account.
2. Authenticate the request only to the degree required; minimize sensitive documents.
3. Start the counsel-approved deadline clock, temporarily restrict when warranted, locate known identical copies using approved methods, and document each decision.
4. Notify the requester of receipt/outcome without exposing other users or investigative detail.
5. Preserve only what the approved legal/defense basis requires; separate abuse-prevention hashes from public content.

### Credible imminent harm

1. Escalate to the senior incident and legal leads without waiting for normal queue SLAs.
2. Preserve safe account/session/room pointers and current facts; do not invent identity or location confidence.
3. Use a counsel-approved emergency-disclosure/law-enforcement policy and dual control.
4. Record every disclosure field, recipient, legal basis, approvers, and later review.

## 6. Enforcement and appeals

Available future actions should be composable and scoped: content disable, chat slow mode, temporary room freeze, interaction restriction, test-wallet freeze, creator broadcast suspension, account suspension, or permanent removal. “Shadow bans” are excluded because they prevent meaningful notice and appeal.

Unless safety or law prohibits notice, the affected account receives the policy code/version, plain-language reason, scope/duration, evidence category (not sensitive evidence), and appeal route. Eligible appeals go to a reviewer who was not the sole original decision-maker. Restoration must reverse every dependent restriction transactionally and create an audit event; denial must record an independent rationale.

## 7. Data retention decision matrix

No production duration is approved yet. Counsel/privacy/security must fill and sign a matrix for: ordinary reports, dismissed reports, enforcement audit, appeals, restricted evidence, legal demands, statutory reports/preservation, identity/KYC records, payment/fraud records, chat, stream metadata, and account deletion. Each row needs purpose, data fields, system of record, access roles, default period, hold override, deletion method, user-rights handling, and proof of disposal.

“Keep everything” is prohibited. A legal hold may suspend deletion only for defined records and must itself be reviewed and released. Backups need documented expiry and non-restoration or post-restore deletion behavior.

## 8. Product/engineering work required before activation

- Replace the all-powerful local admin with explicit RBAC and dual-control actions.
- Add versioned policy reason codes, case states, assignments, appeal objects, immutable audit, and notification templates.
- Add dedicated high-severity reporting channels and an authenticated non-account victim request path.
- Add segregated encrypted evidence storage, malware-safe previewing, watermarking, access-purpose prompts, export prohibition, and anomaly alerts.
- Add enforcement consistency tests, queue/clock monitoring, on-call escalation, tabletop exercises, moderator wellness controls, and transparency metrics.
- Add privacy-request/retention integration so deletion, holds, moderation records, and reporting duties do not silently conflict.

## 9. Exit gate

This architecture may be implemented only after policy and data-flow review. Production moderation is not ready until trained staffed coverage, counsel-approved playbooks, role/access controls, auditable case/evidence systems, tested emergency paths, appeals, retention/deletion, vendor contracts, and an owner-signed launch checklist all exist.
