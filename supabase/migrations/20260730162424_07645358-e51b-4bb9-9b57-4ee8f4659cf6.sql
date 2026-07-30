BEGIN;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS client_request_id uuid;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS request_fingerprint text;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_request_fingerprint_sha256;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_request_fingerprint_sha256
  CHECK (request_fingerprint IS NULL OR request_fingerprint ~ '^[0-9a-f]{64}$');

CREATE UNIQUE INDEX IF NOT EXISTS payments_user_client_request_uidx
  ON public.payments (user_id, client_request_id)
  WHERE user_id IS NOT NULL AND client_request_id IS NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_claimed_at timestamptz;

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
  v_preapproval constant text[] := ARRAY['pending', 'authorized', 'in_process', 'in_mediation', 'rejected'];
BEGIN
  IF p_status <> ALL (v_terminal)
     AND p_status <> 'approved'
     AND p_status <> ALL (v_preapproval) THEN
    RAISE EXCEPTION 'unsupported payment status' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;

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
    paid_at = CASE WHEN v_effective_status = 'approved' THEN coalesce(paid_at, now()) ELSE paid_at END
  WHERE id = p_payment_id;

  IF v_effective_status = ANY (v_terminal) AND v_payment.license_id IS NOT NULL THEN
    UPDATE public.licenses
    SET status = 'revoked'
    WHERE id = v_payment.license_id AND status <> 'revoked';
  END IF;

  RETURN v_effective_status;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_payment_status(uuid, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_payment_status(uuid, text, text, jsonb) TO service_role;

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

  SELECT * INTO v_license FROM public.licenses WHERE id = p_license_id FOR UPDATE;
  IF v_license.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found', 'http_status', 404);
  END IF;

  SELECT * INTO v_plan FROM public.plans WHERE id = v_license.plan_id;
  IF v_license.status IN ('revoked', 'suspended', 'expired') THEN
    RETURN jsonb_build_object('valid', false, 'reason', v_license.status, 'http_status', 403);
  END IF;

  IF v_license.status = 'pending' THEN
    v_duration_seconds := coalesce(
      v_license.custom_duration_seconds,
      v_license.custom_duration_minutes * 60,
      v_plan.duration_minutes * 60,
      v_plan.duration_days::bigint * 86400
    );
    IF v_duration_seconds IS NULL OR v_duration_seconds < 1 THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'error', 'message', 'Não foi possível ativar a licença', 'http_status', 500);
    END IF;
    UPDATE public.licenses
    SET status = 'active',
        activated_at = now(),
        expires_at = now() + make_interval(secs => v_duration_seconds)
    WHERE id = v_license.id
    RETURNING * INTO v_license;
  END IF;

  IF v_license.expires_at IS NOT NULL AND v_license.expires_at <= now() THEN
    UPDATE public.licenses SET status = 'expired' WHERE id = v_license.id;
    RETURN jsonb_build_object('valid', false, 'reason', 'expired', 'http_status', 403);
  END IF;

  v_max_devices := greatest(1, coalesce(v_license.max_devices_override, v_plan.max_devices, 1));
  SELECT * INTO v_device
  FROM public.devices
  WHERE license_id = v_license.id AND device_hash = p_device_hash;

  IF v_device.id IS NOT NULL AND v_device.is_revoked THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'device_mismatch', 'message', 'Dispositivo revogado', 'http_status', 403);
  ELSIF v_device.id IS NOT NULL THEN
    UPDATE public.devices
    SET last_seen_at = now(),
        browser = coalesce(p_browser, browser),
        os = coalesce(p_os, os),
        ext_version = coalesce(p_ext_version, ext_version)
    WHERE id = v_device.id;
  ELSE
    SELECT count(*)::integer INTO v_active_devices
    FROM public.devices
    WHERE license_id = v_license.id AND is_revoked = false;
    IF v_active_devices >= v_max_devices THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'device_limit', 'message', 'Limite de ' || v_max_devices || ' dispositivos atingido', 'http_status', 403);
    END IF;
    INSERT INTO public.devices (license_id, device_hash, browser, os, ext_version)
    VALUES (v_license.id, p_device_hash, p_browser, p_os, p_ext_version);
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
GRANT EXECUTE ON FUNCTION public.activate_license_device(uuid, text, text, text, text) TO service_role;

