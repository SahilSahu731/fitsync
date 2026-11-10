-- Run after 007_training_catalog.sql.
-- Public data is read through the Express API.

BEGIN;

ALTER TABLE public.training_routines
  ADD COLUMN IF NOT EXISTS featured_rank INTEGER;

CREATE INDEX IF NOT EXISTS idx_training_routines_featured
  ON public.training_routines (featured_rank, name)
  WHERE published = true;

CREATE TABLE IF NOT EXISTS public.explore_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  slug TEXT NOT NULL UNIQUE
    CHECK (slug ~ '^[a-z0-9-]+$'),

  kind TEXT NOT NULL
    CHECK (kind IN ('mobility', 'guide')),

  title TEXT NOT NULL,

  summary TEXT NOT NULL DEFAULT '',

  cover_url TEXT,

  duration_minutes INTEGER NOT NULL DEFAULT 5
    CHECK (duration_minutes BETWEEN 1 AND 180),

  tags TEXT[] NOT NULL DEFAULT '{}',

  -- Mobility: [{title,seconds,instruction}]
  steps JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(steps) = 'array'),

  -- Guides: [{heading,paragraphs:[string,...]}]
  body JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(body) = 'array'),

  featured_rank INTEGER,

  published BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_explore_resources_published
  ON public.explore_resources (
    kind,
    featured_rank,
    title
  )
  WHERE published = true;

ALTER TABLE public.explore_resources
  ENABLE ROW LEVEL SECURITY;

-- No direct client policies.
-- The Express service-role backend accesses this table.

COMMIT;