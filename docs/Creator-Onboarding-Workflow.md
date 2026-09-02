# Creator Onboarding Workflow

## Status

Historical creator-application workflow retained for migration context. The current server-authoritative onboarding and administrator-review design is documented in `Creator-Onboarding-State-Architecture.md`. Creator onboarding does not classify rooms and never creates a room through navigation.

## Applicant flow

1. An authenticated audience account submits a category, public bio, proposed schedule, and motivation.
2. Only one pending or approved application may exist for an account. A pending application may be withdrawn.
3. A rejected application displays the administrator's non-sensitive reason and the audience member may submit a revised application.
4. Approval invalidates all of the applicant's existing sessions. The applicant signs in again and receives the new creator role.

## Administrator flow

1. An administrator sees the pending queue and the applicant's submitted public-facing details.
2. Every decision requires a reason.
3. Rejection preserves the audience role and records an audit event plus an applicant notification.
4. Approval runs in one database transaction: it locks the application/account, creates exactly one creator profile and offline room, changes the role, records the decision/audit event and notification, and revokes the applicant's sessions.
5. A repeated or concurrent decision fails without provisioning a second profile or room.

## Provisioning boundary

The provisioned room is truthful and inactive: `status=offline`, `broadcast_state=offline`, and no Cloudflare Live Input is assigned. Media activation remains a separate owner-controlled workflow. Handles are immutable and become the initial room slug; public profile and room metadata can later be edited in Creator Studio.

## Future production gates

Before accepting real creators, the owner needs professionally reviewed creator terms, content policy, privacy notice, eligibility and jurisdiction rules, identity/KYC vendor decisions where legally required, appeal/support operations, data-retention controls, and payout/tax onboarding. None of those are implied by this local workflow.
