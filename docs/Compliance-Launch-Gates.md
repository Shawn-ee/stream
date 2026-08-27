# Compliance and Launch Gates

> Planning checklist only; not legal advice. English/Chinese UI does not establish where the service may lawfully operate. No jurisdiction—including the United States, Texas, California, or mainland China—is approved for launch by this document.

## Gate 0 — Fix the product and content model

Owner and counsel must freeze in writing:

- whether nudity, sexually explicit conduct, private shows, pay-per-view, one-to-one interaction, recorded content, or user uploads are allowed;
- whether the platform is merely hosting/transmitting, producing/directory-controlling content, or acting in multiple roles;
- viewer/creator countries and states, entity location, staff locations, data/storage locations, and excluded territories;
- age minimums by role/content/jurisdiction and whether minors are prohibited entirely;
- the token's legal/economic properties: closed loop, expiration/refund, transferability, redemption, creator earnings, fees, reserves, chargebacks, and unclaimed balances.

Changing any answer reopens legal, processor, identity, tax, privacy, and moderation review.

## Gate 1 — Jurisdiction and entity opinion

Qualified counsel must deliver a written matrix for each served jurisdiction covering entity/licensing, content/speech, age assurance, consumer protection, privacy/data transfer, recordkeeping, platform reporting, tax, employment/contractor, sanctions, payments/stored value/money transmission, and law-enforcement response. Bilingual availability must not be marketed into an unapproved territory. Geo-restriction and sanctions controls need tested fail-closed behavior.

For sexually explicit material, U.S. counsel must assess performer age/name verification, recordkeeping and labeling responsibilities under current federal law and regulations; DOJ describes §§2257/2257A requirements for covered producers ([DOJ resource](https://www.justice.gov/criminal/criminal-ceos/18-usc-2257-2257a-certifications)). If Texas users or a covered site are in scope, counsel must assess current age-verification obligations in light of the Supreme Court's 2025 *Free Speech Coalition v. Paxton* decision ([official opinion](https://www.supremecourt.gov/opinions/24pdf/23-1122_3e04.pdf)).

## Gate 2 — Age, creator eligibility, and consent

- Replace the test checkbox with a counsel-approved, jurisdiction-aware age-assurance design before restricted content is accessible.
- Approve a data-minimizing vendor/flow, accuracy and appeal path, accessibility, retention/deletion, security, breach allocation, and fallback behavior.
- Separately verify creator identity, age/eligibility, liveness/fraud as approved, sanctions, contracts/releases, performer/co-performer consent and records, and payout/tax identity.
- Define how guests/co-performers are approved before appearing and how consent withdrawal affects future distribution without falsifying historical/legal records.
- Prevent child-directed design and prohibit known minors if that is the approved model. The FTC's current COPPA guidance requires a coverage analysis and describes notice, consent, access/deletion, security, minimization and retention duties for covered services involving children under 13 ([FTC COPPA guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)).

No identity evidence is collected by the current prototype.

## Gate 3 — Terms, policy, and victim/safety channels

Counsel-approved English and Chinese versions (with a controlling-language rule) are required for Terms, Privacy Notice, Creator Agreement, Content/Community Policy, Token/Purchase Terms, Refund/Chargeback Policy, Copyright/Trademark process, Law-Enforcement Guidelines, Transparency principles, and appeals.

The public safety surface needs non-account channels for urgent danger, child safety, and nonconsensual intimate depictions. The FTC states that covered platforms must operate a plain-language notice/removal process under the TAKE IT DOWN Act ([FTC guidance](https://www.ftc.gov/business-guidance/resources/complying-take-it-down-act)). Production procedures must match the current law and counsel's coverage opinion.

## Gate 4 — Privacy and data governance

- Complete a field-by-field inventory, purpose/legal-basis matrix, processor/subprocessor register, cross-border transfer analysis, data protection impact/risk assessments, and retention/deletion schedule.
- Implement access/correction/deletion/portability/opt-out/appeal workflows as applicable, identity verification for requests, Global Privacy Control where required, and vendor deletion propagation.
- Separate account, identity/KYC, payment, moderation/evidence, support, analytics, and legal-hold data with least privilege.
- Prohibit advertising/tracking SDKs until separately reviewed; sensitive creator/viewer behavior must not become ad targeting data.
- Approve incident response, breach notification decision workflow, encryption/key management, vendor DPA/security terms, and privacy testing.

California's Attorney General describes consumer rights including know, delete, opt out of sale/sharing, correct, limit, and non-discrimination under the CCPA/CPRA framework ([California DOJ overview](https://oag.ca.gov/privacy/ccpa)). Counsel must determine applicability and implementation details.

## Gate 5 — Trust & Safety operations

Every exit item in `Production-Moderation-Architecture.md` must be evidenced: staffed roles, RBAC/MFA, restricted-evidence controls, report/case/appeal systems, critical playbooks, lifecycle clocks, audit, retention/disposal, training/wellness, tabletop exercises, vendor contacts, and independent review. The current demo admin/report system cannot satisfy this gate.

## Gate 6 — Processor and commercial feasibility

Do not assume Stripe can process this platform. Stripe's current official restricted-business materials list content-creation platforms as requiring additional due diligence and list adult content/services—including adult live-chat features—as prohibited ([Stripe restricted businesses](https://stripe.com/legal/restricted-businesses), [Stripe FAQ](https://support.stripe.com/questions/prohibited-and-restricted-businesses-list-faqs)).

Before any payment code or credential is activated, obtain written processor/acquirer approval for the exact entity, domains, countries, content categories, private shows, token economics, creator marketplace/tips, refund policy and payout model. Do not misclassify the business, route through an undisclosed merchant, or build a bypass. If the approved content model is incompatible with Stripe, the Stripe phase is a no-go; the owner must change the business model or obtain a lawful specialist arrangement reviewed by counsel. “Legal content” alone does not create processor eligibility.

The commercial design also needs counsel/accounting opinions on stored value/money transmission, marketplace/payfac structure, sales/VAT/GST and creator tax reporting; KYC/KYB/sanctions; reserves/negative balances; fraud/card testing; SCA/3DS where applicable; receipts/refunds/chargebacks; reconciliation; payout holds; dormant/unclaimed funds; complaint support; and financial audit/segregation.

## Gate 7 — Security, reliability, and vendors

- Independent application/cloud security review and remediation; production secrets/HSM or managed keys; MFA/RBAC; vulnerability/dependency process; penetration test; abuse/load tests; backup/restore and disaster recovery proof.
- Processor, identity/age, email, observability, support, media/CDN, moderation and evidence vendors approved for content, geography, privacy, security, deletion, subpoenas, breach terms and continuity.
- 24/7 critical-safety contact coverage if required by the risk model, plus payment/incident/on-call coverage and tested shutdown/rollback.
- Production dashboards and alerts must not expose media, credentials, government IDs, payment data, or restricted evidence.

## Gate 8 — Signed launch decision

Launch requires dated signatures/approvals from the owner, qualified jurisdictional counsel, privacy lead, Trust & Safety lead, security lead, payment/finance owner, and each critical vendor/processor where required. The packet must include the frozen business model, jurisdiction matrix, policies, data flows, vendor approvals, security evidence, moderation readiness, support staffing, payment/KYC/tax readiness, rollback plan, and known residual risks.

Any missing or conditional approval means no launch for the affected feature/jurisdiction. A local prototype, HTTPS domain, Cloudflare Stream account, or passing software test does not satisfy these gates.
