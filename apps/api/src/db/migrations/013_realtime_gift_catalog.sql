ALTER TABLE gift_catalog
  ADD COLUMN symbol TEXT NOT NULL DEFAULT '◆',
  ADD COLUMN animation_tier TEXT NOT NULL DEFAULT 'small'
    CHECK (animation_tier IN ('small', 'highlight', 'celebration', 'premium')),
  ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0
    CHECK (display_order >= 0);

ALTER TABLE gifts
  ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1
    CHECK (quantity BETWEEN 1 AND 100);

CREATE INDEX gift_catalog_active_order_idx
  ON gift_catalog (is_active, display_order, coin_cost);
