-- Public room identifiers are immutable, non-sensitive six-digit numbers.
ALTER TABLE live_rooms ADD COLUMN public_room_id TEXT;

WITH numbered AS (
  SELECT id, (99999 + ROW_NUMBER() OVER (ORDER BY created_at,id))::TEXT AS public_room_id
  FROM live_rooms
)
UPDATE live_rooms room
SET public_room_id=numbered.public_room_id
FROM numbered
WHERE numbered.id=room.id;

ALTER TABLE live_rooms
  ALTER COLUMN public_room_id SET NOT NULL,
  ADD CONSTRAINT live_rooms_public_room_id_format CHECK (public_room_id ~ '^[1-9][0-9]{5}$'),
  ADD CONSTRAINT live_rooms_public_room_id_unique UNIQUE (public_room_id);

CREATE FUNCTION generate_public_room_id() RETURNS TEXT LANGUAGE plpgsql VOLATILE AS $$
DECLARE candidate TEXT;
BEGIN
  LOOP
    candidate := (100000 + FLOOR(RANDOM() * 900000))::INTEGER::TEXT;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM live_rooms WHERE public_room_id=candidate);
  END LOOP;
  RETURN candidate;
END $$;

ALTER TABLE live_rooms ALTER COLUMN public_room_id SET DEFAULT generate_public_room_id();
COMMENT ON COLUMN live_rooms.public_room_id IS 'Immutable six-digit audience-facing room identifier; contains no user information.';
