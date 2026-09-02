# Creator Onboarding and Review Architecture

## Capability and side-effect boundary

A creator is an audience user with additional server-authorized capabilities. Creator status never removes discovery, viewing, following, audience chat, wallet, notification, category, or public-profile access. `creator_accounts.status`, not `users.role` or a browser boolean, controls Studio and broadcasting.

Opening a menu, GET route, onboarding page, `/studio`, refresh, or browser history creates no creator profile, room, broadcast, wallet entry, follow, or notification. `POST /api/creator/onboarding/start` explicitly starts a private draft; activation finalizes the creator profile but creates no room. Only `POST /api/studio/rooms` creates a private room draft. Publication and broadcasting remain separate commands.

The visible order is:

`AUDIENCE → ONBOARDING_PROFILE → ONBOARDING_AGREEMENT → ONBOARDING_IDENTITY → READY_FOR_REVIEW → PENDING_REVIEW → APPROVED → ACTIVE`

`REJECTED` and `SUSPENDED` block creator capabilities but preserve audience access. Migration 025 maps incomplete migration-024 identity-first records to the agreement step and does not demote existing active creators.

## Agreement and document receipt

The immutable agreement identifier is `creator-agreement-v1`. The user must submit two unchecked declarations: age 18+ and acceptance of the Creator Agreement and Community Rules. The server records user, version, signer, timestamp, declarations, and audit reference. Renewal enforcement is deferred while versioned records preserve the path to it.

There is intentionally no external identity provider and no automated authenticity verification. `UPLOADED`, `REVIEWED`, and identity verification are separate concepts; this milestone never labels an upload “verified.” Accepted documents are passport, national ID, and driver license; content must be PDF, JPEG, or PNG up to 8 MiB.

The API validates magic bytes, ignores the client filename for storage, generates a random reference, calculates a checksum, and encrypts bytes with AES-256-GCM before writing a mode-600 private file. Ordinary responses never include storage references. Replacement supersedes rather than overwrites history. Only an administrator with `creator_document.view` can create a single-use 60-second viewing grant; every grant/decision is audited and the private path is never logged.

Production requires `IDENTITY_DOCUMENT_STORAGE_PATH` and a base64 32-byte `IDENTITY_DOCUMENT_ENCRYPTION_KEY`; startup fails closed without them. The Compose service uses a dedicated persistent volume. A future approved retention process should remove superseded/rejected files while retaining non-sensitive audit evidence. Malware scanning and automated retention are deferred until that infrastructure exists.

## Activation and administration

Activation rechecks the profile, current immutable agreement, both declarations, a current `UPLOADED`/`REVIEWED` document, and restrictions transactionally and idempotently. `CREATOR_AUTO_APPROVAL=true` records pending, approved, and active states with `activation_method=AUTOMATIC`; false stops at `PENDING_REVIEW`. The client cannot choose the flag.

Permissions are `creator_review.read`, `creator_review.decide`, `creator_document.view`, and `creator_access.suspend`. Queue results are metadata-only and detail does not preload documents. Review, re-upload, approval, rejection, suspension, and reactivation are authorized, state-validated, idempotent, audited, and safely notified. A re-upload request does not suspend an active creator by itself. Suspension/rejection blocks creator capability without deleting audience access or history.

Studio’s avatar menu exposes **Discover Live**, returning to `/discover` without sign-out or privilege loss. Migration 024 remains the foundation; migration 025 adds declarations, encrypted-document metadata/history, activation/review metadata, permissions, and decisions. The suspicious-resource audit view remains available and no old data is automatically deleted.

Run `npm run verify:creator-onboarding` and `npm run verify:staging`. Google OAuth, external verification, agreement renewal, malware scanning, and automated retention are explicitly deferred.
