CREATE TABLE public.marketplace_stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  content text NOT NULL,
  order_id uuid REFERENCES public.marketplace_orders(id) ON DELETE SET NULL,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.marketplace_stock_items TO service_role;
ALTER TABLE public.marketplace_stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access to stock items"
  ON public.marketplace_stock_items AS RESTRICTIVE
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE INDEX idx_stock_items_available ON public.marketplace_stock_items (product_id) WHERE order_id IS NULL;
CREATE UNIQUE INDEX idx_stock_items_order ON public.marketplace_stock_items (order_id) WHERE order_id IS NOT NULL;

CREATE TRIGGER set_marketplace_stock_items_updated_at
BEFORE UPDATE ON public.marketplace_stock_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_marketplace_product_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product uuid := COALESCE(NEW.product_id, OLD.product_id);
  v_total int;
  v_available int;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE order_id IS NULL)
    INTO v_total, v_available
    FROM public.marketplace_stock_items
   WHERE product_id = v_product;

  IF v_total > 0 THEN
    UPDATE public.marketplace_products SET stock = v_available WHERE id = v_product;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER sync_stock_after_change
AFTER INSERT OR UPDATE OR DELETE ON public.marketplace_stock_items
FOR EACH ROW EXECUTE FUNCTION public.sync_marketplace_product_stock();

CREATE OR REPLACE FUNCTION public.claim_marketplace_stock_item(p_product_id uuid, p_order_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content text;
  v_id uuid;
BEGIN
  SELECT content INTO v_content
    FROM public.marketplace_stock_items
   WHERE order_id = p_order_id
   LIMIT 1;
  IF v_content IS NOT NULL THEN
    RETURN v_content;
  END IF;

  SELECT id INTO v_id
    FROM public.marketplace_stock_items
   WHERE product_id = p_product_id AND order_id IS NULL
   ORDER BY created_at
   FOR UPDATE SKIP LOCKED
   LIMIT 1;

  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.marketplace_stock_items
     SET order_id = p_order_id, delivered_at = now()
   WHERE id = v_id
   RETURNING content INTO v_content;

  RETURN v_content;
END;
$$;

CREATE OR REPLACE FUNCTION public.product_has_stock_items(p_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.marketplace_stock_items WHERE product_id = p_product_id);
$$;