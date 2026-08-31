CREATE INDEX follows_streamer_created_idx
  ON follows (streamer_id, created_at DESC, follower_id DESC);