CREATE TABLE IF NOT EXISTS public.risecheckout_reseller_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'risecheckout' CHECK (provider = 'risecheckout'),
  order_id text NOT NULL CHECK (length(btrim(order_id)) BETWEEN 1 AND 160),
  order_item_id text NOT NULL CHECK (length(btrim(order_item_id)) BETWEEN 1 AND 160),
  last_event_type text NOT NULL CHECK (length(btrim(last_event_type)) BETWEEN 1 AND 80),
  product_id text,
  product_name text NOT NULL,
  email_normalized text NOT NULL CHECK (
    email_normalized = lower(btrim(email_normalized))
    AND length(email_normalized) BETWEEN 3 AND 255
  ),
  customer_name text,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'refunded', 'chargeback', 'revoked')),
  amount_cents integer CHECK (amount_cents IS NULL OR amount_cents >= 0),
  currency text,
  paid_at timestamptz,
  event_created_at timestamptz,
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  raw_payload jsonb NOT NULL,
  last_event_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, order_id, order_item_id)
);

CREATE INDEX IF NOT EXISTS risecheckout_reseller_entitlements_email_status_idx
  ON public.risecheckout_reseller_entitlements (email_normalized, status);
CREATE INDEX IF NOT EXISTS risecheckout_reseller_entitlements_claimed_by_idx
  ON public.risecheckout_reseller_entitlements (claimed_by)
  WHERE claimed_by IS NOT NULL;

ALTER TABLE public.risecheckout_reseller_entitlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.risecheckout_reseller_entitlements FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.risecheckout_reseller_entitlements TO service_role;

DROP TRIGGER IF EXISTS trg_risecheckout_reseller_entitlements_updated_at
  ON public.risecheckout_reseller_entitlements;
CREATE TRIGGER trg_risecheckout_reseller_entitlements_updated_at
  BEFORE UPDATE ON public.risecheckout_reseller_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.get_reseller_signup_status(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  normalized_email text := lower(btrim(coalesce(p_email, '')));
  eligible_purchase boolean;
  existing_account boolean;
  already_claimed boolean;
BEGIN
  IF normalized_email = '' OR length(normalized_email) > 255 THEN
    RETURN jsonb_build_object('eligible', false, 'account_exists', false, 'already_claimed', false);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.risecheckout_reseller_entitlements entitlement
     WHERE entitlement.email_normalized = normalized_email
       AND entitlement.status = 'approved'
       AND entitlement.claimed_by IS NULL
  ) INTO eligible_purchase;

  SELECT EXISTS (
    SELECT 1 FROM auth.users user_account
     WHERE lower(btrim(coalesce(user_account.email, ''))) = normalized_email
  ) INTO existing_account;

  SELECT EXISTS (
    SELECT 1 FROM public.risecheckout_reseller_entitlements entitlement
     WHERE entitlement.email_normalized = normalized_email
       AND entitlement.claimed_by IS NOT NULL
  ) INTO already_claimed;

  RETURN jsonb_build_object(
    'eligible', eligible_purchase,
    'account_exists', existing_account,
    'already_claimed', already_claimed
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_reseller_signup_status(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_reseller_signup_status(text) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_reseller_entitlements(p_user_id uuid, p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  normalized_email text := lower(btrim(coalesce(p_email, '')));
  matching_rows integer := 0;
BEGIN
  IF p_user_id IS NULL OR normalized_email = '' THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users user_account
     WHERE user_account.id = p_user_id
       AND lower(btrim(coalesce(user_account.email, ''))) = normalized_email
  ) THEN
    RETURN false;
  END IF;

  PERFORM entitlement.id
    FROM public.risecheckout_reseller_entitlements entitlement
   WHERE entitlement.email_normalized = normalized_email
     AND entitlement.status = 'approved'
     AND (entitlement.claimed_by IS NULL OR entitlement.claimed_by = p_user_id)
   FOR UPDATE;

  UPDATE public.risecheckout_reseller_entitlements entitlement
     SET claimed_by = p_user_id,
         claimed_at = coalesce(entitlement.claimed_at, now())
   WHERE entitlement.email_normalized = normalized_email
     AND entitlement.status = 'approved'
     AND (entitlement.claimed_by IS NULL OR entitlement.claimed_by = p_user_id);

  GET DIAGNOSTICS matching_rows = ROW_COUNT;
  IF matching_rows = 0 THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'revendedor'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_reseller_entitlements(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_reseller_entitlements(uuid, text) TO service_role;

COMMIT;