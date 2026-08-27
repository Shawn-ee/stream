ALTER TABLE auth_sessions
  ADD COLUMN session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN client_label TEXT NOT NULL DEFAULT 'Browser session';

CREATE UNIQUE INDEX auth_sessions_session_id_unique_idx
  ON auth_sessions (session_id);

ALTER TABLE users
  ADD COLUMN password_changed_at TIMESTAMPTZ;

CREATE TABLE account_security_events (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'profile_updated',
    'password_changed',
    'session_revoked',
    'other_sessions_revoked'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX account_security_events_user_created_idx
  ON account_security_events (user_id, created_at DESC);
