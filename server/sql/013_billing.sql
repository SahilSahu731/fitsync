-- Run after 001_init.sql. This creates storage only; it never grants Pro.
BEGIN;

CREATE TABLE IF NOT EXISTS public.billing_entitlements (
  user_id UUID PRIMARY KEY REFERENCES public.app_users(id) ON DELETE CASCADE,
  entitlement JSONB NOT NULL CHECK (jsonb_typeof(entitlement) = 'object'),
  verified_at_ms BIGINT NOT NULL CHECK (verified_at_ms >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only successfully reconciled notifications are recorded. A failed/partial
-- delivery is retried; replaying canonical state has no granting side effects.
CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 200),
  event_type TEXT NOT NULL CHECK (length(event_type) BETWEEN 1 AND 100),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS billing_webhook_events_processed ON public.billing_webhook_events(processed_at);

ALTER TABLE public.billing_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_entitlements, public.billing_webhook_events FROM anon, authenticated;
GRANT ALL ON public.billing_entitlements, public.billing_webhook_events TO service_role;

CREATE OR REPLACE FUNCTION public.billing_store_snapshot(
  p_user_id UUID,
  p_entitlement JSONB,
  p_verified_at_ms BIGINT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE result JSONB;
BEGIN
  INSERT INTO public.billing_entitlements(user_id, entitlement, verified_at_ms)
  VALUES (p_user_id, p_entitlement, p_verified_at_ms)
  ON CONFLICT (user_id) DO UPDATE
    SET entitlement = EXCLUDED.entitlement,
        verified_at_ms = EXCLUDED.verified_at_ms,
        updated_at = now()
    WHERE public.billing_entitlements.verified_at_ms < EXCLUDED.verified_at_ms;
  SELECT jsonb_build_object('entitlement', entitlement, 'verified_at_ms', verified_at_ms)
    INTO result FROM public.billing_entitlements WHERE user_id = p_user_id;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.billing_store_snapshot(UUID, JSONB, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.billing_store_snapshot(UUID, JSONB, BIGINT) TO service_role;
COMMIT;
