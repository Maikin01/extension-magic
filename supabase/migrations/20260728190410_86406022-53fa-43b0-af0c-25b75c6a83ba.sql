-- 1) admin_credentials: hardened deny-all for all client roles
REVOKE ALL ON public.admin_credentials FROM anon, authenticated;
GRANT ALL ON public.admin_credentials TO service_role;
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_credentials FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No client access to admin credentials" ON public.admin_credentials;
CREATE POLICY "No client access to admin credentials"
  ON public.admin_credentials
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 2) storage.objects: explicit owner-scoped policies for the private bucket
DROP POLICY IF EXISTS "Admins manage database export files" ON storage.objects;
CREATE POLICY "Admins manage database export files"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'database_export_28_07_26'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    bucket_id = 'database_export_28_07_26'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Users manage own files" ON storage.objects;
CREATE POLICY "Users manage own files"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (owner = auth.uid())
  WITH CHECK (owner = auth.uid());
