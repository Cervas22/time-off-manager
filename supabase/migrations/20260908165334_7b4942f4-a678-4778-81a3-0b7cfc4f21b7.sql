CREATE TABLE IF NOT EXISTS public.pending_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, role)
);
GRANT SELECT ON public.pending_roles TO authenticated;
GRANT ALL ON public.pending_roles TO service_role;
ALTER TABLE public.pending_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p_pending_admin_read" ON public.pending_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_set_role(_email text, _role public.app_role, _grant boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid; _mail text := lower(trim(_email));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar permisos';
  END IF;
  SELECT id INTO _uid FROM public.profiles WHERE lower(email) = _mail LIMIT 1;
  IF _grant THEN
    IF _uid IS NULL THEN
      INSERT INTO public.pending_roles(email, role) VALUES (_mail, _role) ON CONFLICT DO NOTHING;
      RETURN 'pendiente';
    END IF;
    INSERT INTO public.user_roles(user_id, role) VALUES (_uid, _role) ON CONFLICT DO NOTHING;
    RETURN 'otorgado';
  ELSE
    DELETE FROM public.pending_roles WHERE email = _mail AND role = _role;
    IF _uid IS NOT NULL THEN
      DELETE FROM public.user_roles WHERE user_id = _uid AND role = _role;
    END IF;
    RETURN 'retirado';
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_set_role(text, public.app_role, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_role(text, public.app_role, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_pending_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles(user_id, role)
  SELECT NEW.id, pr.role FROM public.pending_roles pr WHERE lower(pr.email) = lower(NEW.email)
  ON CONFLICT DO NOTHING;
  DELETE FROM public.pending_roles WHERE lower(email) = lower(NEW.email);
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.apply_pending_roles() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS t_profiles_pending_roles ON public.profiles;
CREATE TRIGGER t_profiles_pending_roles AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.apply_pending_roles();

INSERT INTO public.app_settings(key, value) VALUES
  ('brand_logo_url', 'null'::jsonb),
  ('brand_theme', '"azul"'::jsonb),
  ('brand_name', '"Control de Vacaciones y Permisos"'::jsonb)
ON CONFLICT (key) DO NOTHING;