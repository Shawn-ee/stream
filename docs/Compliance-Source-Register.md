# Compliance Source Register

Last reviewed: 2026-08-27. Sources are starting points for professional review, not a complete legal inventory. Owners must re-check current text and obtain qualified advice immediately before design sign-off and launch.

| Topic | Primary/official source | Why tracked |
|---|---|---|
| Provider child-safety reporting/preservation | [18 U.S.C. §2258A — U.S. House Office of Law Revision Counsel](https://uscode.house.gov/view.xhtml?req=%28title%3A18+section%3A2258A+edition%3Aprelim%29) | Actual-knowledge reporting, report contents, privacy, preservation and access controls |
| CyberTipline operations | [NCMEC CyberTipline data](https://ncmec.org/gethelpnow/cybertipline/cybertiplinedata) | Official operational context for public/ESP reports and removal notices |
| Performer recordkeeping | [DOJ §§2257/2257A resource](https://www.justice.gov/criminal/criminal-ceos/18-usc-2257-2257a-certifications) | Counsel coverage analysis for producer verification/recordkeeping/labeling |
| Nonconsensual intimate depictions | [FTC TAKE IT DOWN Act guidance](https://www.ftc.gov/business-guidance/resources/complying-take-it-down-act) | Covered-platform notice/removal process and effective obligations |
| Children's privacy | [FTC COPPA FAQs](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions) | Coverage, notice/consent, data rights, security, minimization and retention |
| California privacy | [California DOJ CCPA overview](https://oag.ca.gov/privacy/ccpa) | Consumer-rights and privacy-notice workflow planning |
| Texas online age verification litigation | [U.S. Supreme Court, *Free Speech Coalition v. Paxton*](https://www.supremecourt.gov/opinions/24pdf/23-1122_3e04.pdf) | Current constitutional posture relevant to counsel's Texas analysis |
| Payment/content eligibility | [Stripe prohibited/restricted businesses](https://stripe.com/legal/restricted-businesses) and [official FAQ](https://support.stripe.com/questions/prohibited-and-restricted-businesses-list-faqs) | Written-approval/no-go decision for content platforms, tokens and adult live chat |
| Hosted payment collection | [Stripe Checkout](https://docs.stripe.com/payments/checkout) | Hosted payment page and webhook-based order fulfillment boundary if Stripe approves the exact business |
| Webhook security and delivery | [Stripe webhooks](https://docs.stripe.com/webhooks) | Raw-body signatures, replay tolerance, duplicate and out-of-order delivery, asynchronous processing and retry behavior |
| Processor request idempotency | [Stripe API idempotent requests](https://docs.stripe.com/api/idempotent_requests) | Safe server retry design; local business idempotency remains separately required |
| Creator onboarding and payout data | [Stripe-hosted Connect onboarding](https://docs.stripe.com/connect/hosted-onboarding) and [payout-account collection](https://docs.stripe.com/connect/payouts-bank-accounts) | Minimize application handling of identity and bank data if an approved Connect configuration is available |
| Marketplace risk and negative balances | [Stripe Connect risk-management guidance](https://docs.stripe.com/connect/risk-management/best-practices) | Explicit responsibility, reserves, monitoring and connected-account risk decisions |

## Review protocol

At each commercial/legal milestone, record reviewer, date, source version/change, affected requirements, counsel conclusion, product decision, and next review date. A changed source reopens the linked gate. Do not encode legal conclusions solely from this table.
