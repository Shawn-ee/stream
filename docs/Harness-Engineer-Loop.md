# Harness Engineer Loop

## Purpose

This is the operating loop for evolving the private, local Stream MVP toward a simpler, original streaming-business platform inspired by useful observable patterns in Stripchat. It is a product-development system, not permission to copy branding, assets, source code, or business operations.

## Reference browser boundary

The owner may keep a signed-in reference browser beside Codex. Codex may inspect only what is visible in the interface and browser developer tools as read-only reference material. It must never send a message, alter an account or setting, purchase anything, save media, inspect private browser storage, bypass controls, or copy proprietary code/assets.

## One feature loop

For each observed feature, Codex must complete this sequence before treating it as done:

1. **Observe** - Describe the feature in neutral product terms, without copying its implementation or visual assets.
2. **Classify** - Assign a priority and explain it in a short owner-facing note:
   - **P0 core:** required for a usable live-streaming workflow.
   - **P1 important:** materially improves discovery, creator operations, viewer retention, safety, or test monetization.
   - **P2 later:** useful refinement that does not block the simpler product.
   - **P3 exclude:** low value now or introduces legal, cost, privacy, security, payment, or launch risk.
3. **Propose the simplified version** - State what will be implemented locally, what is intentionally omitted, and the acceptance check.
4. **Decision gate** - Announce the classification and recommendation in Codex commentary. P0/P1 features already inside `GOAL.md` may proceed autonomously. P2 features are added to the backlog and deferred unless an active milestone selects them. P3 features are not implemented. Any feature affecting payments, cashout, identity, KYC, enforceable age checks, public exposure, Cloudflare spend/configuration, DNS, Linux production, or legal/compliance scope requires explicit owner approval.
5. **Build and verify** - Implement the smallest end-to-end test-only slice. Run relevant type checks, automated verification, and a local browser smoke check; fix failures before advancing.
6. **Record** - Add the priority, rationale, simplified scope, verification result, and next action to `BACKLOG.md`, `DECISIONS.md`, and `CHANGELOG.md` as appropriate.

## Owner-facing decision note

Before a new reference-derived P0/P1 feature is implemented, Codex should post this compact note:

```text
Reference feature: <neutral description>
Priority: P0 / P1 / P2 / P3
Why it matters: <one or two sentences>
Local simplified version: <what will be built, with explicit omissions>
Verification: <specific test or browser flow>
Decision: implement now / defer / exclude / owner approval required
```

This is an update, not a request for routine approval, when the feature is already in scope and test-only.

## Milestone and stop rule

The loop continues through P0 features and owner-selected P1 features until the platform reaches the target and phase exit gates in `GOAL.md`: a coherent, simpler product plus deployable 100-concurrent-user readiness. It never seeks literal Stripchat parity. Before any production deployment, real identity/payment flow, age/KYC, Cloudflare cost/configuration change, public exposure, or legal/compliance action, the loop pauses for explicit owner approval.

## Start prompt for a future Codex session

```text
Resume the Stream MVP Harness Engineer Loop. Read GOAL.md, BACKLOG.md, DECISIONS.md, RUNBOOK.md, CHANGELOG.md, and docs/Harness-Engineer-Loop.md. Use the adjacent reference browser read-only. For each new reference-derived feature, first post the owner-facing decision note with priority and a simplified local recommendation. Autonomously implement only in-scope P0/P1 test-only features, verify them, and update the control files. Do not make public, payment, identity, KYC, age-verification, Cloudflare-cost/configuration, DNS, Linux production, or legal/compliance changes without explicit approval. Stop when the simpler coherent product stop rule is met.
```
