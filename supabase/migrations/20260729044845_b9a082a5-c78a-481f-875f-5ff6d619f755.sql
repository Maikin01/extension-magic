ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edge_rate_limits FROM anon, authenticated;
GRANT ALL ON public.edge_rate_limits TO service_role;
DROP POLICY IF EXISTS "No client access to rate limits" ON public.edge_rate_limits;
CREATE POLICY "No client access to rate limits"
ON public.edge_rate_limits
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);