ALTER TABLE live_rooms
  ADD COLUMN stream_language TEXT NOT NULL DEFAULT 'en' CHECK (stream_language IN ('en', 'zh')),
  ADD COLUMN stream_tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN stream_thumbnail_url TEXT,
  ADD COLUMN chat_slow_mode_seconds INTEGER NOT NULL DEFAULT 0 CHECK (chat_slow_mode_seconds BETWEEN 0 AND 300),
  ADD COLUMN blocked_terms TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE room_moderation_restrictions
  ADD COLUMN is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN muted_until TIMESTAMPTZ;

ALTER TABLE chat_messages
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN deleted_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX room_moderation_active_idx
  ON room_moderation_restrictions (room_id, user_id, is_muted, is_banned, muted_until);
