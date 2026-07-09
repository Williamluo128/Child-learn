-- Postgres schema for the Marble Skill Taxonomy dataset.
-- Run via scripts/import-to-postgres.mjs, or manually with:
--   psql "$DATABASE_URL" -f db/schema.sql

CREATE TABLE IF NOT EXISTS topics (
  id                TEXT PRIMARY KEY,
  type              TEXT NOT NULL CHECK (type IN ('CONCEPTUAL', 'PROCEDURAL', 'REPRESENTATIONAL', 'LANGUAGE', 'META')),
  subject           TEXT NOT NULL,
  domain            TEXT NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT NOT NULL,
  age_range_start   SMALLINT NOT NULL,
  age_range_end     SMALLINT NOT NULL,
  centrality        DOUBLE PRECISION NOT NULL,
  evidence          JSONB NOT NULL,
  assessment_prompt TEXT,
  standards         TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS topics_subject_idx ON topics (subject);
CREATE INDEX IF NOT EXISTS topics_age_range_idx ON topics (age_range_start, age_range_end);

CREATE TABLE IF NOT EXISTS dependencies (
  topic_id         TEXT NOT NULL REFERENCES topics (id),
  prerequisite_id  TEXT NOT NULL REFERENCES topics (id),
  strength         TEXT NOT NULL CHECK (strength IN ('hard', 'soft')),
  reason           TEXT,
  PRIMARY KEY (topic_id, prerequisite_id)
);

CREATE INDEX IF NOT EXISTS dependencies_prerequisite_idx ON dependencies (prerequisite_id);

CREATE TABLE IF NOT EXISTS curricula (
  slug           TEXT PRIMARY KEY,
  country        TEXT,
  name           TEXT NOT NULL,
  version        TEXT,
  source_url     TEXT,
  text_included  BOOLEAN NOT NULL,
  license        TEXT
);

CREATE TABLE IF NOT EXISTS curriculum_standards (
  key              TEXT PRIMARY KEY,
  curriculum_slug  TEXT NOT NULL REFERENCES curricula (slug),
  code             TEXT NOT NULL,
  data             JSONB -- null for codes-only sources (see PROVENANCE.md)
);

CREATE INDEX IF NOT EXISTS curriculum_standards_slug_idx ON curriculum_standards (curriculum_slug);

CREATE TABLE IF NOT EXISTS clusters (
  id               SERIAL PRIMARY KEY,
  subject          TEXT NOT NULL,
  domain           TEXT NOT NULL,
  age_range_start  SMALLINT NOT NULL,
  summary          TEXT NOT NULL,
  UNIQUE (subject, domain, age_range_start)
);
