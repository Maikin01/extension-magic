BEGIN;

CREATE TABLE IF NOT EXISTS public.trial_license_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  license_id uuid,
  plan_id uuid NOT NULL,
  license_key text NOT NULL,
  license_key_hash text NOT NULL,
  license_status public.license_status NOT NULL DEFAULT 'pending',
  activated_at timestamptz,
  expires_at timestamptz,
  source text NOT NULL DEFAULT 'claim',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trial_license_claims TO service_role;

ALTER TABLE public.trial_license_claims ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_trial_license_claims_updated_at ON public.trial_license_claims;
CREATE TRIGGER set_trial_license_claims_updated_at
BEFORE UPDATE ON public.trial_license_claims
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.trial_license_claims (
  user_id,
  license_id,
  plan_id,
  license_key,
  license_key_hash,
  license_status,
  activated_at,
  expires_at,
  source,
  created_at,
  updated_at
)
SELECT DISTINCT ON (license.user_id)
  license.user_id,
  license.id,
  license.plan_id,
  license.license_key,
  license.license_key_hash,
  license.status,
  license.activated_at,
  license.expires_at,
  'backfill',
  license.created_at,
  now()
FROM public.licenses AS license
JOIN public.plans AS plan ON plan.id = license.plan_id
WHERE license.user_id IS NOT NULL
  AND plan.slug = 'trial'
ORDER BY license.user_id, license.created_at ASC
ON CONFLICT (user_id) DO UPDATE SET
  license_id = COALESCE(public.trial_license_claims.license_id, EXCLUDED.license_id),
  plan_id = EXCLUDED.plan_id,
  license_key = COALESCE(public.trial_license_claims.license_key, EXCLUDED.license_key),
  license_key_hash = COALESCE(public.trial_license_claims.license_key_hash, EXCLUDED.license_key_hash),
  license_status = EXCLUDED.license_status,
  activated_at = EXCLUDED.activated_at,
  expires_at = EXCLUDED.expires_at,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.claim_trial_license(
  p_user_id uuid,
  p_plan_id uuid,
  p_license_key text,
  p_license_key_hash text,
  p_expires_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_claimed_now boolean := false;
  v_license public.licenses%ROWTYPE;
  v_claim public.trial_license_claims%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.plans
    WHERE id = p_plan_id
      AND slug = 'trial'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'invalid trial plan' USING ERRCODE = '22023';
  END IF;

  IF p_expires_at IS NOT NULL THEN
    RAISE EXCEPTION 'trial expiration must start on activation' USING ERRCODE = '22023';
  END IF;

  PERFORM 1
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT claim.*
  INTO v_claim
  FROM public.trial_license_claims AS claim
  WHERE claim.user_id = p_user_id
  LIMIT 1;

  IF v_claim.id IS NOT NULL THEN
    SELECT license.*
    INTO v_license
    FROM public.licenses AS license
    WHERE license.id = v_claim.license_id
    LIMIT 1;

    UPDATE public.profiles
    SET trial_claimed_at = coalesce(trial_claimed_at, v_claim.created_at)
    WHERE id = p_user_id;

    IF v_license.id IS NOT NULL THEN
      RETURN jsonb_build_object('license', to_jsonb(v_license), 'existed', true);
    END IF;

    RETURN jsonb_build_object(
      'license', jsonb_build_object(
        'id', v_claim.id,
        'user_id', v_claim.user_id,
        'plan_id', v_claim.plan_id,
        'license_key', v_claim.license_key,
        'license_key_hash', v_claim.license_key_hash,
        'status', 'revoked',
        'activated_at', v_claim.activated_at,
        'expires_at', v_claim.expires_at,
        'created_at', v_claim.created_at,
        'updated_at', v_claim.updated_at,
        'notes', 'Teste grátis já gerado anteriormente',
        'custom_duration_minutes', NULL,
        'custom_duration_seconds', NULL,
        'max_devices_override', NULL,
        'is_deleted', true
      ),
      'existed', true,
      'deleted', true
    );
  END IF;

  SELECT license.*
  INTO v_license
  FROM public.licenses AS license
  JOIN public.plans AS plan ON plan.id = license.plan_id
  WHERE license.user_id = p_user_id
    AND plan.slug = 'trial'
  ORDER BY license.created_at ASC
  LIMIT 1;

  IF v_license.id IS NOT NULL THEN
    INSERT INTO public.trial_license_claims (
      user_id,
      license_id,
      plan_id,
      license_key,
      license_key_hash,
      license_status,
      activated_at,
      expires_at,
      source,
      created_at,
      updated_at
    )
    VALUES (
      p_user_id,
      v_license.id,
      v_license.plan_id,
      v_license.license_key,
      v_license.license_key_hash,
      v_license.status,
      v_license.activated_at,
      v_license.expires_at,
      'existing_license',
      v_license.created_at,
      now()
    )
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE public.profiles
    SET trial_claimed_at = coalesce(trial_claimed_at, v_license.created_at)
    WHERE id = p_user_id;

    RETURN jsonb_build_object('license', to_jsonb(v_license), 'existed', true);
  END IF;

  UPDATE public.profiles
  SET trial_claimed_at = now()
  WHERE id = p_user_id
    AND trial_claimed_at IS NULL;
  v_claimed_now := FOUND;

  IF NOT v_claimed_now THEN
    INSERT INTO public.trial_license_claims (
      user_id,
      plan_id,
      license_key,
      license_key_hash,
      license_status,
      source
    )
    VALUES (
      p_user_id,
      p_plan_id,
      p_license_key,
      p_license_key_hash,
      'revoked',
      'profile_previously_claimed'
    )
    ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
    RETURNING * INTO v_claim;

    RETURN jsonb_build_object(
      'license', jsonb_build_object(
        'id', v_claim.id,
        'user_id', v_claim.user_id,
        'plan_id', v_claim.plan_id,
        'license_key', v_claim.license_key,
        'license_key_hash', v_claim.license_key_hash,
        'status', 'revoked',
        'activated_at', NULL,
        'expires_at', NULL,
        'created_at', v_claim.created_at,
        'updated_at', v_claim.updated_at,
        'notes', 'Teste grátis já gerado anteriormente',
        'custom_duration_minutes', NULL,
        'custom_duration_seconds', NULL,
        'max_devices_override', NULL,
        'is_deleted', true
      ),
      'existed', true,
      'deleted', true
    );
  END IF;

  INSERT INTO public.licenses (
    user_id,
    plan_id,
    license_key,
    license_key_hash,
    status,
    activated_at,
    expires_at
  )
  VALUES (
    p_user_id,
    p_plan_id,
    p_license_key,
    p_license_key_hash,
    'pending',
    NULL,
    NULL
  )
  RETURNING * INTO v_license;

  INSERT INTO public.trial_license_claims (
    user_id,
    license_id,
    plan_id,
    license_key,
    license_key_hash,
    license_status,
    activated_at,
    expires_at,
    source,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    v_license.id,
    v_license.plan_id,
    v_license.license_key,
    v_license.license_key_hash,
    v_license.status,
    v_license.activated_at,
    v_license.expires_at,
    'claim',
    v_license.created_at,
    now()
  );

  RETURN jsonb_build_object(
    'license', to_jsonb(v_license),
    'existed', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_trial_license(uuid, uuid, text, text, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_trial_license(uuid, uuid, text, text, timestamptz)
  TO service_role;

COMMIT;