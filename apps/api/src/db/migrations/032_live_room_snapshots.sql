-- Browser-captured live-card images are distinct from legacy manual room covers.
-- Existing thumbnail URLs are retained, but remain unclassified and are not public.
ALTER TABLE live_rooms
  ADD COLUMN live_snapshot_captured_at TIMESTAMPTZ,
  ADD COLUMN live_snapshot_source TEXT,
  ADD CONSTRAINT live_rooms_snapshot_source_check
    CHECK (live_snapshot_source IS NULL OR live_snapshot_source IN ('BROWSER','PROVIDER'));

CREATE INDEX live_rooms_snapshot_recency_idx
  ON live_rooms (live_snapshot_captured_at DESC)
  WHERE live_snapshot_captured_at IS NOT NULL;

COMMENT ON COLUMN live_rooms.live_snapshot_captured_at IS
  'Last successful low-frequency live-card snapshot capture time.';
COMMENT ON COLUMN live_rooms.live_snapshot_source IS
  'Trusted snapshot capture path. NULL identifies deprecated legacy manual covers.';
