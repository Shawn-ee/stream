CREATE TYPE broadcast_transport_mode AS ENUM ('obs_hls', 'browser_webrtc');
CREATE TYPE broadcast_session_state AS ENUM ('connecting', 'active', 'ended', 'failed');

ALTER TABLE live_rooms
  ADD COLUMN broadcast_transport broadcast_transport_mode NOT NULL DEFAULT 'obs_hls';

CREATE TABLE broadcast_sessions (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transport broadcast_transport_mode NOT NULL,
  state broadcast_session_state NOT NULL DEFAULT 'connecting',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  failure_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX broadcast_sessions_one_active_room_idx
  ON broadcast_sessions (room_id)
  WHERE state IN ('connecting', 'active');

CREATE INDEX broadcast_sessions_room_created_idx
  ON broadcast_sessions (room_id, created_at DESC);
