REVOKE ALL ON FUNCTION public.claim_marketplace_stock_item(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.product_has_stock_items(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_marketplace_product_stock() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_marketplace_stock_item(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.product_has_stock_items(uuid) TO service_role;