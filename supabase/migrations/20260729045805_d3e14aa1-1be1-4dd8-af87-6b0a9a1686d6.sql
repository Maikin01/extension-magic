BEGIN;

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
  v_existing_license_id uuid;
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
    SELECT id, license_key
    INTO v_existing_license_id, v_existing_key
    FROM public.licenses
    WHERE id = v_payment.license_id;

    IF v_existing_key IS NOT NULL THEN
      UPDATE public.payments
      SET paid_at = coalesce(paid_at, now())
      WHERE id = v_payment.id;
      RETURN v_existing_key;
    END IF;

    UPDATE public.payments
    SET license_id = NULL
    WHERE id = v_payment.id;
  END IF;

  SELECT license.id, license.license_key
  INTO v_existing_license_id, v_existing_key
  FROM public.licenses AS license
  WHERE license.notes ILIKE '%' || v_payment.id::text || '%'
     OR (
       v_payment.provider_payment_id IS NOT NULL
       AND license.notes ILIKE '%' || v_payment.provider_payment_id || '%'
     )
  ORDER BY license.created_at ASC
  LIMIT 1;

  IF v_existing_key IS NOT NULL THEN
    UPDATE public.payments
    SET license_id = v_existing_license_id,
        paid_at = coalesce(paid_at, now())
    WHERE id = v_payment.id;
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
      ' — pagamento ' || v_payment.id::text ||
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

COMMIT;