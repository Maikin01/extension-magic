CREATE TYPE public.marketplace_delivery_type AS ENUM ('link', 'text', 'file', 'manual');
CREATE TYPE public.marketplace_order_status AS ENUM ('pending', 'paid', 'delivered', 'cancelled');

CREATE TABLE public.marketplace_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  description text,
  category text NOT NULL DEFAULT 'Ferramentas',
  price_cents integer NOT NULL DEFAULT 0,
  old_price_cents integer,
  cover_url text,
  delivery_type public.marketplace_delivery_type NOT NULL DEFAULT 'link',
  delivery_content text,
  delivery_instructions text,
  stock integer,
  rating numeric(2,1) NOT NULL DEFAULT 5.0,
  is_active boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.marketplace_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.marketplace_products(id) ON DELETE RESTRICT,
  buyer_id uuid NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  status public.marketplace_order_status NOT NULL DEFAULT 'pending',
  buyer_note text,
  delivered_content text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketplace_orders_buyer ON public.marketplace_orders (buyer_id, created_at DESC);
CREATE INDEX idx_marketplace_orders_status ON public.marketplace_orders (status, created_at DESC);

GRANT ALL ON public.marketplace_products TO service_role;
GRANT ALL ON public.marketplace_orders TO service_role;

ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to marketplace products"
  ON public.marketplace_products AS RESTRICTIVE FOR ALL
  TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "No direct client access to marketplace orders"
  ON public.marketplace_orders AS RESTRICTIVE FOR ALL
  TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TRIGGER set_marketplace_products_updated_at
  BEFORE UPDATE ON public.marketplace_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_marketplace_orders_updated_at
  BEFORE UPDATE ON public.marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();