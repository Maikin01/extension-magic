BEGIN;

ALTER TABLE public.trial_license_claims
  DROP CONSTRAINT IF EXISTS trial_license_claims_license_id_fkey,
  DROP CONSTRAINT IF EXISTS trial_license_claims_plan_id_fkey;

ALTER TABLE public.trial_license_claims
  ADD CONSTRAINT trial_license_claims_license_id_fkey
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE SET NULL,
  ADD CONSTRAINT trial_license_claims_plan_id_fkey
  FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE RESTRICT;

COMMIT;