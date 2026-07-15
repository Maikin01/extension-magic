CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  license_id uuid REFERENCES public.licenses(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'mercadopago',
  provider_payment_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  amount_cents integer NOT NULL,
  buyer_name text NOT NULL,
  buyer_whatsapp text NOT NULL,
  buyer_email text,
  qr_code text,
  qr_code_base64 text,
  ticket_url text,
  expires_at timestamptz,
  paid_at timestamptz,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX payments_status_idx ON public.payments(status);
CREATE INDEX payments_provider_payment_id_idx ON public.payments(provider_payment_id);
CREATE INDEX payments_created_at_idx ON public.payments(created_at DESC);

CREATE TRIGGER set_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();