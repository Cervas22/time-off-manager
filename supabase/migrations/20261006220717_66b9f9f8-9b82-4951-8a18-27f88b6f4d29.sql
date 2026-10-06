CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  rfc text,
  correo_contacto text,
  telefono text,
  estatus text NOT NULL DEFAULT 'prueba' CHECK (estatus IN ('prueba','activa','suspendida')),
  fecha_vencimiento date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Matamoros')::date + 15),
  admin_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.empresas TO authenticated;
GRANT ALL ON public.empresas TO service_role;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER t_empresas_upd BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.codigos_activacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  dias integer NOT NULL CHECK (dias > 0),
  nota text,
  usado_por uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  usado_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.codigos_activacion TO authenticated;
GRANT ALL ON public.codigos_activacion TO service_role;
ALTER TABLE public.codigos_activacion ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.plataforma_cobro (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  paypal_url text, banco text, titular text, clabe text, oxxo_tarjeta text,
  whatsapp text, correo text, precio_mensual text, precio_anual text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.plataforma_cobro TO authenticated;
GRANT ALL ON public.plataforma_cobro TO service_role;
ALTER TABLE public.plataforma_cobro ENABLE ROW LEVEL SECURITY;
INSERT INTO public.plataforma_cobro(id) VALUES (1);

ALTER TABLE public.profiles ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.is_superadmin() RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT lower(coalesce(auth.jwt()->>'email','')) = 'contabilidad@impulsoalcomercio.mx';
$$;

CREATE OR REPLACE FUNCTION public.my_empresa_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT empresa_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Empresa con licencia vigente (null si vencida/suspendida)
CREATE OR REPLACE FUNCTION public.empresa_vigente_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id FROM public.empresas e JOIN public.profiles p ON p.empresa_id = e.id
  WHERE p.id = auth.uid() AND e.estatus <> 'suspendida'
    AND e.fecha_vencimiento >= (now() AT TIME ZONE 'America/Matamoros')::date;
$$;

CREATE POLICY emp_sel ON public.empresas FOR SELECT TO authenticated USING (id = public.my_empresa_id() OR public.is_superadmin());
CREATE POLICY emp_upd ON public.empresas FOR UPDATE TO authenticated USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());
CREATE POLICY cod_all ON public.codigos_activacion FOR ALL TO authenticated USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());
CREATE POLICY cob_sel ON public.plataforma_cobro FOR SELECT TO authenticated USING (true);
CREATE POLICY cob_upd ON public.plataforma_cobro FOR UPDATE TO authenticated USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

-- Empresa #1 con los datos actuales
DO $$
DECLARE _e uuid; _t text;
BEGIN
  INSERT INTO public.empresas(nombre, correo_contacto, estatus, fecha_vencimiento)
  VALUES (coalesce((SELECT value#>>'{}' FROM public.app_settings WHERE key='brand_name'),'Impulso al Comercio'),
          'contabilidad@impulsoalcomercio.mx','activa','2099-12-31') RETURNING id INTO _e;
  UPDATE public.profiles SET empresa_id = _e;
  UPDATE public.empresas SET admin_user_id = (SELECT id FROM public.profiles WHERE lower(email)='contabilidad@impulsoalcomercio.mx' LIMIT 1) WHERE id=_e;
  FOREACH _t IN ARRAY ARRAY['areas','employees','holidays','requests','vacation_cycles','absence_periods','balance_adjustments','vacation_payments','audit_log','schedule_templates','schedule_days','seniority_rules','request_categories','request_types','app_settings','pending_roles'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE', _t);
    EXECUTE format('UPDATE public.%I SET empresa_id = %L', _t, _e);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN empresa_id SET DEFAULT public.my_empresa_id()', _t);
    IF _t <> 'pending_roles' THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN empresa_id SET NOT NULL', _t);
      EXECUTE format('CREATE POLICY tenant_aislado ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (empresa_id = public.empresa_vigente_id()) WITH CHECK (empresa_id = public.empresa_vigente_id())', _t);
    END IF;
    EXECUTE format('CREATE INDEX ON public.%I(empresa_id)', _t);
  END LOOP;
END $$;

-- Únicos por empresa
ALTER TABLE public.app_settings DROP CONSTRAINT app_settings_pkey;
ALTER TABLE public.app_settings ADD PRIMARY KEY (empresa_id, key);
ALTER TABLE public.areas DROP CONSTRAINT areas_name_key;
ALTER TABLE public.areas ADD CONSTRAINT areas_name_key UNIQUE (empresa_id, name);
ALTER TABLE public.employees DROP CONSTRAINT employees_employee_number_key;
ALTER TABLE public.employees ADD CONSTRAINT employees_employee_number_key UNIQUE (empresa_id, employee_number);
ALTER TABLE public.request_categories DROP CONSTRAINT request_categories_code_key;
ALTER TABLE public.request_categories ADD CONSTRAINT request_categories_code_key UNIQUE (empresa_id, code);
ALTER TABLE public.holidays DROP CONSTRAINT holidays_holiday_date_key;
ALTER TABLE public.holidays ADD CONSTRAINT holidays_holiday_date_key UNIQUE (empresa_id, holiday_date);

-- Al crear un usuario: hereda la empresa del expediente con su correo
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, empresa_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.email,''),
    (SELECT empresa_id FROM public.employees WHERE lower(email)=lower(NEW.email) LIMIT 1))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'empleado') ON CONFLICT DO NOTHING;
  UPDATE public.employees SET user_id = NEW.id WHERE user_id IS NULL AND lower(email) = lower(NEW.email);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.link_employee_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT u.id INTO _uid FROM auth.users u WHERE lower(u.email) = lower(NEW.email) LIMIT 1;
    IF _uid IS NOT NULL THEN
      UPDATE public.employees SET user_id = _uid WHERE id = NEW.id;
      UPDATE public.profiles SET empresa_id = NEW.empresa_id WHERE id = _uid AND empresa_id IS NULL;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

