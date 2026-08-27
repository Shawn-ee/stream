# Gift Experience Design

## Implemented test-only behavior

- **Combos:** repeated purchases of the same gift by the same viewer in the same room join a ten-second chain. The persisted count includes batched quantity, is serialized with a room/viewer/gift lock, and is capped at 10,000.
- **Accessible sound:** audience and creator controls are off by default and require a deliberate click. Enabled cues are short Web Audio tones generated locally; no audio asset, tracking request, autoplay assumption, or third-party media is used.
- **Premium motion:** celebration and premium tiers use original CSS presentation. Premium gifts temporarily use the full media overlay. `prefers-reduced-motion` removes animation while keeping the semantic live-region announcement.
- **Creator acknowledgement:** the room owner can thank a received gift once. The acknowledgement is persisted, ownership-protected, and emitted as a minimal room-scoped realtime event. It does not alter the ledger or create a private message.

## Financial boundary

Gift prices, wallet entries, and creator receipts remain test coins. Combo counts and acknowledgements never change price calculation. Every purchase keeps its idempotency key and paired zero-sum ledger entries; high-value test confirmation still applies. Sounds, animation, and acknowledgement do not imply real currency value, redemption, or payout.

## Production considerations

Future assets require licensing/provenance review, bounded CDN sizes, content security policy compatibility, loudness/accessibility review, performance budgets for low-end phones, abuse/rate controls for celebration spam, and preference persistence with privacy review. None of those activates payment or cashout.
