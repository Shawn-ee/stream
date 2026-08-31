CREATE TABLE audience_discovery_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_languages TEXT[] NOT NULL DEFAULT '{}'
    CHECK (preferred_languages <@ ARRAY['en','zh']::TEXT[] AND cardinality(preferred_languages) <= 2),
  preferred_categories TEXT[] NOT NULL DEFAULT '{}'
    CHECK (cardinality(preferred_categories) <= 10),
  prioritize_live BOOLEAN NOT NULL DEFAULT TRUE,
  prioritize_following BOOLEAN NOT NULL DEFAULT TRUE,
  personalization_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audience_discovery_preferences_updated_idx
  ON audience_discovery_preferences (updated_at DESC);
