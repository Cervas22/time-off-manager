DELETE FROM public.vacation_cycles WHERE employee_id IN (SELECT id FROM public.employees WHERE employee_number = '61' AND lower(email) = 'victorramirez9428@gmail.com');
DELETE FROM public.employees WHERE employee_number = '61' AND lower(email) = 'victorramirez9428@gmail.com';
CREATE UNIQUE INDEX IF NOT EXISTS employees_email_unique ON public.employees (lower(email));