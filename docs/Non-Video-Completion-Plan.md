# Non-Video Product Completion Plan

## Objective

Finish the website, application APIs, realtime interaction, account controls, moderation, and private Linux operations independently from Cloudflare Stream. Video ingest, transcoding, and delivery remain a separate provider integration and do not block the milestones below.

The current product already includes discovery, room chat and presence, gifts and actions using test coins, contribution goals, private-show access rules, follows and notifications, creator session controls and insights, administration, secure server sessions, Docker packaging, and measured 100-active-user application capacity.

## Ordered milestones

### 1. Individual audience onboarding — completed locally

- Self-service handle, display-name, and password registration for audience accounts.
- Case-insensitive unique handles, scrypt password hashing, server sessions, CSRF protection, registration throttling, and forced audience-only role.
- English/Chinese registration interface with a clear warning not to enter real personal information in staging.
- Independent age-acknowledgement identity and zero initial test-coin balance.

Exit evidence: focused registration verifier, complete staging gate, bilingual browser smoke test, and deterministic cleanup.

### 2. Account lifecycle and profile controls — completed locally

- Change display name, locale, and password after verifying the current password.
- Revoke all sessions and present understandable account-security feedback.
- Define account deletion/export behavior before collecting real personal information.
- Keep email verification, password-reset delivery, OAuth, MFA, and real customer data behind an approved identity-provider/privacy milestone.

### 3. Creator onboarding and room provisioning — completed locally

- Let an audience account submit a test-only creator application without uploading identity documents.
- Give administrators a bounded approve/reject workflow with audit records.
- On approval, transactionally create the creator profile and one offline room; never permit self-assigned creator/admin roles.
- Keep KYC, identity verification, tax forms, payout setup, and public creator onboarding excluded until separately approved.

### 4. Interaction and safety completion

- Add user block/unblock behavior to chat and discovery projections.
- Add notification read state and practical empty/error/reconnect handling.
- Complete creator moderation persistence and admin account suspension/reinstatement tests.
- Keep coins, gifts, actions, and private access explicitly test-only until a real-money design is approved.

### 5. Private Linux operational proof

- Upgrade the isolated Stream Compose project using an exact reviewed commit.
- Repeat migration, readiness, synthetic login, backup/restore, and rollback-safe image recording.
- Run a longer private soak without load-testing the shared host alongside unrelated services.
- Plan an Ubuntu supported-release upgrade and off-host encrypted backups separately; do not change the host or other workloads without owner approval.

## Explicitly separate work

- Cloudflare Tunnel, DNS, TLS/public exposure, and Cloudflare Stream are not required for private application development and require fresh approval before configuration.
- Real payments, deposits, payouts, cashout, KYC, enforceable age verification, content-policy decisions, and legal/compliance claims are not part of this plan.
- A public commercial launch is not implied by completing these milestones.

## Stop condition

The non-video application is complete when individual audience accounts and approved creator accounts can safely use the full website workflow; administrators can operate account/content controls; all application tests pass; and the exact build is reproducibly healthy on the private Linux staging deployment. Video provider activation and public launch remain separate decisions.
