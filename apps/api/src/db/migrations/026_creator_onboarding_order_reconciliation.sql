-- The new agreement is a material prerequisite. Incomplete legacy flows resume at it.
UPDATE creator_accounts c
SET status='ONBOARDING_AGREEMENT',updated_at=NOW()
WHERE c.status IN ('ONBOARDING_IDENTITY','ONBOARDING_AGREEMENT','READY_FOR_REVIEW','PENDING_REVIEW')
  AND NOT EXISTS (
    SELECT 1 FROM creator_agreement_acceptances a
    JOIN creator_agreement_versions v ON v.id=a.agreement_version_id
    WHERE a.user_id=c.user_id AND v.version='creator-agreement-v1'
      AND a.age_confirmed=TRUE AND a.agreement_confirmed=TRUE
  );
