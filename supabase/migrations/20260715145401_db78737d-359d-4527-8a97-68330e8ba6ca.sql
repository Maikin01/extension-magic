
ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_duration_days_check;
ALTER TABLE public.plans ADD CONSTRAINT plans_duration_days_check CHECK (duration_days >= 0);
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS duration_minutes integer;

UPDATE public.plans SET duration_minutes = 10, duration_days = 0, name = 'Grátis', description = 'Teste rápido por 10 minutos' WHERE slug = 'trial';
UPDATE public.plans SET price_cents = 6990 WHERE slug = 'monthly';
UPDATE public.plans SET price_cents = 11990 WHERE slug = 'quarterly';
UPDATE public.plans SET price_cents = 19790 WHERE slug = 'annual';

UPDATE public.plans
SET slug = 'lifetime',
    name = 'Vitalícia',
    description = 'Acesso vitalício',
    price_cents = 29990,
    duration_days = 36500,
    sort_order = 70
WHERE slug = 'semiannual';
