DROP POLICY IF EXISTS "Admins upload marketplace images" ON storage.objects;
DROP POLICY IF EXISTS "Admins update marketplace images" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete marketplace images" ON storage.objects;

CREATE POLICY "Admins and owners upload marketplace images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'marketplace'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'owner'::public.app_role)
  )
);

CREATE POLICY "Admins and owners update marketplace images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'marketplace'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'owner'::public.app_role)
  )
)
WITH CHECK (
  bucket_id = 'marketplace'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'owner'::public.app_role)
  )
);

CREATE POLICY "Admins and owners delete marketplace images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'marketplace'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'owner'::public.app_role)
  )
);