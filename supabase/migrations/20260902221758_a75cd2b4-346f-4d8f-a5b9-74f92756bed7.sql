-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','jefe','empleado');
CREATE TYPE public.request_status AS ENUM ('pendiente','aprobada','rechazada','cancelada','modificada_aprobada');
CREATE TYPE public.request_mode AS ENUM ('dias_completos','horas','entrada_tardia','salida_anticipada');
CREATE TYPE public.cycle_status AS ENUM ('vigente','cerrado','vencido');
CREATE TYPE public.payment_status AS ENUM ('programado','pagado','cancelado');
CREATE TYPE public.adjustment_type AS ENUM ('incremento','decremento','restauracion_vencidos','correccion');

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

CREATE TABLE public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  manager_user_id uuid,
  max_simultaneous_absences integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.areas TO authenticated;
GRANT ALL ON public.areas TO service_role;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.schedule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_rotating boolean NOT NULL DEFAULT false,
  is_night_shift boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_templates TO authenticated;
GRANT ALL ON public.schedule_templates TO service_role;
ALTER TABLE public.schedule_templates ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.schedule_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.schedule_templates(id) ON DELETE CASCADE,
  weekday smallint NOT NULL,
  is_working_day boolean NOT NULL DEFAULT true,
  start_time time,
  end_time time,
  break_start time,
  break_end time,
  lunch_minutes integer NOT NULL DEFAULT 0,
  crosses_midnight boolean NOT NULL DEFAULT false,
  UNIQUE (template_id, weekday)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_days TO authenticated;
