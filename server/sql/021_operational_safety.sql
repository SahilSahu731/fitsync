BEGIN;
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  key text PRIMARY KEY CHECK (length(key) = 64),
  hits bigint NOT NULL,
  reset_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS api_rate_limits_expiry ON public.api_rate_limits(reset_at);
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.api_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(p_key text, p_window_ms integer)
RETURNS TABLE(total_hits bigint, reset_time timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_now timestamptz := clock_timestamp();
BEGIN
  IF length(p_key) <> 64 OR p_window_ms < 1000 OR p_window_ms > 86400000 THEN
    RAISE EXCEPTION 'Invalid rate limit parameters';
  END IF;
  -- Bounded, indexed housekeeping prevents abandoned counters growing forever.
  DELETE FROM public.api_rate_limits WHERE key IN (
    SELECT r.key FROM public.api_rate_limits r WHERE r.reset_at < v_now - interval '1 day'
    ORDER BY r.reset_at LIMIT 100
  );
  RETURN QUERY INSERT INTO public.api_rate_limits AS r (key, hits, reset_at)
  VALUES (p_key, 1, v_now + p_window_ms * interval '1 millisecond')
  ON CONFLICT (key) DO UPDATE SET
    hits = CASE WHEN r.reset_at <= v_now THEN 1 ELSE r.hits + 1 END,
    reset_at = CASE WHEN r.reset_at <= v_now THEN v_now + p_window_ms * interval '1 millisecond' ELSE r.reset_at END
  RETURNING r.hits, r.reset_at;
END $$;
REVOKE ALL ON FUNCTION public.consume_rate_limit(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer) TO service_role;

CREATE TABLE IF NOT EXISTS public.auth_session_refresh_history (
  session_id uuid NOT NULL REFERENCES public.auth_sessions(id) ON DELETE CASCADE,
  refresh_hash text NOT NULL CHECK (refresh_hash ~ '^[0-9a-f]{64}$'),
  used_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, refresh_hash)
);
ALTER TABLE public.auth_session_refresh_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_session_refresh_history FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.auth_session_refresh_history TO service_role;

CREATE OR REPLACE FUNCTION public.rotate_auth_session_refresh(p_session_id uuid, p_presented_hash text, p_next_hash text)
RETURNS TABLE(outcome text, user_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_session public.auth_sessions%ROWTYPE; v_now timestamptz;
BEGIN
  SELECT s.* INTO v_session FROM public.auth_sessions s WHERE s.id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'invalid'::text, NULL::uuid; RETURN; END IF;
  v_now := clock_timestamp();
  IF v_session.revoked_at IS NOT NULL OR v_session.expires_at <= v_now THEN
    RETURN QUERY SELECT 'invalid'::text, NULL::uuid; RETURN;
  END IF;
  IF v_session.refresh_hash IS DISTINCT FROM p_presented_hash THEN
    IF EXISTS (SELECT 1 FROM public.auth_session_refresh_history h WHERE h.session_id = p_session_id AND h.refresh_hash = p_presented_hash) THEN
      UPDATE public.auth_sessions SET revoked_at = v_now, updated_at = v_now WHERE id = p_session_id;
      -- Return rather than raise: raising would roll back revocation.
      RETURN QUERY SELECT 'replayed'::text, NULL::uuid;
    ELSE RETURN QUERY SELECT 'invalid'::text, NULL::uuid;
    END IF;
    RETURN;
  END IF;
  IF p_next_hash IS NULL OR p_next_hash !~ '^[0-9a-f]{64}$' OR p_next_hash = p_presented_hash THEN
    RAISE EXCEPTION 'Invalid refresh rotation parameters';
  END IF;
  INSERT INTO public.auth_session_refresh_history(session_id, refresh_hash, used_at) VALUES (p_session_id, p_presented_hash, v_now);
  UPDATE public.auth_sessions SET refresh_hash = p_next_hash, expires_at = v_now + interval '30 days', updated_at = v_now WHERE id = p_session_id;
  RETURN QUERY SELECT 'rotated'::text, v_session.user_id;
END $$;
REVOKE ALL ON FUNCTION public.rotate_auth_session_refresh(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_auth_session_refresh(uuid, text, text) TO service_role;
COMMIT;
NOTIFY pgrst, 'reload schema';
