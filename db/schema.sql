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

CREATE TABLE IF NOT EXISTS questions (
  id              SERIAL PRIMARY KEY,
  topic_id        TEXT NOT NULL REFERENCES topics (id),
  -- 'mcq'   : multiple-choice (choices + correct_choice = correct label)
  -- 'shade' : interactive shade-a-fraction (spec holds geometry;
  --           correct_choice = the numerator as text; choices is empty)
  kind            TEXT NOT NULL DEFAULT 'mcq' CHECK (kind IN ('mcq', 'shade')),
  prompt          TEXT NOT NULL,
  choices         JSONB NOT NULL,
  correct_choice  TEXT NOT NULL,
  explanation     TEXT NOT NULL,
  -- geometry for interactive questions: { shape, numerator, denominator }
  spec            JSONB,
  model           TEXT NOT NULL,
  batch_id        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS questions_topic_idx ON questions (topic_id);
CREATE INDEX IF NOT EXISTS questions_kind_idx ON questions (kind);

CREATE TABLE IF NOT EXISTS students (
  id          TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- status: unknown | learning | mastered | gap
CREATE TABLE IF NOT EXISTS student_topic_mastery (
  student_id      TEXT NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  topic_id        TEXT NOT NULL REFERENCES topics (id),
  status          TEXT NOT NULL DEFAULT 'unknown'
                    CHECK (status IN ('unknown', 'learning', 'mastered', 'gap')),
  correct_streak  SMALLINT NOT NULL DEFAULT 0,
  wrong_streak    SMALLINT NOT NULL DEFAULT 0,
  last_seen       TIMESTAMPTZ,
  PRIMARY KEY (student_id, topic_id)
);

CREATE INDEX IF NOT EXISTS mastery_student_status_idx
  ON student_topic_mastery (student_id, status);

CREATE TABLE IF NOT EXISTS practice_attempts (
  id           BIGSERIAL PRIMARY KEY,
  student_id   TEXT NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  topic_id     TEXT NOT NULL REFERENCES topics (id),
  question_id  INT NOT NULL REFERENCES questions (id),
  chosen       TEXT NOT NULL,
  correct      BOOLEAN NOT NULL,
  mode         TEXT NOT NULL CHECK (mode IN ('diagnose', 'practice')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attempts_student_idx ON practice_attempts (student_id, created_at DESC);
