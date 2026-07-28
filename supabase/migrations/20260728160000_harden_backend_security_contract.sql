BEGIN;

-- Uma tentativa de checkout é identificada pelo cliente e pode ser repetida
-- com segurança após timeout/reconexão sem criar um segundo Pix.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS client_request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS payments_user_client_request_uidx
  ON public.payments (user_id, client_request_id)
  WHERE user_id IS NOT NULL AND client_request_id IS NOT NULL;

-- Rate limit durável e atômico para todas as instâncias das Edge Functions.
CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  scope text NOT NULL CHECK (length(scope) BETWEEN 1 AND 80),
  key_hash text NOT NULL CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1 CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, key_hash)
);

CREATE INDEX IF NOT EXISTS edge_rate_limits_updated_at_idx
  ON public.edge_rate_limits (updated_at);

ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.edge_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.edge_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_edge_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS TABLE (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
BEGIN
  IF p_scope IS NULL OR length(p_scope) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'invalid rate-limit scope' USING ERRCODE = '22023';
  END IF;
  IF p_key_hash IS NULL OR p_key_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid rate-limit key' USING ERRCODE = '22023';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100000 THEN
    RAISE EXCEPTION 'invalid rate-limit limit' USING ERRCODE = '22023';
  END IF;
  IF p_window_seconds IS NULL OR p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid rate-limit window' USING ERRCODE = '22023';
  END IF;

  -- Limpeza amostral evita crescimento ilimitado sem adicionar cron obrigatório.
  IF random() < 0.01 THEN
    DELETE FROM public.edge_rate_limits
    WHERE updated_at < v_now - interval '2 days';
  END IF;

  RETURN QUERY
  WITH consumed AS (
    INSERT INTO public.edge_rate_limits AS limits (
      scope,
      key_hash,
      window_started_at,
      request_count,
      updated_at
    )
    VALUES (p_scope, p_key_hash, v_now, 1, v_now)
    ON CONFLICT (scope, key_hash) DO UPDATE
    SET
      window_started_at = CASE
        WHEN limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now
          THEN v_now
        ELSE limits.window_started_at
      END,
      request_count = CASE
        WHEN limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now
          THEN 1
        ELSE limits.request_count + 1
      END,
      updated_at = v_now
    RETURNING window_started_at, request_count
  )
  SELECT
    consumed.request_count <= p_limit,
    greatest(p_limit - consumed.request_count, 0)::integer,
    CASE
      WHEN consumed.request_count <= p_limit THEN 0
      ELSE greatest(
        1,
        ceil(
          extract(
            epoch FROM (
              consumed.window_started_at
              + make_interval(secs => p_window_seconds)
              - v_now
            )
          )
        )::integer
      )
    END
  FROM consumed;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_edge_rate_limit(text, text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_edge_rate_limit(text, text, integer, integer)
  TO service_role;

COMMENT ON TABLE public.edge_rate_limits IS
  'Contadores de rate limit das Edge Functions; chaves são SHA-256 e nunca IPs em claro.';
COMMENT ON FUNCTION public.consume_edge_rate_limit(text, text, integer, integer) IS
  'Consome atomicamente uma unidade do limite; executável somente pelo service_role.';

-- O cliente autenticado mantém somente leitura própria. Toda mutação sensível
-- passa pelas Edge Functions, onde autorização, AAL2, rate limit e auditoria são aplicados.
REVOKE INSERT, UPDATE, DELETE
  ON public.user_roles,
     public.plans,
     public.licenses,
     public.payments,
     public.devices,
     public.activation_logs,
     public.admin_audit_log
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON public.admin_credentials FROM PUBLIC, anon, authenticated;
REVOKE DELETE ON public.profiles FROM PUBLIC, anon, authenticated;

-- Usuários continuam lendo seus próprios dados em AAL1. A visão administrativa
-- direta fica condicionada a role privilegiada + AAL2; o backend usa service_role.
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    (
      public.has_role((select auth.uid()), 'admin')
      OR public.has_role((select auth.uid()), 'owner')
    )
    AND coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
  );

DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (
    (
      public.has_role((select auth.uid()), 'admin')
      OR public.has_role((select auth.uid()), 'owner')
    )
    AND coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
  )
  WITH CHECK (
    (
      public.has_role((select auth.uid()), 'admin')
      OR public.has_role((select auth.uid()), 'owner')
    )
    AND coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
  );

DROP POLICY IF EXISTS "Users read own licenses" ON public.licenses;
CREATE POLICY "Users read own licenses"
  ON public.licenses FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins manage licenses" ON public.licenses;
CREATE POLICY "Admins manage licenses"
  ON public.licenses FOR ALL TO authenticated
  USING (
    (
      public.has_role((select auth.uid()), 'admin')
      OR public.has_role((select auth.uid()), 'owner')
    )
    AND coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
  )
  WITH CHECK (
    (
      public.has_role((select auth.uid()), 'admin')
      OR public.has_role((select auth.uid()), 'owner')
    )
    AND coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
  );

DROP POLICY IF EXISTS "Admins manage plans" ON public.plans;
CREATE POLICY "Admins manage plans"
  ON public.plans FOR ALL TO authenticated
  USING (
    (
      public.has_role((select auth.uid()), 'admin')
      OR public.has_role((select auth.uid()), 'owner')
    )
    AND coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
  )
  WITH CHECK (
    (
      public.has_role((select auth.uid()), 'admin')
      OR public.has_role((select auth.uid()), 'owner')
    )
    AND coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
  );

DROP POLICY IF EXISTS "Users read own devices" ON public.devices;
CREATE POLICY "Users read own devices"
  ON public.devices FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.licenses AS license
      WHERE license.id = license_id
        AND (
          license.user_id = (select auth.uid())
          OR (
            (
              public.has_role((select auth.uid()), 'admin')
              OR public.has_role((select auth.uid()), 'owner')
            )
            AND coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users read own activation logs" ON public.activation_logs;
CREATE POLICY "Users read own activation logs"
  ON public.activation_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.licenses AS license
      WHERE license.id = license_id
        AND license.user_id = (select auth.uid())
    )
    OR (
      (
        public.has_role((select auth.uid()), 'admin')
        OR public.has_role((select auth.uid()), 'owner')
      )
      AND coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
    )
  );

DROP POLICY IF EXISTS "Admins read audit log" ON public.admin_audit_log;
CREATE POLICY "Admins read audit log"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (
    (
      public.has_role((select auth.uid()), 'admin')
      OR public.has_role((select auth.uid()), 'owner')
    )
    AND coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
  );

DROP POLICY IF EXISTS "Users read own payments" ON public.payments;
CREATE POLICY "Users read own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR reseller_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Admins manage payments" ON public.payments;
CREATE POLICY "Admins manage payments"
  ON public.payments FOR ALL TO authenticated
  USING (
    (
      public.has_role((select auth.uid()), 'admin')
      OR public.has_role((select auth.uid()), 'owner')
    )
    AND coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
  )
  WITH CHECK (
    (
      public.has_role((select auth.uid()), 'admin')
      OR public.has_role((select auth.uid()), 'owner')
    )
    AND coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
  );

COMMIT;
