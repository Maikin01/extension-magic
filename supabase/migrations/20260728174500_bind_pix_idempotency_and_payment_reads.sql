BEGIN;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS request_fingerprint text;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_request_fingerprint_sha256;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_request_fingerprint_sha256
  CHECK (
    request_fingerprint IS NULL
    OR request_fingerprint ~ '^[0-9a-f]{64}$'
  );

COMMENT ON COLUMN public.payments.request_fingerprint IS
  'SHA-256 do payload canônico associado à chave de idempotência; não contém o CPF em claro.';

-- Revendedores consomem somente o DTO agregado da Edge Function. A tabela de
-- pagamentos contém PII e resposta bruta do provedor e não deve ser lida por indicação.
DROP POLICY IF EXISTS "Users read own payments" ON public.payments;
CREATE POLICY "Users read own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- Reserva transacional de um único teste por usuário. O UPDATE na linha do
-- perfil serializa chamadas concorrentes e a função insere a licença na mesma
-- transação, sem janela entre "verificar" e "criar".
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_claimed_at timestamptz;

REVOKE INSERT, UPDATE ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT INSERT (id, full_name, avatar_url) ON public.profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url) ON public.profiles TO authenticated;

UPDATE public.profiles AS profile
SET trial_claimed_at = claims.first_claimed_at
FROM (
  SELECT license.user_id, min(license.created_at) AS first_claimed_at
  FROM public.licenses AS license
  JOIN public.plans AS plan ON plan.id = license.plan_id
  WHERE plan.slug = 'trial'
  GROUP BY license.user_id
) AS claims
WHERE profile.id = claims.user_id
  AND profile.trial_claimed_at IS NULL;

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

  IF p_expires_at <= now() OR p_expires_at > now() + interval '1 hour' THEN
    RAISE EXCEPTION 'invalid trial expiration' USING ERRCODE = '22023';
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
      'active',
      now(),
      p_expires_at
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

