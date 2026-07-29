BEGIN;

DROP POLICY IF EXISTS "No client access to trial license claims" ON public.trial_license_claims;
CREATE POLICY "No client access to trial license claims"
ON public.trial_license_claims
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

COMMIT;