REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_employee_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_area_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.manages_area(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.employee_area(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owns_employee(uuid) FROM PUBLIC, anon;