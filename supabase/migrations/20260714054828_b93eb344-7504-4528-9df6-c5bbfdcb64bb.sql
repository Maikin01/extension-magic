
-- Permite chaves "avulsas" (geradas pelo admin sem dono ainda)
ALTER TABLE public.licenses ALTER COLUMN user_id DROP NOT NULL;

-- Admins podem gerenciar todas as licenças
CREATE POLICY "Admins manage licenses"
  ON public.licenses FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins podem gerenciar planos
CREATE POLICY "Admins manage plans"
  ON public.plans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins podem gerenciar papéis
CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins veem todos os perfis
CREATE POLICY "Admins read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
