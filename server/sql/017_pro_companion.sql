-- Synced Pro companion. Apply after 012 and 014 before deploying its API.
-- All personal tables are service-role-only; API ownership comes from its verified session.
BEGIN;
CREATE TABLE IF NOT EXISTS public.companion_records (
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  id text NOT NULL CHECK(id ~ '^[A-Za-z0-9_-]{1,100}$'),
  kind text NOT NULL CHECK(kind IN ('readiness','goal','reminders','experiment','specialisation')),
  date date,
  data jsonb NOT NULL CHECK(jsonb_typeof(data)='object' AND octet_length(data::text)<=16384),
  revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
  deleted boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,id),
  CHECK(kind<>'readiness' OR date IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS companion_readiness_day ON public.companion_records(user_id,date) WHERE kind='readiness' AND NOT deleted;
CREATE UNIQUE INDEX IF NOT EXISTS companion_reminder_preferences ON public.companion_records(user_id) WHERE kind='reminders' AND NOT deleted;
CREATE INDEX IF NOT EXISTS companion_records_owner_updated ON public.companion_records(user_id,updated_at);

CREATE TABLE IF NOT EXISTS public.companion_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  date date NOT NULL,
  view text NOT NULL CHECK(view IN ('front','side','back')),
  caption text NOT NULL DEFAULT '' CHECK(length(caption)<=300),
  storage_path text NOT NULL UNIQUE,
  width integer NOT NULL CHECK(width BETWEEN 1 AND 2400),
  height integer NOT NULL CHECK(height BETWEEN 1 AND 2400),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(storage_path LIKE user_id::text || '/%')
);
CREATE INDEX IF NOT EXISTS companion_photos_owner_date ON public.companion_photos(user_id,date DESC,id);
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('progress-photos','progress-photos',false,3145728,ARRAY['image/webp']::text[])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;
-- No public storage policies: only backend-generated short-lived URLs grant image access.

CREATE TABLE IF NOT EXISTS public.companion_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  label text NOT NULL CHECK(length(label) BETWEEN 1 AND 120),
  token_hash text NOT NULL UNIQUE CHECK(token_hash ~ '^[a-f0-9]{64}$'),
  fields text[] NOT NULL CHECK(cardinality(fields) BETWEEN 1 AND 2 AND fields <@ ARRAY['workouts','plan']::text[]),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(expires_at>created_at AND expires_at<=created_at+interval '31 days')
);
CREATE INDEX IF NOT EXISTS companion_shares_owner ON public.companion_shares(user_id,created_at);

ALTER TABLE public.companion_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companion_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companion_shares ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.companion_records,public.companion_photos,public.companion_shares FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.companion_records,public.companion_photos,public.companion_shares TO service_role;

-- Compare-and-set mutations serialize per record. Tombstones prevent stale device resurrection.
CREATE OR REPLACE FUNCTION public.save_fitsync_companion_record(
  p_user_id uuid,p_id text,p_kind text,p_date date,p_data jsonb,p_expected_revision integer,p_delete boolean DEFAULT false
) RETURNS public.companion_records LANGUAGE plpgsql SET search_path=public AS $$
DECLARE saved public.companion_records; metric_name text; metric_value numeric; metric_observed timestamptz;
BEGIN
  IF p_expected_revision<0 OR p_expected_revision>=2147483647 THEN RAISE EXCEPTION 'Invalid companion revision' USING ERRCODE='22023'; END IF;
  IF p_delete THEN
    UPDATE public.companion_records SET deleted=true,data='{}'::jsonb,revision=revision+1,updated_at=clock_timestamp()
      WHERE user_id=p_user_id AND id=p_id AND revision=p_expected_revision AND NOT deleted RETURNING * INTO saved;
    IF NOT FOUND THEN RAISE EXCEPTION 'This item changed on another device. Refresh before deleting it.' USING ERRCODE='40001'; END IF;
  ELSIF p_expected_revision=0 THEN
    BEGIN
      INSERT INTO public.companion_records(user_id,id,kind,date,data) VALUES(p_user_id,p_id,p_kind,p_date,p_data) RETURNING * INTO saved;
    EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'This item already exists or changed on another device. Refresh before saving.' USING ERRCODE='40001'; END;
  ELSE
    UPDATE public.companion_records SET data=p_data,revision=revision+1,updated_at=clock_timestamp()
      WHERE user_id=p_user_id AND id=p_id AND kind=p_kind AND date IS NOT DISTINCT FROM p_date AND revision=p_expected_revision AND NOT deleted RETURNING * INTO saved;
    IF NOT FOUND THEN RAISE EXCEPTION 'This item changed on another device. Refresh before saving.' USING ERRCODE='40001'; END IF;
  END IF;
  -- Explicit sleep/energy readings commit with the check-in. Health remains canonical.
  -- Omitted readings and deleting a check-in preserve the user's health history.
  IF NOT p_delete AND p_kind='readiness' THEN
    FOREACH metric_name IN ARRAY ARRAY['sleep','energy'] LOOP
      IF (metric_name='sleep' AND p_data ? 'sleepHours') OR (metric_name='energy' AND p_data ? 'energy') THEN
        metric_value := (p_data->>(CASE WHEN metric_name='sleep' THEN 'sleepHours' ELSE 'energy' END))::numeric;
        IF metric_value IS NULL OR (metric_name='sleep' AND (metric_value<0 OR metric_value>24)) OR (metric_name='energy' AND (metric_value<1 OR metric_value>5 OR metric_value<>trunc(metric_value))) THEN
          RAISE EXCEPTION 'Invalid readiness health reading' USING ERRCODE='22023';
        END IF;
        SELECT greatest(clock_timestamp(),coalesce(max(observed_at)+interval '1 millisecond',clock_timestamp())) INTO metric_observed
          FROM public.progress_events WHERE user_id=p_user_id AND payload->>'kind'='metric' AND payload->>'metric'=metric_name AND payload->>'date'=to_char(p_date,'YYYY-MM-DD');
        INSERT INTO public.progress_events(user_id,id,observed_at,payload) VALUES(p_user_id,'companion_'||gen_random_uuid()::text,metric_observed,
          jsonb_build_object('kind','metric','metric',metric_name,'date',to_char(p_date,'YYYY-MM-DD'),'value',metric_value,'source','manual','notes','Readiness check-in'));
      END IF;
    END LOOP;
  END IF;
  RETURN saved;
END $$;
REVOKE ALL ON FUNCTION public.save_fitsync_companion_record(uuid,text,text,date,jsonb,integer,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_fitsync_companion_record(uuid,text,text,date,jsonb,integer,boolean) TO service_role;
COMMIT;
NOTIFY pgrst, 'reload schema';
