ALTER TABLE gifts
  ADD COLUMN combo_count INTEGER NOT NULL DEFAULT 1 CHECK (combo_count BETWEEN 1 AND 10000),
  ADD COLUMN combo_expires_at TIMESTAMPTZ;

CREATE INDEX gifts_combo_lookup_idx
  ON gifts (room_id,sender_id,gift_id,created_at DESC);

CREATE TABLE gift_acknowledgements (
  id UUID PRIMARY KEY,
  gift_id UUID NOT NULL UNIQUE REFERENCES gifts(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_key TEXT NOT NULL DEFAULT 'thank_you' CHECK (message_key IN ('thank_you','celebrate')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX gift_acknowledgements_creator_created_idx
  ON gift_acknowledgements (creator_id,created_at DESC);
