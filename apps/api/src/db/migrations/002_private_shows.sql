CREATE TYPE private_show_mode AS ENUM ('ticket', 'per_minute');
CREATE TYPE private_show_status AS ENUM ('scheduled', 'live', 'ended');

ALTER TABLE live_rooms
  ADD COLUMN private_show_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN private_show_mode private_show_mode NOT NULL DEFAULT 'ticket',
  ADD COLUMN private_show_ticket_cost INTEGER NOT NULL DEFAULT 100 CHECK (private_show_ticket_cost > 0),
  ADD COLUMN private_show_per_minute_cost INTEGER NOT NULL DEFAULT 10 CHECK (private_show_per_minute_cost > 0);

CREATE TABLE private_show_sessions (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,
  mode private_show_mode NOT NULL,
  ticket_cost INTEGER NOT NULL CHECK (ticket_cost > 0),
  per_minute_cost INTEGER NOT NULL CHECK (per_minute_cost > 0),
  status private_show_status NOT NULL DEFAULT 'scheduled',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX private_show_one_live_per_room_idx ON private_show_sessions(room_id) WHERE status = 'live';

CREATE TABLE private_show_access (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES private_show_sessions(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES users(id),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  idempotency_key TEXT NOT NULL UNIQUE
);

CREATE INDEX private_show_access_viewer_idx ON private_show_access(session_id, viewer_id);
