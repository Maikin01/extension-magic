ALTER TABLE public.marketplace_orders
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'mercadopago',
  ADD COLUMN IF NOT EXISTS provider_payment_id text,
  ADD COLUMN IF NOT EXISTS client_request_id uuid,
  ADD COLUMN IF NOT EXISTS qr_code text,
  ADD COLUMN IF NOT EXISTS qr_code_base64 text,
  ADD COLUMN IF NOT EXISTS ticket_url text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_name text,
  ADD COLUMN IF NOT EXISTS buyer_whatsapp text,
  ADD COLUMN IF NOT EXISTS buyer_email text,
  ADD COLUMN IF NOT EXISTS raw jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS marketplace_orders_buyer_request_idx
  ON public.marketplace_orders (buyer_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS marketplace_orders_provider_payment_idx
  ON public.marketplace_orders (provider_payment_id);