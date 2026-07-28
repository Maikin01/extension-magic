-- A origem já possuía este usuário, mas um projeto novo ainda não possui.
-- Só preserva o papel quando o UUID existir no Auth, evitando violar a FK.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE id = '2f2c8bb3-c65c-4fd7-98cb-442ed3bca8b8'
ON CONFLICT (user_id, role) DO NOTHING;
