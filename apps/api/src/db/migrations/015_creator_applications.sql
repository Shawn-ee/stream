CREATE TABLE creator_applications (
  id UUID PRIMARY KEY,
  applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  bio TEXT NOT NULL,
  schedule_text TEXT NOT NULL,
  motivation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','withdrawn')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  review_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  provisioned_room_id UUID REFERENCES live_rooms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX creator_applications_active_applicant_unique_idx
  ON creator_applications (applicant_id)
  WHERE status IN ('pending','approved');

CREATE INDEX creator_applications_status_created_idx
  ON creator_applications (status, created_at DESC);

CREATE TABLE creator_application_events (
  id UUID PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES creator_applications(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('submitted','approved','rejected','withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX creator_application_events_application_created_idx
  ON creator_application_events (application_id, created_at);
