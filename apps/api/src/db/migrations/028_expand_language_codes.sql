ALTER TABLE live_rooms DROP CONSTRAINT IF EXISTS live_rooms_stream_language_check;
ALTER TABLE creator_onboarding DROP CONSTRAINT IF EXISTS creator_onboarding_primary_language_check;

COMMENT ON COLUMN creator_onboarding.primary_language IS
  'Preferred creator locale as an enabled standard language code; room languages are stored separately in room_languages.';
