DROP POLICY IF EXISTS p_req_read ON public.requests;
CREATE POLICY p_req_read ON public.requests FOR SELECT TO authenticated
USING (
  public.owns_employee(employee_id)
  OR public.is_admin()
  OR public.manages_area(public.employee_area(employee_id))
);

DROP POLICY IF EXISTS p_notif_ins ON public.notifications;
CREATE POLICY p_notif_ins ON public.notifications FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.notify_admins_new_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nombre text;
BEGIN
  SELECT full_name INTO v_nombre FROM public.employees WHERE id = NEW.employee_id;
  INSERT INTO public.notifications (user_id, type, title, message, request_id)
  SELECT ur.user_id,
         'nueva_solicitud',
         'Nueva solicitud pendiente',
         COALESCE(v_nombre, 'Un empleado') || ' envió una solicitud del ' ||
           to_char(NEW.start_date, 'DD/MM/YYYY') || ' al ' || to_char(NEW.end_date, 'DD/MM/YYYY') || '.',
         NEW.id
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.notify_admins_new_request() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS t_req_notify ON public.requests;
CREATE TRIGGER t_req_notify AFTER INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_request();