REVOKE EXECUTE ON FUNCTION public.my_empresa_id(), public.empresa_vigente_id() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_empresa_id(), public.empresa_vigente_id() TO authenticated;