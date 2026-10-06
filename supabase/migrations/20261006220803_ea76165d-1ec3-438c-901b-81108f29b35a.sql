CREATE OR REPLACE FUNCTION public.notify_admins_new_request() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nombre text;
BEGIN
  SELECT full_name INTO v_nombre FROM public.employees WHERE id = NEW.employee_id;
  INSERT INTO public.notifications (user_id, type, title, message, request_id)
  SELECT ur.user_id, 'nueva_solicitud', 'Nueva solicitud pendiente',
    COALESCE(v_nombre, 'Un empleado') || ' envió una solicitud del ' || to_char(NEW.start_date, 'DD/MM/YYYY') || ' al ' || to_char(NEW.end_date, 'DD/MM/YYYY') || '.', NEW.id
  FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'admin' AND p.empresa_id = NEW.empresa_id;
  RETURN NEW;
END; $$;