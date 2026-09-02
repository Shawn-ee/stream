ALTER TABLE creator_agreement_versions ADD COLUMN content_text TEXT NOT NULL DEFAULT '';

ALTER TABLE creator_agreement_acceptances
  ADD COLUMN age_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN agreement_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN audit_event_id UUID REFERENCES audit_events(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION prevent_creator_agreement_acceptance_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'creator agreement acceptances are immutable';
END $$;

CREATE TRIGGER creator_agreement_acceptances_immutable
BEFORE UPDATE ON creator_agreement_acceptances
FOR EACH ROW EXECUTE FUNCTION prevent_creator_agreement_acceptance_mutation();

UPDATE creator_agreement_versions SET is_current=FALSE WHERE is_current=TRUE;
INSERT INTO creator_agreement_versions
  (id,version,title,content_hash,content_text,effective_at,is_current)
VALUES
  ('25000000-0000-4000-8000-000000000001','creator-agreement-v1','Holiwyn Creator Agreement',
   'sha256:holiwyn-creator-agreement-v1',
   'I confirm that I am at least 18 years old. I will follow applicable law and will not broadcast illegal activity, graphic violence or gore, sexual exploitation or content involving minors, threats, harassment, abuse, terrorism, human trafficking, fraud, copyright infringement, or manipulation of Holiwyn wallet, viewer, gift, or moderation systems. Holiwyn may remove content, end broadcasts, or suspend creator or account access for violations. R is test currency with no cash value. Identity documents are private account-verification records and never part of my public profile.',
   NOW(),TRUE);

CREATE TABLE creator_identity_documents (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_reference TEXT NOT NULL UNIQUE,
  document_type TEXT NOT NULL CHECK (document_type IN ('passport','national_id','driver_license')),
  mime_type TEXT NOT NULL CHECK (mime_type IN ('application/pdf','image/jpeg','image/png')),
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 8388608),
  checksum TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED','NEEDS_REUPLOAD','REVIEWED','REJECTED','SUPERSEDED','DELETED')),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  replaced_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  review_reason_code TEXT,
  internal_notes TEXT,
  superseded_by UUID REFERENCES creator_identity_documents(id) ON DELETE SET NULL
);
CREATE INDEX creator_identity_documents_user_uploaded_idx ON creator_identity_documents(user_id,uploaded_at DESC);
CREATE INDEX creator_identity_documents_status_uploaded_idx ON creator_identity_documents(status,uploaded_at DESC);

ALTER TABLE creator_accounts
  ADD COLUMN activation_method TEXT CHECK (activation_method IN ('AUTOMATIC','MANUAL')),
  ADD COLUMN activated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN administrative_review_status TEXT NOT NULL DEFAULT 'NOT_REVIEWED'
    CHECK (administrative_review_status IN ('NOT_REVIEWED','REVIEWED','NEEDS_REUPLOAD','REJECTED'));

CREATE TABLE admin_permissions (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('creator_review.read','creator_review.decide','creator_document.view','creator_access.suspend')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id,permission)
);
INSERT INTO admin_permissions(user_id,permission)
SELECT u.id,p.permission FROM users u CROSS JOIN (VALUES
 ('creator_review.read'),('creator_review.decide'),('creator_document.view'),('creator_access.suspend')
) AS p(permission) WHERE u.role='admin' ON CONFLICT DO NOTHING;

CREATE TABLE creator_review_decisions (
  id UUID PRIMARY KEY,
  creator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES creator_identity_documents(id) ON DELETE SET NULL,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('DOCUMENT_REVIEWED','REUPLOAD_REQUESTED','APPROVED','REJECTED','SUSPENDED','REACTIVATED')),
  previous_creator_status TEXT,
  next_creator_status TEXT,
  reason_code TEXT NOT NULL,
  user_facing_reason TEXT,
  internal_notes TEXT,
  idempotency_key TEXT NOT NULL,
  audit_event_id UUID NOT NULL REFERENCES audit_events(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reviewer_id,idempotency_key)
);
CREATE INDEX creator_review_decisions_creator_created_idx ON creator_review_decisions(creator_user_id,created_at DESC);

-- Preserve active creators. Move incomplete records onto the new visible step order.
UPDATE creator_accounts SET status='ONBOARDING_AGREEMENT',updated_at=NOW() WHERE status='ONBOARDING_IDENTITY';
UPDATE creator_accounts SET activation_method='AUTOMATIC' WHERE status='ACTIVE' AND activation_method IS NULL;
