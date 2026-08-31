ALTER TABLE follows
  ADD COLUMN reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX follows_reminder_delivery_idx
  ON follows (follower_id, streamer_id)
  WHERE reminder_enabled = TRUE;

CREATE INDEX notifications_unread_schedule_idx
  ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL AND kind IN ('schedule_updated', 'schedule_reminder');
