# Account Recovery Design

## Status

Design only. Account recovery is not enabled, no email address is collected, and no external identity or mail service is connected.

## Intended user flow

1. A signed-out user enters a previously verified email address on a generic recovery form.
2. The API always returns the same response, whether or not the account exists, to prevent account enumeration.
3. If eligible, the server creates one random, single-use recovery token, stores only its SHA-256 hash, and sends a link through the approved mail provider.
4. The link expires after 15 minutes. Opening it does not authenticate the account by itself.
5. The user supplies and confirms a new strong password. The server atomically consumes the token, updates the scrypt password record, and revokes every existing session.
6. The user signs in again. A security event records the recovery without storing the raw token, email content, IP address, or password.

## Required data model

- A normalized verified-email record kept separately from public profiles.
- Verification timestamp and consent/privacy-policy version.
- Recovery token hash, user ID, expiry, consumed timestamp, and creation timestamp.
- Bounded account-security events for verification and completed recovery.

Raw recovery tokens must never be stored. Email addresses must never appear in public APIs, realtime events, analytics, logs, room data, or administrator list views without a separately justified support workflow.

## Security and abuse controls

- Constant public responses and similar timing for known and unknown accounts.
- Per-source and per-account issuance limits, global delivery limits, and short token expiry.
- One active token per account; issuing another invalidates the previous token.
- Single-use transactional consumption and full session revocation.
- CSRF protection on authenticated email changes; reauthentication before changing a verified address.
- No reset through display name, handle guessing, security questions, administrator balance controls, or creator status.
- Safe logs containing only outcome codes and internal event IDs.

## Activation gates

Recovery implementation may begin only after the owner approves:

1. collection and retention of real email addresses;
2. a privacy policy and deletion/export handling;
3. a transactional email provider, sending domain, templates, and secret storage;
4. deliverability, bounce, complaint, and abuse procedures;
5. recovery-specific security tests and an incident-response procedure.

Until those gates pass, the product must truthfully state that recovery is unavailable and advise test users not to use personal credentials.
