-- Eliminar expediente duplicado sin datos
DELETE FROM public.employees WHERE id = 'f66d56fb-4653-4bd8-937a-3b783ae4952f';

-- Vincular el expediente real a la cuenta del administrador
UPDATE public.employees SET user_id = 'f66d56fb-4653-4bd8-937a-3b783ae4952f'
WHERE id = '99755c2a-c694-450f-bf85-1c800c5777ab' AND user_id IS NULL;

-- Función: al crear un empleado, si su correo ya tiene cuenta, vincularla
CREATE OR REPLACE FUNCTION public.link_employee_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid;
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT u.id INTO _uid FROM auth.users u WHERE lower(u.email) = lower(NEW.email) LIMIT 1;
    IF _uid IS NOT NULL THEN
      UPDATE public.employees SET user_id = _uid WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.link_employee_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS t_emp_link_user ON public.employees;
CREATE TRIGGER t_emp_link_user
AFTER INSERT ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.link_employee_user();