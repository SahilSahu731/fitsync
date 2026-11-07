BEGIN;
CREATE TABLE IF NOT EXISTS public.wellness_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.app_users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}', updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.wellness_meal_plans (
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  week DATE NOT NULL, plan JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(user_id,week)
);
CREATE TABLE IF NOT EXISTS public.wellness_commitments (
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  week DATE NOT NULL, target SMALLINT NOT NULL CHECK(target BETWEEN 1 AND 7),
  habit TEXT NOT NULL CHECK(habit IN ('train','walk','mobility')), reflection TEXT NOT NULL DEFAULT '' CHECK(length(reflection)<=500),
  completed_dates DATE[] NOT NULL DEFAULT '{}', PRIMARY KEY(user_id,week)
);
CREATE TABLE IF NOT EXISTS public.accountability_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.app_users(id) ON DELETE CASCADE, token_hash TEXT UNIQUE, expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), CHECK(partner_id IS NULL OR owner_id<>partner_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS accountability_owner_one ON public.accountability_partners(owner_id);
CREATE INDEX IF NOT EXISTS accountability_partner ON public.accountability_partners(partner_id);
ALTER TABLE public.wellness_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness_meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountability_partners ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wellness_preferences,public.wellness_meal_plans,public.wellness_commitments,public.accountability_partners FROM anon,authenticated;
GRANT ALL ON public.wellness_preferences,public.wellness_meal_plans,public.wellness_commitments,public.accountability_partners TO service_role;
CREATE OR REPLACE FUNCTION public.fitsync_commitment_checkin(p_user UUID,p_week DATE,p_date DATE,p_completed BOOLEAN) RETURNS VOID
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF p_date<p_week OR p_date>p_week+6 THEN RAISE EXCEPTION 'Choose a day within this week' USING ERRCODE='22023'; END IF;
  UPDATE public.wellness_commitments SET completed_dates=CASE WHEN p_completed THEN
    ARRAY(SELECT DISTINCT day FROM unnest(completed_dates||p_date) day ORDER BY day)
    ELSE array_remove(completed_dates,p_date) END WHERE user_id=p_user AND week=p_week;
  IF NOT FOUND THEN RAISE EXCEPTION 'Set your commitment first' USING ERRCODE='P0002'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.fitsync_commitment_checkin(UUID,DATE,DATE,BOOLEAN) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fitsync_commitment_checkin(UUID,DATE,DATE,BOOLEAN) TO service_role;
CREATE OR REPLACE FUNCTION public.fitsync_create_invite(p_user UUID,p_hash TEXT,p_expires TIMESTAMPTZ) RETURNS VOID
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE existing public.accountability_partners;
BEGIN
  PERFORM 1 FROM public.app_users WHERE id=p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found' USING ERRCODE='P0002'; END IF;
  SELECT * INTO existing FROM public.accountability_partners WHERE owner_id=p_user FOR UPDATE;
  IF existing.partner_id IS NOT NULL THEN RAISE EXCEPTION 'Disconnect your current outgoing partner first' USING ERRCODE='40001'; END IF;
  INSERT INTO public.accountability_partners(owner_id,partner_id,token_hash,expires_at) VALUES(p_user,NULL,p_hash,p_expires)
    ON CONFLICT(owner_id) DO UPDATE SET token_hash=EXCLUDED.token_hash,expires_at=EXCLUDED.expires_at WHERE accountability_partners.partner_id IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.fitsync_create_invite(UUID,TEXT,TIMESTAMPTZ) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fitsync_create_invite(UUID,TEXT,TIMESTAMPTZ) TO service_role;
CREATE OR REPLACE FUNCTION public.fitsync_join_partner(p_user UUID,p_hash TEXT) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE invitation public.accountability_partners;
BEGIN
  SELECT * INTO invitation FROM public.accountability_partners WHERE token_hash=p_hash AND expires_at>now() AND partner_id IS NULL FOR UPDATE;
  IF NOT FOUND OR invitation.owner_id=p_user THEN RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='P0001'; END IF;
  UPDATE public.accountability_partners SET partner_id=p_user,token_hash=NULL WHERE id=invitation.id;
  RETURN invitation.id;
END $$;
REVOKE ALL ON FUNCTION public.fitsync_join_partner(UUID,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fitsync_join_partner(UUID,TEXT) TO service_role;
COMMIT;
