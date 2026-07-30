DROP POLICY IF EXISTS "Only admins can insert licenses" ON public.licenses;
DROP POLICY IF EXISTS "Only admins can update licenses" ON public.licenses;
DROP POLICY IF EXISTS "Only admins can delete licenses" ON public.licenses;

CREATE POLICY "Only admins can insert licenses"
ON public.licenses AS RESTRICTIVE FOR INSERT TO authenticated, anon
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update licenses"
ON public.licenses AS RESTRICTIVE FOR UPDATE TO authenticated, anon
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete licenses"
ON public.licenses AS RESTRICTIVE FOR DELETE TO authenticated, anon
USING (public.has_role(auth.uid(), 'admin'::app_role));