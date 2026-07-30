
CREATE POLICY "Admins upload marketplace images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marketplace' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update marketplace images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'marketplace' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'marketplace' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete marketplace images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'marketplace' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated read marketplace images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'marketplace');
