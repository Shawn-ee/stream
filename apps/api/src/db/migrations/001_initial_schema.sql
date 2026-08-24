CREATE TYPE user_role AS ENUM ('audience', 'streamer', 'admin');
CREATE TYPE room_status AS ENUM ('offline', 'live', 'ended');
CREATE TYPE ledger_entry_type AS ENUM ('seed_credit', 'gift_sent', 'gift_received', 'admin_adjustment');

CREATE TABLE users (
  id UUID PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role user_role NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'zh')),
  test_age_acknowledged_at TIMESTAMPTZ,
  is_muted BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE streamer_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE live_rooms (
  id UUID PRIMARY KEY,
  streamer_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status room_status NOT NULL DEFAULT 'offline',
  cloudflare_live_input_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE gift_catalog (
  id UUID PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_zh TEXT NOT NULL,
  coin_cost INTEGER NOT NULL CHECK (coin_cost > 0),
  animation_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE wallet_ledger (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  entry_type ledger_entry_type NOT NULL,
  amount INTEGER NOT NULL CHECK (amount <> 0),
  idempotency_key TEXT NOT NULL UNIQUE,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE gifts (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES live_rooms(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  recipient_id UUID NOT NULL REFERENCES users(id),
  gift_id UUID NOT NULL REFERENCES gift_catalog(id),
  coin_cost INTEGER NOT NULL CHECK (coin_cost > 0),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES live_rooms(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE moderation_events (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES live_rooms(id),
  actor_id UUID NOT NULL REFERENCES users(id),
  target_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX chat_messages_room_created_idx ON chat_messages (room_id, created_at DESC);
CREATE INDEX wallet_ledger_user_created_idx ON wallet_ledger (user_id, created_at DESC);
CREATE INDEX gifts_room_created_idx ON gifts (room_id, created_at DESC);
