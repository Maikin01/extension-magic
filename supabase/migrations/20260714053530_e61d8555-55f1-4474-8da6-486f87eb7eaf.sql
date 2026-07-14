
-- =====================================================
-- ENUMS
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.license_status AS ENUM ('pending', 'active', 'expired', 'suspended', 'revoked');
CREATE TYPE public.activation_result AS ENUM ('success', 'invalid_key', 'expired', 'revoked', 'suspended', 'device_limit', 'device_mismatch', 'not_found', 'rate_limited', 'error');

-- =====================================================
-- PROFILES
-- =====================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USER ROLES
-- =====================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function (SECURITY DEFINER, evita recursão em RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =====================================================
-- PLANS
-- =====================================================
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  price_cents INTEGER NOT NULL DEFAULT 0,
  max_devices INTEGER NOT NULL DEFAULT 1 CHECK (max_devices > 0),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plans TO anon;
GRANT SELECT ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- LICENSES
-- =====================================================
CREATE TABLE public.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  license_key TEXT NOT NULL UNIQUE,
  license_key_hash TEXT NOT NULL UNIQUE,
  status public.license_status NOT NULL DEFAULT 'pending',
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX idx_licenses_user_id ON public.licenses(user_id);
CREATE INDEX idx_licenses_key_hash ON public.licenses(license_key_hash);
CREATE INDEX idx_licenses_status ON public.licenses(status);

GRANT SELECT ON public.licenses TO authenticated;
GRANT ALL ON public.licenses TO service_role;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DEVICES
-- =====================================================
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  device_hash TEXT NOT NULL,
  browser TEXT,
  os TEXT,
  ext_version TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (license_id, device_hash)
);

CREATE INDEX idx_devices_license_id ON public.devices(license_id);

GRANT SELECT ON public.devices TO authenticated;
GRANT ALL ON public.devices TO service_role;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ACTIVATION LOGS
-- =====================================================
CREATE TABLE public.activation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES public.licenses(id) ON DELETE SET NULL,
  license_key_hash TEXT,
  device_hash TEXT,
  ip_address TEXT,
  user_agent TEXT,
  browser TEXT,
  os TEXT,
  ext_version TEXT,
  result public.activation_result NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activation_logs_license_id ON public.activation_logs(license_id);
CREATE INDEX idx_activation_logs_created_at ON public.activation_logs(created_at DESC);

GRANT SELECT ON public.activation_logs TO authenticated;
GRANT ALL ON public.activation_logs TO service_role;
ALTER TABLE public.activation_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ADMIN AUDIT LOG
-- =====================================================
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_created_at ON public.admin_audit_log(created_at DESC);

GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- profiles
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- user_roles (read only from client; writes via service role)
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- plans (public read)
CREATE POLICY "Plans are public" ON public.plans FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Plans readable by authenticated" ON public.plans FOR SELECT TO authenticated USING (true);

-- licenses
CREATE POLICY "Users read own licenses" ON public.licenses FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- devices
CREATE POLICY "Users read own devices" ON public.devices FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.licenses l WHERE l.id = license_id AND (l.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

-- activation_logs
CREATE POLICY "Users read own activation logs" ON public.activation_logs FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.licenses l WHERE l.id = license_id AND l.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- admin_audit_log (admin only)
CREATE POLICY "Admins read audit log" ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- TRIGGERS
-- =====================================================

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_licenses_updated_at BEFORE UPDATE ON public.licenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- SEED PLANS
-- =====================================================
INSERT INTO public.plans (slug, name, description, duration_days, price_cents, max_devices, features, sort_order) VALUES
  ('trial',      'Teste',       'Acesso completo por 3 dias para testar a extensão.',        3,    0,    1, '["unlimited","key_daily"]'::jsonb,                                     10),
  ('weekly',     'Semanal',     'Acesso ilimitado por 7 dias.',                              7,    1990, 1, '["unlimited","key_daily","key_weekly"]'::jsonb,                        20),
  ('monthly',    'Mensal',      'Acesso ilimitado por 30 dias — o mais popular.',            30,   4990, 1, '["unlimited","key_daily","key_weekly","key_monthly"]'::jsonb,          30),
  ('quarterly',  'Trimestral',  'Acesso ilimitado por 90 dias.',                             90,   12990,2, '["unlimited","key_daily","key_weekly","key_monthly"]'::jsonb,          40),
  ('semiannual', 'Semestral',   'Acesso ilimitado por 180 dias.',                            180,  22990,2, '["unlimited","key_daily","key_weekly","key_monthly"]'::jsonb,          50),
  ('annual',     'Anual',       'Acesso ilimitado por 365 dias — melhor custo-benefício.',   365,  39990,3, '["unlimited","key_daily","key_weekly","key_monthly"]'::jsonb,          60);
