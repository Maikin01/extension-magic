BEGIN;

-- A reserva do teste continua atômica e única por usuário, mas o relógio só
-- começa quando a extensão ativa a licença via activate_license_device.
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

  SELECT license.*
  INTO v_license
  FROM public.licenses AS license
  JOIN public.plans AS plan ON plan.id = license.plan_id
  WHERE license.user_id = p_user_id
    AND plan.slug = 'trial'
  ORDER BY license.created_at ASC
  LIMIT 1;

  IF v_license.id IS NOT NULL THEN
    UPDATE public.profiles
    SET trial_claimed_at = coalesce(trial_claimed_at, v_license.created_at)
    WHERE id = p_user_id;
    RETURN jsonb_build_object(
      'license', to_jsonb(v_license),
      'existed', true
    );
  END IF;

  UPDATE public.profiles
  SET trial_claimed_at = now()
  WHERE id = p_user_id
    AND trial_claimed_at IS NULL;
  v_claimed_now := FOUND;

  IF v_claimed_now THEN
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
  ELSE
    SELECT license.*
    INTO v_license
    FROM public.licenses AS license
    JOIN public.plans AS plan ON plan.id = license.plan_id
    WHERE license.user_id = p_user_id
      AND plan.slug = 'trial'
    ORDER BY license.created_at ASC
    LIMIT 1;

    IF v_license.id IS NULL THEN
      RAISE EXCEPTION 'trial claim exists without a license';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'license', to_jsonb(v_license),
    'existed', NOT v_claimed_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_trial_license(uuid, uuid, text, text, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_trial_license(uuid, uuid, text, text, timestamptz)
  TO service_role;

COMMIT;