-- A transição do pagamento e a revogação por estorno são atômicas. Estados
-- pré-aprovação nunca rebaixam um pagamento já aprovado ou estornado.
CREATE OR REPLACE FUNCTION public.apply_payment_status(
  p_payment_id uuid,
  p_provider_payment_id text,
  p_status text,
  p_raw jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_effective_status text;
  v_terminal constant text[] := ARRAY['refunded', 'charged_back', 'cancelled'];
  v_preapproval constant text[] := ARRAY[
    'pending', 'authorized', 'in_process', 'in_mediation', 'rejected'
  ];
BEGIN
  IF p_status <> ALL (v_terminal)
     AND p_status <> 'approved'
     AND p_status <> ALL (v_preapproval) THEN
    RAISE EXCEPTION 'unsupported payment status' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'payment not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_payment.provider_payment_id IS NOT NULL
     AND v_payment.provider_payment_id <> p_provider_payment_id THEN
    RAISE EXCEPTION 'provider payment mismatch' USING ERRCODE = '22023';
  END IF;

  v_effective_status := p_status;
  IF v_payment.status = ANY (v_terminal) AND p_status <> ALL (v_terminal) THEN
    v_effective_status := v_payment.status;
  ELSIF v_payment.status = 'approved' AND p_status = ANY (v_preapproval) THEN
    v_effective_status := v_payment.status;
  END IF;

  UPDATE public.payments
  SET
    status = v_effective_status,
    provider_payment_id = p_provider_payment_id,
    raw = CASE WHEN v_effective_status = p_status THEN p_raw ELSE raw END,
    paid_at = CASE
      WHEN v_effective_status = 'approved' THEN coalesce(paid_at, now())
      ELSE paid_at
    END
  WHERE id = p_payment_id;

  IF v_effective_status = ANY (v_terminal) AND v_payment.license_id IS NOT NULL THEN
    UPDATE public.licenses
    SET status = 'revoked'
    WHERE id = v_payment.license_id
      AND status <> 'revoked';
  END IF;

  RETURN v_effective_status;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_payment_status(uuid, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_payment_status(uuid, text, text, jsonb)
  TO service_role;

-- A licença e o vínculo ao pagamento são gravados na mesma transação, com a
-- linha de pagamentos bloqueada para impedir duplicação em webhooks concorrentes.
CREATE OR REPLACE FUNCTION public.finalize_approved_payment(
  p_payment_id uuid,
  p_license_key text,
  p_license_key_hash text
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_existing_key text;
  v_license_id uuid;
BEGIN
  SELECT *
  INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF v_payment.id IS NULL OR v_payment.status <> 'approved' THEN
    RETURN NULL;
  END IF;
  IF v_payment.user_id IS NULL THEN
    RAISE EXCEPTION 'approved payment has no user' USING ERRCODE = '23502';
  END IF;

  IF v_payment.license_id IS NOT NULL THEN
    SELECT license_key
    INTO v_existing_key
    FROM public.licenses
    WHERE id = v_payment.license_id;
    RETURN v_existing_key;
  END IF;

  INSERT INTO public.licenses (
    user_id,
    plan_id,
    license_key,
    license_key_hash,
    status,
    notes
  )
  VALUES (
    v_payment.user_id,
    v_payment.plan_id,
    p_license_key,
    p_license_key_hash,
    'pending',
    'Pix MP ' || coalesce(v_payment.provider_payment_id, '') ||
      ' — ' || v_payment.buyer_name || ' (' || v_payment.buyer_whatsapp || ')'
  )
  RETURNING id INTO v_license_id;

  UPDATE public.payments
  SET
    license_id = v_license_id,
    paid_at = coalesce(paid_at, now())
  WHERE id = v_payment.id;

  RETURN p_license_key;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_approved_payment(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_approved_payment(uuid, text, text)
  TO service_role;

-- A licença é bloqueada durante a ativação e a reserva de dispositivo. Assim,
-- ativações concorrentes não conseguem ultrapassar max_devices.
CREATE OR REPLACE FUNCTION public.activate_license_device(
  p_license_id uuid,
  p_device_hash text,
  p_browser text,
  p_os text,
  p_ext_version text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_license public.licenses%ROWTYPE;
  v_plan public.plans%ROWTYPE;
  v_device public.devices%ROWTYPE;
  v_duration_seconds bigint;
  v_max_devices integer;
  v_active_devices integer;
BEGIN
  IF p_device_hash IS NULL OR length(p_device_hash) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION 'invalid device hash' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_license
  FROM public.licenses
  WHERE id = p_license_id
  FOR UPDATE;
  IF v_license.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found', 'http_status', 404);
  END IF;

  SELECT * INTO v_plan FROM public.plans WHERE id = v_license.plan_id;
  IF v_license.status IN ('revoked', 'suspended', 'expired') THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', v_license.status,
      'http_status', 403
    );
  END IF;

  IF v_license.status = 'pending' THEN
    v_duration_seconds := coalesce(
      v_license.custom_duration_seconds,
      v_license.custom_duration_minutes * 60,
      v_plan.duration_minutes * 60,
      v_plan.duration_days::bigint * 86400
    );
    IF v_duration_seconds IS NULL OR v_duration_seconds < 1 THEN
      RETURN jsonb_build_object(
        'valid', false,
        'reason', 'error',
        'message', 'Não foi possível ativar a licença',
        'http_status', 500
      );
    END IF;
    UPDATE public.licenses
    SET
      status = 'active',
      activated_at = now(),
      expires_at = now() + make_interval(secs => v_duration_seconds)
    WHERE id = v_license.id
    RETURNING * INTO v_license;
  END IF;

  IF v_license.expires_at IS NOT NULL AND v_license.expires_at <= now() THEN
    UPDATE public.licenses SET status = 'expired' WHERE id = v_license.id;
    RETURN jsonb_build_object('valid', false, 'reason', 'expired', 'http_status', 403);
  END IF;

  v_max_devices := greatest(
    1,
    coalesce(v_license.max_devices_override, v_plan.max_devices, 1)
  );
  SELECT *
  INTO v_device
  FROM public.devices
  WHERE license_id = v_license.id
    AND device_hash = p_device_hash;

  IF v_device.id IS NOT NULL AND v_device.is_revoked THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'device_mismatch',
      'message', 'Dispositivo revogado',
      'http_status', 403
    );
  ELSIF v_device.id IS NOT NULL THEN
    UPDATE public.devices
    SET
      last_seen_at = now(),
      browser = coalesce(p_browser, browser),
      os = coalesce(p_os, os),
      ext_version = coalesce(p_ext_version, ext_version)
    WHERE id = v_device.id;
  ELSE
    SELECT count(*)::integer
    INTO v_active_devices
    FROM public.devices
    WHERE license_id = v_license.id
      AND is_revoked = false;
    IF v_active_devices >= v_max_devices THEN
      RETURN jsonb_build_object(
        'valid', false,
        'reason', 'device_limit',
        'message', 'Limite de ' || v_max_devices || ' dispositivos atingido',
        'http_status', 403
      );
    END IF;
    INSERT INTO public.devices (
      license_id,
      device_hash,
      browser,
      os,
      ext_version
    ) VALUES (
      v_license.id,
      p_device_hash,
      p_browser,
      p_os,
      p_ext_version
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'user_id', v_license.user_id,
    'plan', coalesce(v_plan.slug, 'custom'),
    'plan_name', coalesce(v_plan.name, 'Personalizado'),
    'features', coalesce(v_plan.features, '[]'::jsonb),
    'expires_at', v_license.expires_at,
    'activated_at', v_license.activated_at,
    'max_devices', v_max_devices
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_license_device(uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_license_device(uuid, text, text, text, text)
  TO service_role;

COMMIT;
