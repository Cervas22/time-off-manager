CREATE OR REPLACE FUNCTION public.is_superadmin() RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT lower(coalesce(auth.jwt()->>'email','')) = 'jangeljac2001@gmail.com';
$$;
INSERT INTO public.user_roles(user_id, role) VALUES ('95da1561-2222-4c94-be26-77d3c938153b','admin') ON CONFLICT DO NOTHING;