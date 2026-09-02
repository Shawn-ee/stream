CREATE TABLE creator_accounts (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'AUDIENCE' CHECK (status IN (
    'AUDIENCE','ONBOARDING_PROFILE','ONBOARDING_IDENTITY','ONBOARDING_AGREEMENT',
    'READY_FOR_REVIEW','PENDING_REVIEW','APPROVED','ACTIVE','REJECTED','SUSPENDED'
  )),
  reason_code TEXT,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE creator_onboarding (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  creator_handle TEXT,
  display_name TEXT,
  bio TEXT,
  category TEXT,
  primary_language TEXT CHECK (primary_language IS NULL OR primary_language IN ('en','zh')),
  timezone TEXT,
  content_tags TEXT[] NOT NULL DEFAULT '{}',
  profile_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX creator_onboarding_handle_unique_idx
  ON creator_onboarding (LOWER(creator_handle))
  WHERE creator_handle IS NOT NULL;

CREATE TABLE identity_verifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_reference TEXT,
  status TEXT NOT NULL CHECK (status IN ('not_started','pending','verified','failed','expired')),
  failure_code TEXT,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX identity_verifications_user_created_idx
  ON identity_verifications (user_id, created_at DESC);

CREATE TABLE creator_agreement_versions (
  id UUID PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX creator_agreement_one_current_idx
  ON creator_agreement_versions (is_current)
  WHERE is_current;

CREATE TABLE creator_agreement_acceptances (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agreement_version_id UUID NOT NULL REFERENCES creator_agreement_versions(id),
  signer_name TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, agreement_version_id)
);

CREATE TABLE creator_status_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason_code TEXT,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX creator_status_history_user_created_idx
  ON creator_status_history (user_id, created_at DESC);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subject_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_events_subject_created_idx
  ON audit_events (subject_user_id, created_at DESC);

ALTER TABLE live_rooms
  ADD COLUMN publication_status TEXT NOT NULL DEFAULT 'published'
  CHECK (publication_status IN ('draft','published'));

CREATE INDEX live_rooms_publication_broadcast_idx
  ON live_rooms (publication_status,broadcast_state,updated_at DESC);

INSERT INTO creator_agreement_versions
  (id,version,title,content_hash,effective_at,is_current)
VALUES
  ('24000000-0000-4000-8000-000000000001','2026-09-creator-v1',
   'Holiwyn Creator Agreement','sha256:creator-agreement-2026-09-v1',NOW(),TRUE);

INSERT INTO creator_accounts (user_id,status,activated_at)
SELECT id,'ACTIVE',NOW() FROM users WHERE role='streamer'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO creator_status_history (id,user_id,from_status,to_status,reason_code,actor_id)
SELECT gen_random_uuid(),id,NULL,'ACTIVE','existing_creator_migration',id
FROM users WHERE role='streamer';

CREATE VIEW suspicious_audience_creator_resources AS
SELECT u.id AS user_id,u.handle,p.user_id IS NOT NULL AS has_creator_profile,
       r.id AS room_id,r.slug AS room_slug,r.created_at AS room_created_at
FROM users u
LEFT JOIN streamer_profiles p ON p.user_id=u.id
LEFT JOIN live_rooms r ON r.streamer_id=u.id
WHERE u.role='audience' AND (p.user_id IS NOT NULL OR r.id IS NOT NULL);
