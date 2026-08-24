CREATE TYPE broadcast_lifecycle_state AS ENUM ('live', 'connecting', 'offline', 'unavailable');

ALTER TABLE live_rooms
  ADD COLUMN broadcast_state broadcast_lifecycle_state NOT NULL DEFAULT 'offline',
  ADD COLUMN broadcast_checked_at TIMESTAMPTZ,
  ADD COLUMN broadcast_status_message TEXT NOT NULL DEFAULT 'Local test broadcast is offline.';

CREATE TABLE room_lifecycle_events (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,
  state broadcast_lifecycle_state NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX room_lifecycle_events_room_created_idx ON room_lifecycle_events (room_id, created_at DESC);