GRANT ALL ON public.schedule_days TO service_role;
ALTER TABLE public.schedule_days ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number text NOT NULL UNIQUE,
  user_id uuid UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  position text,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  manager_user_id uuid,
  hire_date date NOT NULL,
  schedule_template_id uuid REFERENCES public.schedule_templates(id) ON DELETE SET NULL,
  accrue_expired_days boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.my_employee_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.my_area_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT area_id FROM public.employees WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.manages_area(_area_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.areas WHERE id = _area_id AND manager_user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.employee_area(_employee_id uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT area_id FROM public.employees WHERE id = _employee_id;
$$;

CREATE OR REPLACE FUNCTION public.owns_employee(_employee_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.employees WHERE id = _employee_id AND user_id = auth.uid());
$$;

CREATE TABLE public.seniority_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_from integer NOT NULL,
  year_to integer,
  days integer NOT NULL,
  effective_from date NOT NULL DEFAULT current_date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seniority_rules TO authenticated;
GRANT ALL ON public.seniority_rules TO service_role;
ALTER TABLE public.seniority_rules ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.vacation_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  cycle_start date NOT NULL,
  cycle_end date NOT NULL,
  anniversary_date date NOT NULL,
  seniority_years integer NOT NULL,
  assigned_days numeric(5,2) NOT NULL DEFAULT 0,
  taken_days numeric(5,2) NOT NULL DEFAULT 0,
  expired_days numeric(5,2) NOT NULL DEFAULT 0,
  accrue_expired boolean NOT NULL DEFAULT false,
  status public.cycle_status NOT NULL DEFAULT 'vigente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, cycle_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacation_cycles TO authenticated;
GRANT ALL ON public.vacation_cycles TO service_role;
ALTER TABLE public.vacation_cycles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.request_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#1e3a8a',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_categories TO authenticated;
GRANT ALL ON public.request_categories TO service_role;
ALTER TABLE public.request_categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.request_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.request_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  deducts_vacation boolean NOT NULL DEFAULT false,
  requires_document boolean NOT NULL DEFAULT false,
  allows_days boolean NOT NULL DEFAULT true,
  allows_hours boolean NOT NULL DEFAULT false,
  max_days integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_types TO authenticated;
GRANT ALL ON public.request_types TO service_role;
ALTER TABLE public.request_types ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.request_categories(id) ON DELETE SET NULL,
  type_id uuid REFERENCES public.request_types(id) ON DELETE SET NULL,
  cycle_id uuid REFERENCES public.vacation_cycles(id) ON DELETE SET NULL,
  mode public.request_mode NOT NULL DEFAULT 'dias_completos',
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time,
  end_time time,
  days_count numeric(5,2) NOT NULL DEFAULT 0,
  hours_count numeric(5,2) NOT NULL DEFAULT 0,
  reason text NOT NULL,
  document_path text,
  payment_date date,
  status public.request_status NOT NULL DEFAULT 'pendiente',
  admin_comment text,
  exception_reason text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requests TO authenticated;
GRANT ALL ON public.requests TO service_role;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.absence_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.requests(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.request_categories(id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time,
  end_time time,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.absence_periods TO authenticated;
GRANT ALL ON public.absence_periods TO service_role;
ALTER TABLE public.absence_periods ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.vacation_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.vacation_cycles(id) ON DELETE SET NULL,
  request_id uuid REFERENCES public.requests(id) ON DELETE CASCADE,
  payment_date date NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'programado',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX vacation_payments_unique_slot
  ON public.vacation_payments (employee_id, payment_date)
  WHERE status <> 'cancelado';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacation_payments TO authenticated;
GRANT ALL ON public.vacation_payments TO service_role;
ALTER TABLE public.vacation_payments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date date NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.holidays TO authenticated;
GRANT ALL ON public.holidays TO service_role;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  request_id uuid REFERENCES public.requests(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.balance_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.vacation_cycles(id) ON DELETE SET NULL,
  amount numeric(5,2) NOT NULL,
  adjustment_type public.adjustment_type NOT NULL,
  reason text NOT NULL,
  previous_balance numeric(5,2) NOT NULL,
  new_balance numeric(5,2) NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.balance_adjustments TO authenticated;
GRANT ALL ON public.balance_adjustments TO service_role;
ALTER TABLE public.balance_adjustments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER t_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_areas_upd BEFORE UPDATE ON public.areas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_sched_upd BEFORE UPDATE ON public.schedule_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_emp_upd BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_sen_upd BEFORE UPDATE ON public.seniority_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_cyc_upd BEFORE UPDATE ON public.vacation_cycles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_cat_upd BEFORE UPDATE ON public.request_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_typ_upd BEFORE UPDATE ON public.request_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_req_upd BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_pay_upd BEFORE UPDATE ON public.vacation_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.email,''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'empleado')
  ON CONFLICT DO NOTHING;
  UPDATE public.employees SET user_id = NEW.id WHERE user_id IS NULL AND lower(email) = lower(NEW.email);
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY p_profiles_self ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY p_profiles_upd ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY p_profiles_ins ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY p_roles_read ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY p_areas_read ON public.areas FOR SELECT TO authenticated USING (true);
CREATE POLICY p_areas_admin ON public.areas FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY p_sched_read ON public.schedule_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY p_sched_admin ON public.schedule_templates FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY p_schedd_read ON public.schedule_days FOR SELECT TO authenticated USING (true);
CREATE POLICY p_schedd_admin ON public.schedule_days FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY p_emp_read ON public.employees FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin() OR public.manages_area(area_id));
CREATE POLICY p_emp_admin ON public.employees FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY p_sen_read ON public.seniority_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY p_sen_admin ON public.seniority_rules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY p_cyc_read ON public.vacation_cycles FOR SELECT TO authenticated
  USING (public.owns_employee(employee_id) OR public.is_admin());
CREATE POLICY p_cyc_admin ON public.vacation_cycles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY p_cat_read ON public.request_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY p_cat_admin ON public.request_categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY p_typ_read ON public.request_types FOR SELECT TO authenticated USING (true);
CREATE POLICY p_typ_admin ON public.request_types FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY p_req_read ON public.requests FOR SELECT TO authenticated
  USING (public.owns_employee(employee_id) OR public.is_admin());
CREATE POLICY p_req_ins ON public.requests FOR INSERT TO authenticated
  WITH CHECK (public.owns_employee(employee_id) OR public.is_admin());
CREATE POLICY p_req_upd_own ON public.requests FOR UPDATE TO authenticated
  USING ((public.owns_employee(employee_id) AND status = 'pendiente') OR public.is_admin())
  WITH CHECK (public.owns_employee(employee_id) OR public.is_admin());
CREATE POLICY p_req_del_admin ON public.requests FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY p_abs_read ON public.absence_periods FOR SELECT TO authenticated
  USING (public.is_admin() OR public.employee_area(employee_id) = public.my_area_id() OR public.manages_area(public.employee_area(employee_id)));
CREATE POLICY p_abs_admin ON public.absence_periods FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY p_pay_read ON public.vacation_payments FOR SELECT TO authenticated
  USING (public.owns_employee(employee_id) OR public.is_admin());
CREATE POLICY p_pay_ins ON public.vacation_payments FOR INSERT TO authenticated
  WITH CHECK (public.owns_employee(employee_id) OR public.is_admin());
CREATE POLICY p_pay_admin ON public.vacation_payments FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY p_hol_read ON public.holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY p_hol_admin ON public.holidays FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY p_notif_read ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY p_notif_upd ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY p_notif_ins ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY p_adj_read ON public.balance_adjustments FOR SELECT TO authenticated USING (public.is_admin() OR public.owns_employee(employee_id));
CREATE POLICY p_adj_ins ON public.balance_adjustments FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY p_audit_read ON public.audit_log FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY p_audit_ins ON public.audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY p_set_read ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY p_set_admin ON public.app_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.seniority_rules (year_from, year_to, days, notes) VALUES
 (1,1,12,'LFT art. 76 vigente'),
 (2,2,14,'LFT art. 76 vigente'),
 (3,3,16,'LFT art. 76 vigente'),
 (4,4,18,'LFT art. 76 vigente'),
 (5,5,20,'LFT art. 76 vigente'),
 (6,10,22,'LFT art. 76: +2 dias por cada 5 anios'),
 (11,15,24,'LFT art. 76: +2 dias por cada 5 anios'),
 (16,20,26,'LFT art. 76: +2 dias por cada 5 anios'),
 (21,25,28,'LFT art. 76: +2 dias por cada 5 anios'),
 (26,30,30,'LFT art. 76: +2 dias por cada 5 anios');

INSERT INTO public.request_categories (code, name, color) VALUES
 ('VACACIONES','Vacaciones','#1e40af'),
 ('MEDICO','Médico','#dc2626'),
 ('TRAMITE','Trámite','#16a34a');

INSERT INTO public.request_types (category_id, name, deducts_vacation, requires_document, allows_days, allows_hours, max_days)
SELECT id,'Periodo de vacaciones',true,false,true,false,NULL FROM public.request_categories WHERE code='VACACIONES';
INSERT INTO public.request_types (category_id, name, deducts_vacation, requires_document, allows_days, allows_hours, max_days)
SELECT id,'Cita médica (horas)',false,true,false,true,NULL FROM public.request_categories WHERE code='MEDICO';
INSERT INTO public.request_types (category_id, name, deducts_vacation, requires_document, allows_days, allows_hours, max_days)
SELECT id,'Día médico',false,true,true,false,3 FROM public.request_categories WHERE code='MEDICO';
INSERT INTO public.request_types (category_id, name, deducts_vacation, requires_document, allows_days, allows_hours, max_days)
SELECT id,'Permiso por trámite (días)',true,false,true,false,3 FROM public.request_categories WHERE code='TRAMITE';
INSERT INTO public.request_types (category_id, name, deducts_vacation, requires_document, allows_days, allows_hours, max_days)
SELECT id,'Permiso por horas',false,false,false,true,NULL FROM public.request_categories WHERE code='TRAMITE';
INSERT INTO public.request_types (category_id, name, deducts_vacation, requires_document, allows_days, allows_hours, max_days)
SELECT id,'Entrada tardía',false,false,false,true,NULL FROM public.request_categories WHERE code='TRAMITE';
INSERT INTO public.request_types (category_id, name, deducts_vacation, requires_document, allows_days, allows_hours, max_days)
SELECT id,'Salida anticipada',false,false,false,true,NULL FROM public.request_categories WHERE code='TRAMITE';

INSERT INTO public.app_settings (key, value, description) VALUES
 ('vacation_start_monday','true','Política interna: el periodo continuo de vacaciones inicia en lunes'),
 ('min_continuous_days','12','Mínimo de días continuos (configuración inicial basada en el art. 78 LFT vigente)'),
 ('accrue_expired_days_default','false','Política predeterminada: no acumular días vencidos'),
 ('payment_day_friday','true','Viernes como día de pago predeterminado'),
 ('payment_day_rule_enabled','true','Activar/desactivar la regla de día de pago'),
 ('max_permission_days_deducted','3','Máximo de días de permiso descontables de vacaciones'),
 ('timezone','"America/Matamoros"','Zona horaria de operación'),
 ('grace_months_art81','6','Meses para disfrutar vacaciones tras el aniversario (art. 81 LFT vigente)');

INSERT INTO public.holidays (holiday_date, name) VALUES
 ('2026-01-01','Año Nuevo'),
 ('2026-02-02','Día de la Constitución'),
 ('2026-03-16','Natalicio de Benito Juárez'),
 ('2026-05-01','Día del Trabajo'),
 ('2026-09-16','Día de la Independencia'),
 ('2026-11-16','Revolución Mexicana'),
 ('2026-12-25','Navidad');

CREATE POLICY p_docs_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos' AND owner = auth.uid());
CREATE POLICY p_docs_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos' AND (owner = auth.uid() OR public.is_admin()));
CREATE POLICY p_docs_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documentos' AND public.is_admin());