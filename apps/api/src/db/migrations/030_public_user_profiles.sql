CREATE TABLE user_public_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT NOT NULL DEFAULT '' CHECK (char_length(bio) <= 280),
  avatar_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO user_public_profiles (user_id,bio,avatar_url)
SELECT u.id,COALESCE(p.bio,''),p.avatar_url
FROM users u
LEFT JOIN streamer_profiles p ON p.user_id=u.id
ON CONFLICT (user_id) DO NOTHING;

CREATE TABLE user_blocks (
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id,blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE TABLE user_profile_reports (
  id UUID PRIMARY KEY,
  reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (reported_user_id <> reporter_id)
);

CREATE INDEX user_profile_reports_status_created_idx ON user_profile_reports(status,created_at DESC);
CREATE INDEX user_blocks_blocked_idx ON user_blocks(blocked_id,created_at DESC);
