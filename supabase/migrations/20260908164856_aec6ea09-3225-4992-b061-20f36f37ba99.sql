CREATE OR REPLACE FUNCTION public.grant_admin_contabilidad()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.email_confirmed_at IS NOT NULL
     AND lower(new.email) = 'contabilidad@impulsoalcomercio.mx' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_admin_contabilidad() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created_admin_contabilidad
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_contabilidad();

CREATE TRIGGER on_auth_user_confirmed_admin_contabilidad
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (old.email_confirmed_at IS NULL AND new.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_admin_contabilidad();