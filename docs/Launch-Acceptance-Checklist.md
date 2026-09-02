# Private Launch-Candidate Acceptance Checklist

## Purpose

Use this checklist to repeat the human browser acceptance pass for the private bilingual launch candidate. It complements automated checks; it does not replace security, load, backup/restore, or deployment verification and does not authorize public exposure.

Record the date, tester, build or commit identifier when one exists, browser/version, and any failed item. A release candidate passes only when every required item below passes and demo data is reset afterward.

## Preparation

- [ ] Use only the disposable local environment at `http://localhost:5173`.
- [ ] Confirm `.env` is local and ignored; never copy its values into this record.
- [ ] Run `npm run db:seed` and `npm run verify:staging` successfully.
- [ ] Open a fresh browser profile or sign out between roles so one role's session cannot mask another.
- [ ] Confirm the page identifies itself as a local/test product and does not imply real money, identity verification, or age verification.

## Entry, identity, and bilingual shell

- [ ] Invalid credentials fail with a safe message and do not reveal whether an account exists.
- [ ] Audience, creator, and administrator synthetic accounts each sign in only with their configured local password.
- [ ] Signing out removes access to the authenticated UI; refreshing does not restore a revoked session.
- [ ] The test age acknowledgement appears before role features and remains clearly labeled as non-enforceable test behavior.
- [ ] Switch English to Chinese and back on entry and after sign-in; headings, role names, controls, state labels, empty states, and errors remain understandable with no broken glyphs or clipped primary actions.

## Audience workflow

- [ ] Discovery loads seeded creator cards with title, ordered language labels, public tags, schedule, follower count, and truthful `live`, `connecting`, `offline`, or `unavailable` state.
- [ ] Search plus multi-language and tag filtering return coherent results, persist in the URL, and recover when filters are cleared; no country flags appear.
- [ ] Entering the room shows the creator profile, schedule, current broadcast state, goal, recent support, chat, gifts, and Support / Actions panel.
- [ ] Offline, connecting, and unavailable states never display fake playback. Live state displays only the authorized Cloudflare player.
- [ ] A chat message appears in the room in realtime and a muted viewer receives a visible rejection rather than a false success.
- [ ] One test gift and one active action purchase produce distinct feedback, decrement only test coins, update goal/support activity in realtime, and do not duplicate when the same operation is retried.
- [ ] Follow, report, notification/history, and private-show locked/access-expiry states are understandable and remain test-only.
- [ ] No wallet balance, transaction identifier, private creator metric, Cloudflare secret, or infrastructure error is exposed in public room activity.

## Creator workflow

- [ ] Creator Studio opens directly to the Live Session cockpit rather than a dense administration table.
- [ ] The cockpit shows truthful stream state, last refresh, audience/presence, chat, recent support, test earnings, goal progress, and top supporter.
- [ ] Room title, one primary plus no more than two additional languages, public tags, and goal changes persist and appear in the audience experience.
- [ ] An action can be created, edited, reordered, activated/deactivated, and then appears or disappears correctly for the audience.
- [ ] Gift and action support update creator insights in realtime and remain visibly separated.
- [ ] Creator chat reaches the room; participant mute/unmute changes enforcement without granting broader administration access.
- [ ] OBS guidance states that camera/microphone selection occurs in OBS, gives no secret, and explains offline/connecting/live/unavailable states.
- [ ] Private-show configuration remains test-coin simulation and cannot initiate payment or payout.

## Administrator workflow

- [ ] Administrator can review synthetic accounts, room lifecycle/check time, reports, moderation history, and the read-only test ledger.
- [ ] Report review and room moderation create visible audit history and do not expose credentials or Cloudflare errors.
- [ ] The ledger distinguishes gifts, actions, and private access; it provides no balance adjustment, payment, cashout, export, or deployment control.
- [ ] Audience and creator sessions cannot open administrator or another creator's protected data/actions.

## Media proof — fresh owner approval required

- [ ] Skip this section unless the owner gives explicit confirmation immediately before the test.
- [ ] Follow the owner-assisted procedure in `RUNBOOK.md`; use only the existing approved Cloudflare Live Input and do not change Cloudflare configuration.
- [ ] Confirm camera video and microphone audio through the signed audience playback path, then manually stop the encoder.
- [ ] Confirm the room returns offline, the audience player is hidden, and no encoder process remains.

The 2026-08-24 approved physical-device run proved encoded camera video, microphone audio, signed HLS playback tracks, and offline recovery. The 2026-08-26 approved browser-native repeat additionally proved WHIP ingest, server-signed WHEP negotiation for creator/self-monitor and an isolated audience, real 640×480 playback with an advancing unmuted media clock, realtime ended behavior, provider disconnect, and demo reset. A new release needs a new media run only when media-related code/configuration changes or the owner requests a human quality check.

## Operational evidence and closeout

- [ ] `npm run verify:release-preflight` passes with no staged files and no real environment/credential material proposed for version control.
- [ ] Production-Compose, backup/restore, resilience, and 100-user evidence are current for the candidate; rerun the applicable verifier when related code/configuration changed.
- [ ] No public listener, DNS record, Linux host, external monitoring route, payment, identity provider, email, KYC, or legal/compliance state was changed during acceptance.
- [ ] Run `npm run db:seed` after the browser pass and confirm the demo audience returns to 500 test coins with baseline room data.
- [ ] Record failures in `BACKLOG.md`; do not declare the candidate accepted with an unresolved P0/P1 failure.

## Result record

```text
Date:
Tester:
Browser/version:
Build/commit/tag (if available):
Automated staging result:
Human browser result: PASS / FAIL
Media retest performed: YES / NO (approval reference if YES)
Demo reset confirmed: YES / NO
Failures or notes:
```
