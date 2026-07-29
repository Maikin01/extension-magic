CREATE TABLE public.risecheckout_reseller_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'risecheckout'
    CHECK (provider = 'risecheckout'),
  order_id text NOT NULL CHECK (length(btrim(order_id)) BETWEEN 1 AND 160),
  order_item_id text NOT NULL CHECK (length(btrim(order_item_id)) BETWEEN 1 AND 160),
  last_event_type text NOT NULL CHECK (length(btrim(last_event_type)) BETWEEN 1 AND 80),
  product_id text,
  product_name text NOT NULL,
  email_normalized text NOT NULL
    CHECK (
      email_normalized = lower(btrim(email_normalized))
      AND length(email_normalized) BETWEEN 3 AND 255
    ),
  customer_name text,
  status text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('approved', 'refunded', 'chargeback', 'revoked')),
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

CREATE INDEX risecheckout_reseller_entitlements_email_status_idx
  ON public.risecheckout_reseller_entitlements (email_normalized, status);

CREATE INDEX risecheckout_reseller_entitlements_claimed_by_idx
  ON public.risecheckout_reseller_entitlements (claimed_by)
  WHERE claimed_by IS NOT NULL;

ALTER TABLE public.risecheckout_reseller_entitlements ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.risecheckout_reseller_entitlements FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.risecheckout_reseller_entitlements TO service_role;

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
    RETURN jsonb_build_object(
      'eligible', false,
      'account_exists', false,
      'already_claimed', false
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.risecheckout_reseller_entitlements entitlement
     WHERE entitlement.email_normalized = normalized_email
       AND entitlement.status = 'approved'
       AND entitlement.claimed_by IS NULL
  ) INTO eligible_purchase;

  SELECT EXISTS (
    SELECT 1
      FROM auth.users user_account
     WHERE lower(btrim(coalesce(user_account.email, ''))) = normalized_email
  ) INTO existing_account;

  SELECT EXISTS (
    SELECT 1
      FROM public.risecheckout_reseller_entitlements entitlement
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

REVOKE ALL ON FUNCTION public.get_reseller_signup_status(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_reseller_signup_status(text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.claim_reseller_entitlements(
  p_user_id uuid,
  p_email text
)
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
    SELECT 1
      FROM auth.users user_account
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

REVOKE ALL ON FUNCTION public.claim_reseller_entitlements(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_reseller_entitlements(uuid, text)
  TO service_role;

COMMENT ON TABLE public.risecheckout_reseller_entitlements IS
  'Compras do produto Revenda lovable recebidas por webhook assinado do RiseCheckout.';

COMMENT ON FUNCTION public.claim_reseller_entitlements(uuid, text) IS
  'Vincula atomicamente uma compra aprovada ao dono autenticado do mesmo email e concede a role revendedor.';