-- Registrar nueva empresa (15 días de prueba) copiando configuración base
CREATE OR REPLACE FUNCTION public.registrar_empresa(_nombre text, _rfc text, _telefono text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _e uuid; _base uuid; _uid uuid := auth.uid(); r record; _newcat uuid; _newtpl uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesión'; END IF;
  IF (SELECT empresa_id FROM public.profiles WHERE id=_uid) IS NOT NULL THEN RAISE EXCEPTION 'Tu cuenta ya pertenece a una empresa'; END IF;
  IF coalesce(trim(_nombre),'') = '' THEN RAISE EXCEPTION 'El nombre es obligatorio'; END IF;
  SELECT id INTO _base FROM public.empresas ORDER BY created_at LIMIT 1;
  INSERT INTO public.empresas(nombre, rfc, telefono, correo_contacto, admin_user_id)
  VALUES (trim(_nombre), nullif(trim(_rfc),''), nullif(trim(_telefono),''), auth.jwt()->>'email', _uid) RETURNING id INTO _e;
  UPDATE public.profiles SET empresa_id=_e WHERE id=_uid;
  INSERT INTO public.user_roles(user_id, role) VALUES (_uid,'admin') ON CONFLICT DO NOTHING;
  INSERT INTO public.app_settings(empresa_id, key, value, description)
    SELECT _e, key, value, description FROM public.app_settings WHERE empresa_id=_base AND key NOT IN ('brand_logo_url','brand_name');
  INSERT INTO public.app_settings(empresa_id, key, value) VALUES (_e,'brand_name', to_jsonb(trim(_nombre)));
  INSERT INTO public.seniority_rules(empresa_id, year_from, year_to, days, effective_from, is_active, notes)
    SELECT _e, year_from, year_to, days, effective_from, is_active, notes FROM public.seniority_rules WHERE empresa_id=_base;
  FOR r IN SELECT * FROM public.request_categories WHERE empresa_id=_base LOOP
    INSERT INTO public.request_categories(empresa_id, code, name, color, is_active) VALUES (_e, r.code, r.name, r.color, r.is_active) RETURNING id INTO _newcat;
    INSERT INTO public.request_types(empresa_id, category_id, name, deducts_vacation, requires_document, allows_days, allows_hours, max_days, is_active)
      SELECT _e, _newcat, name, deducts_vacation, requires_document, allows_days, allows_hours, max_days, is_active FROM public.request_types WHERE category_id=r.id;
  END LOOP;
  FOR r IN SELECT * FROM public.schedule_templates WHERE empresa_id=_base LOOP
    INSERT INTO public.schedule_templates(empresa_id, name, description, is_rotating, is_night_shift, is_active)
      VALUES (_e, r.name, r.description, r.is_rotating, r.is_night_shift, r.is_active) RETURNING id INTO _newtpl;
    INSERT INTO public.schedule_days(empresa_id, template_id, weekday, is_working_day, start_time, end_time, break_start, break_end, lunch_minutes, crosses_midnight)
      SELECT _e, _newtpl, weekday, is_working_day, start_time, end_time, break_start, break_end, lunch_minutes, crosses_midnight FROM public.schedule_days WHERE template_id=r.id;
  END LOOP;
  INSERT INTO public.holidays(empresa_id, holiday_date, name, description, is_active)
    SELECT _e, holiday_date, name, description, is_active FROM public.holidays WHERE empresa_id=_base AND holiday_date >= current_date;
  RETURN _e;
END; $$;

CREATE OR REPLACE FUNCTION public.canjear_codigo(_codigo text) RETURNS date
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _e uuid := public.my_empresa_id(); _c record; _nueva date;
BEGIN
  IF _e IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Solo el administrador de la empresa puede activar la licencia'; END IF;
  SELECT * INTO _c FROM public.codigos_activacion WHERE upper(codigo)=upper(trim(_codigo)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Código inválido'; END IF;
  IF _c.usado_por IS NOT NULL THEN RAISE EXCEPTION 'Este código ya fue utilizado'; END IF;
  UPDATE public.empresas SET estatus='activa',
    fecha_vencimiento = greatest(fecha_vencimiento, (now() AT TIME ZONE 'America/Matamoros')::date) + _c.dias
    WHERE id=_e RETURNING fecha_vencimiento INTO _nueva;
  UPDATE public.codigos_activacion SET usado_por=_e, usado_en=now() WHERE id=_c.id;
  RETURN _nueva;
END; $$;

CREATE OR REPLACE FUNCTION public.superadmin_empresas() RETURNS TABLE(id uuid, nombre text, rfc text, correo_contacto text, telefono text, estatus text, fecha_vencimiento date, created_at timestamptz, admin_email text, empleados bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_superadmin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  RETURN QUERY SELECT e.id, e.nombre, e.rfc, e.correo_contacto, e.telefono, e.estatus, e.fecha_vencimiento, e.created_at,
    (SELECT p.email FROM public.profiles p WHERE p.id=e.admin_user_id),
    (SELECT count(*) FROM public.employees x WHERE x.empresa_id=e.id AND x.is_active)
  FROM public.empresas e ORDER BY e.fecha_vencimiento;
END; $$;

REVOKE EXECUTE ON FUNCTION public.registrar_empresa(text,text,text), public.canjear_codigo(text), public.superadmin_empresas() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.registrar_empresa(text,text,text), public.canjear_codigo(text), public.superadmin_empresas() TO authenticated;