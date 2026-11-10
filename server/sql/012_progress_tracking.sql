-- Additive progress journal. Run once in Supabase SQL Editor after 006.
BEGIN;
CREATE TABLE IF NOT EXISTS public.progress_events (
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  id TEXT NOT NULL CHECK (length(id) BETWEEN 20 AND 80),
  observed_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS progress_events_user_time ON public.progress_events(user_id, observed_at);
ALTER TABLE public.progress_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.progress_events FROM anon, authenticated;
-- API service role only; all queries also constrain user_id from the auth token.
-- Corrections and removals append events; historical measurements are preserved.
COMMIT;
