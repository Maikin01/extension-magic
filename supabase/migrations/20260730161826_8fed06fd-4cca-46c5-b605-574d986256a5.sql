ALTER TABLE public.marketplace_orders DROP CONSTRAINT IF EXISTS marketplace_orders_product_id_fkey;
ALTER TABLE public.marketplace_orders ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE public.marketplace_orders
  ADD CONSTRAINT marketplace_orders_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.marketplace_products(id) ON DELETE SET NULL;