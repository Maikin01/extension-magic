INSERT INTO public.user_roles (user_id, role)
VALUES ('2f2c8bb3-c65c-4fd7-98cb-442ed3bca8b8', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;