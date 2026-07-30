CREATE POLICY "Authenticated can see marketplace bucket"
ON storage.buckets FOR SELECT TO authenticated
USING (id = 'marketplace');