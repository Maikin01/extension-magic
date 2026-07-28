-- A API server-side gera códigos de indicação com o cliente service_role.
-- A revogação defensiva anterior removeu PUBLIC/anon/authenticated, portanto
-- restauramos explicitamente apenas o papel necessário ao backend.
GRANT EXECUTE ON FUNCTION public.generate_referral_code(uuid) TO service_role;
