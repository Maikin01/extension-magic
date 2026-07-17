
REVOKE ALL ON FUNCTION public.generate_referral_code(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_reseller_role_added() FROM PUBLIC, anon, authenticated;
