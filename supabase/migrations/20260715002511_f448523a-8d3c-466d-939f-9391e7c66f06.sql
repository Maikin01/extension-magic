ALTER TABLE public.licenses ALTER COLUMN plan_id DROP NOT NULL;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS custom_duration_seconds integer;