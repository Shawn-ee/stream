CREATE TABLE supported_languages (
  language_code TEXT PRIMARY KEY CHECK (language_code ~ '^[a-z]{2}$'),
  name_en TEXT NOT NULL,
  name_native TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  display_order SMALLINT NOT NULL CHECK (display_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO supported_languages(language_code,name_en,name_native,display_order) VALUES
  ('en','English','English',10),
  ('zh','Chinese','中文',20),
  ('es','Spanish','Español',30),
  ('ja','Japanese','日本語',40),
  ('ko','Korean','한국어',50),
  ('fr','French','Français',60),
  ('de','German','Deutsch',70),
  ('pt','Portuguese','Português',80),
  ('ar','Arabic','العربية',90),
  ('hi','Hindi','हिन्दी',100);

CREATE TABLE tags (
  id UUID PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  normalized_slug TEXT NOT NULL UNIQUE CHECK (normalized_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name TEXT NOT NULL,
  tag_type TEXT NOT NULL CHECK (tag_type IN ('CONTENT','FORMAT','MOOD','COMMUNITY','SYSTEM','MODERATION')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','BLOCKED')),
  creator_selectable BOOLEAN NOT NULL DEFAULT TRUE,
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (char_length(canonical_name) BETWEEN 1 AND 40),
  CHECK (char_length(display_name) BETWEEN 1 AND 40),
  CHECK (tag_type NOT IN ('SYSTEM','MODERATION') OR creator_selectable=FALSE)
);

INSERT INTO tags(id,canonical_name,normalized_slug,display_name,tag_type,creator_selectable) VALUES
  ('27000000-0000-4000-8000-000000000001','Music','music','Music','CONTENT',TRUE),
  ('27000000-0000-4000-8000-000000000002','Piano','piano','Piano','CONTENT',TRUE),
  ('27000000-0000-4000-8000-000000000003','Gaming','gaming','Gaming','CONTENT',TRUE),
  ('27000000-0000-4000-8000-000000000004','Interview','interview','Interview','FORMAT',TRUE),
  ('27000000-0000-4000-8000-000000000005','Questions and Answers','q-and-a','Q&A','FORMAT',TRUE),
  ('27000000-0000-4000-8000-000000000006','Tutorial','tutorial','Tutorial','FORMAT',TRUE),
  ('27000000-0000-4000-8000-000000000007','Live Performance','live-performance','Live Performance','FORMAT',TRUE),
  ('27000000-0000-4000-8000-000000000008','Chill','chill','Chill','MOOD',TRUE),
  ('27000000-0000-4000-8000-000000000009','News Discussion','news-discussion','News Discussion','CONTENT',TRUE),
  ('27000000-0000-4000-8000-000000000010','Lifestyle','lifestyle','Lifestyle','CONTENT',TRUE),
  ('27000000-0000-4000-8000-000000000011','Conversation','conversation','Conversation','CONTENT',TRUE),
  ('27000000-0000-4000-8000-000000000012','New Creators','new-creators','New Creators','COMMUNITY',TRUE),
  ('27000000-0000-4000-8000-000000000013','Trending','trending','Trending','SYSTEM',FALSE),
  ('27000000-0000-4000-8000-000000000014','Featured','featured','Featured','SYSTEM',FALSE);

CREATE TABLE room_languages (
  room_id UUID NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES supported_languages(language_code),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  display_order SMALLINT NOT NULL CHECK (display_order BETWEEN 0 AND 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(room_id,language_code),
  UNIQUE(room_id,display_order)
);

CREATE UNIQUE INDEX room_languages_one_primary_idx ON room_languages(room_id) WHERE is_primary;
CREATE INDEX room_languages_discovery_idx ON room_languages(language_code,room_id);

CREATE FUNCTION enforce_room_language_set() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE target UUID; total INTEGER; primaries INTEGER; primary_order INTEGER;
BEGIN
  target:=COALESCE(NEW.room_id,OLD.room_id);
  IF NOT EXISTS(SELECT 1 FROM live_rooms WHERE id=target) THEN RETURN NULL; END IF;
  SELECT COUNT(*),COUNT(*) FILTER(WHERE is_primary),MIN(display_order) FILTER(WHERE is_primary)
    INTO total,primaries,primary_order FROM room_languages WHERE room_id=target;
  IF total < 1 OR total > 3 OR primaries <> 1 OR primary_order <> 0 THEN
    RAISE EXCEPTION 'room language set requires one primary language first and at most three languages';
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER room_language_set_valid
AFTER INSERT OR UPDATE OR DELETE ON room_languages
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_room_language_set();

CREATE TABLE room_tags (
  room_id UUID NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id),
  source TEXT NOT NULL CHECK (source IN ('CREATOR','PLATFORM','SYSTEM','MODERATION')),
  display_order SMALLINT NOT NULL CHECK (display_order BETWEEN 0 AND 7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(room_id,tag_id),
  UNIQUE(room_id,display_order)
);

CREATE INDEX room_tags_discovery_idx ON room_tags(tag_id,room_id);

CREATE FUNCTION enforce_room_tag_assignment() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE kind TEXT; selectable BOOLEAN; state TEXT; total INTEGER;
BEGIN
  SELECT tag_type,creator_selectable,status INTO kind,selectable,state FROM tags WHERE id=NEW.tag_id;
  IF state <> 'ACTIVE' THEN RAISE EXCEPTION 'inactive tags cannot be assigned'; END IF;
  IF NEW.source='CREATOR' AND (NOT selectable OR kind IN ('SYSTEM','MODERATION')) THEN
    RAISE EXCEPTION 'tag is not creator selectable';
  END IF;
  SELECT COUNT(*) INTO total FROM room_tags WHERE room_id=NEW.room_id AND tag_id<>NEW.tag_id;
  IF total >= 8 THEN RAISE EXCEPTION 'rooms may have at most eight tags'; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER room_tag_assignment_valid BEFORE INSERT OR UPDATE ON room_tags
FOR EACH ROW EXECUTE FUNCTION enforce_room_tag_assignment();

CREATE TABLE legacy_category_migration_report (
  legacy_category TEXT PRIMARY KEY,
  resolution TEXT NOT NULL CHECK (resolution IN ('MAPPED_TO_TAG','OMITTED','EXCLUDED_SYSTEM_DIMENSION','NEEDS_REVIEW')),
  mapped_tag_slug TEXT,
  affected_room_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audience_discovery_preferences
  ADD COLUMN preferred_tag_slugs TEXT[] NOT NULL DEFAULT '{}'
  CHECK (cardinality(preferred_tag_slugs) <= 20);

INSERT INTO legacy_category_migration_report(legacy_category,resolution,mapped_tag_slug,affected_room_count)
SELECT p.category,
  CASE p.category
    WHEN 'Music' THEN 'MAPPED_TO_TAG'
    WHEN 'Gaming' THEN 'MAPPED_TO_TAG'
    WHEN 'Interview' THEN 'MAPPED_TO_TAG'
    WHEN 'Lifestyle' THEN 'MAPPED_TO_TAG'
    WHEN 'Talk' THEN 'MAPPED_TO_TAG'
    WHEN 'General' THEN 'OMITTED'
    WHEN 'Featured' THEN 'EXCLUDED_SYSTEM_DIMENSION'
    ELSE 'NEEDS_REVIEW'
  END,
  CASE p.category WHEN 'Music' THEN 'music' WHEN 'Gaming' THEN 'gaming' WHEN 'Interview' THEN 'interview'
    WHEN 'Lifestyle' THEN 'lifestyle' WHEN 'Talk' THEN 'conversation' ELSE NULL END,
  COUNT(r.id)::INTEGER
FROM streamer_profiles p LEFT JOIN live_rooms r ON r.streamer_id=p.user_id
GROUP BY p.category;

INSERT INTO room_languages(room_id,language_code,is_primary,display_order)
SELECT id,stream_language,TRUE,0 FROM live_rooms;

INSERT INTO room_tags(room_id,tag_id,source,display_order)
SELECT r.id,t.id,'PLATFORM',0
FROM live_rooms r
JOIN streamer_profiles p ON p.user_id=r.streamer_id
JOIN legacy_category_migration_report report ON report.legacy_category=p.category AND report.resolution='MAPPED_TO_TAG'
JOIN tags t ON t.normalized_slug=report.mapped_tag_slug
ON CONFLICT DO NOTHING;

INSERT INTO room_tags(room_id,tag_id,source,display_order)
SELECT r.id,t.id,'PLATFORM',ROW_NUMBER() OVER(PARTITION BY r.id ORDER BY t.normalized_slug)::SMALLINT
FROM live_rooms r CROSS JOIN LATERAL UNNEST(r.stream_tags) raw_tag
JOIN tags t ON LOWER(t.display_name)=LOWER(TRIM(raw_tag)) OR t.normalized_slug=LOWER(TRIM(raw_tag))
WHERE NOT EXISTS(SELECT 1 FROM room_tags existing WHERE existing.room_id=r.id AND existing.tag_id=t.id)
ON CONFLICT DO NOTHING;

COMMENT ON COLUMN streamer_profiles.category IS 'Deprecated after migration 027; retained temporarily for legacy creator/application compatibility.';
COMMENT ON COLUMN live_rooms.stream_language IS 'Deprecated compatibility mirror of the primary row in room_languages.';
COMMENT ON COLUMN live_rooms.stream_tags IS 'Deprecated compatibility field; normalized room_tags is authoritative.';
COMMENT ON COLUMN audience_discovery_preferences.preferred_categories IS 'Deprecated; retained temporarily for stored preference compatibility.';
