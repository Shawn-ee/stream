ALTER TABLE live_rooms
  ADD COLUMN IF NOT EXISTS broadcast_status_source TEXT;

UPDATE live_rooms
SET broadcast_status_source = CASE
  WHEN broadcast_status_message ILIKE 'local%'
    OR broadcast_status_message ILIKE 'simulation only:%'
    THEN 'local'
  ELSE 'cloudflare'
END
WHERE broadcast_status_source IS NULL;

ALTER TABLE live_rooms
  ALTER COLUMN broadcast_status_source SET DEFAULT 'local',
  ALTER COLUMN broadcast_status_source SET NOT NULL;

ALTER TABLE live_rooms
  DROP CONSTRAINT IF EXISTS live_rooms_broadcast_status_source_check;

ALTER TABLE live_rooms
  ADD CONSTRAINT live_rooms_broadcast_status_source_check
  CHECK (broadcast_status_source IN ('local', 'cloudflare'));
