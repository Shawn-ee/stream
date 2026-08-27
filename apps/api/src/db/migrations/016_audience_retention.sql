ALTER TABLE streamer_profiles
  ADD COLUMN next_stream_at TIMESTAMPTZ,
  ADD COLUMN schedule_timezone TEXT NOT NULL DEFAULT 'UTC'
    CHECK (char_length(schedule_timezone) BETWEEN 1 AND 64);

ALTER TABLE notifications
  ADD COLUMN room_id UUID REFERENCES live_rooms(id) ON DELETE CASCADE,
  ADD COLUMN notification_key TEXT;

CREATE UNIQUE INDEX notifications_user_key_unique_idx
  ON notifications (user_id, notification_key)
  WHERE notification_key IS NOT NULL;

CREATE INDEX follows_follower_created_idx
  ON follows (follower_id, created_at DESC);

CREATE INDEX streamer_profiles_next_stream_idx
  ON streamer_profiles (next_stream_at)
  WHERE next_stream_at IS NOT NULL;
