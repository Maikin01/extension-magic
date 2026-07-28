-- Mantém os privilégios de tabela coerentes com as políticas RLS existentes.
-- Projetos novos não devem depender da exposição automática do schema.
GRANT SELECT, INSERT, UPDATE
  ON public.profiles
  TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.user_roles, public.plans, public.licenses, public.payments
  TO authenticated;

GRANT SELECT
  ON public.devices, public.activation_logs, public.admin_audit_log
  TO authenticated;

GRANT ALL
  ON public.profiles,
     public.user_roles,
     public.plans,
     public.licenses,
     public.devices,
     public.activation_logs,
     public.admin_audit_log,
     public.payments,
     public.admin_credentials
  TO service_role;
