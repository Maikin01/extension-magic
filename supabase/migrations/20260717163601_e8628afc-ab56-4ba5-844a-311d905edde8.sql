
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

CREATE INDEX IF NOT EXISTS profiles_referral_code_idx ON public.profiles(referral_code);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS reseller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS payments_reseller_id_idx ON public.payments(reseller_id);

CREATE OR REPLACE FUNCTION public.generate_referral_code(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
  attempts int := 0;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
BEGIN
  SELECT referral_code INTO code FROM public.profiles WHERE id = _user_id;
  IF code IS NOT NULL THEN RETURN code; END IF;

  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    BEGIN
      UPDATE public.profiles SET referral_code = code WHERE id = _user_id;
      IF FOUND THEN EXIT; END IF;
      -- profile não existia
      INSERT INTO public.profiles (id, referral_code) VALUES (_user_id, code);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      attempts := attempts + 1;
      IF attempts > 15 THEN RAISE EXCEPTION 'Não foi possível gerar código único'; END IF;
    END;
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_reseller_role_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'revendedor' THEN
    INSERT INTO public.profiles (id) VALUES (NEW.user_id) ON CONFLICT (id) DO NOTHING;
    PERFORM public.generate_referral_code(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reseller_role_added ON public.user_roles;
CREATE TRIGGER trg_reseller_role_added
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.on_reseller_role_added();

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own payments" ON public.payments;
CREATE POLICY "Users read own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR reseller_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

DROP POLICY IF EXISTS "Admins manage payments" ON public.payments;
CREATE POLICY "Admins manage payments"
  ON public.payments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

DO $$
DECLARE
  target_id uuid;
BEGIN
  SELECT id INTO target_id FROM auth.users WHERE lower(email) = 'maicondnz920@gmail.com' LIMIT 1;
  IF target_id IS NOT NULL THEN
    INSERT INTO public.profiles (id) VALUES (target_id) ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (target_id, 'revendedor')
      ON CONFLICT (user_id, role) DO NOTHING;
    PERFORM public.generate_referral_code(target_id);
  END IF;
END $$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    LEFT JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.role = 'revendedor' AND (p.referral_code IS NULL OR p.id IS NULL)
  LOOP
    INSERT INTO public.profiles (id) VALUES (r.user_id) ON CONFLICT (id) DO NOTHING;
    PERFORM public.generate_referral_code(r.user_id);
  END LOOP;
END $$;
