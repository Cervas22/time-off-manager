import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ReglaAntiguedad } from "./reglas";

export type Area = {
  id: string;
  name: string;
  description: string | null;
  manager_user_id: string | null;
  max_simultaneous_absences: number;
  is_active: boolean;
};

export type Categoria = {
  id: string;
  code: string;
  name: string;
  color: string;
  is_active: boolean;
};

export type TipoSolicitud = {
  id: string;
  category_id: string;
  name: string;
  deducts_vacation: boolean;
  requires_document: boolean;
  allows_days: boolean;
  allows_hours: boolean;
  max_days: number | null;
  is_active: boolean;
};

export type Ciclo = {
  id: string;
  employee_id: string;
  cycle_start: string;
  cycle_end: string;
  anniversary_date: string;
  seniority_years: number;
  assigned_days: number;
  taken_days: number;
  expired_days: number;
  accrue_expired: boolean;
  status: "vigente" | "cerrado" | "vencido";
};

export type Solicitud = {
  id: string;
  employee_id: string;
  category_id: string | null;
  type_id: string | null;
  cycle_id: string | null;
  mode: "dias_completos" | "horas" | "entrada_tardia" | "salida_anticipada";
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  days_count: number;
  hours_count: number;
  reason: string;
  document_path: string | null;
  payment_date: string | null;
  status: "pendiente" | "aprobada" | "rechazada" | "cancelada" | "modificada_aprobada";
  admin_comment: string | null;
  exception_reason: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type Ausencia = {
  id: string;
  employee_id: string;
  category_id: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  label: string | null;
};

export function useAreas() {
  return useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("areas").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Area[];
    },
  });
}

export function useCategorias() {
  return useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("request_categories").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Categoria[];
    },
  });
}

export function useTipos() {
  return useQuery({
    queryKey: ["tipos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("request_types").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as TipoSolicitud[];
    },
  });
}

export function useFestivos() {
  return useQuery({
    queryKey: ["festivos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holidays")
        .select("*")
        .eq("is_active", true)
        .order("holiday_date");
      if (error) throw error;
      return (data ?? []) as { id: string; holiday_date: string; name: string }[];
    },
  });
}

export function useReglasAntiguedad() {
  return useQuery({
    queryKey: ["reglas-antiguedad"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seniority_rules")
        .select("*")
        .order("year_from");
      if (error) throw error;
      return (data ?? []) as ReglaAntiguedad[];
    },
  });
}

export function useAjustes() {
  return useQuery({
    queryKey: ["ajustes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*");
      if (error) throw error;
      const map: Record<string, unknown> = {};
      for (const row of data ?? []) map[row.key as string] = row.value;
      return map;
    },
  });
}

export function useCicloVigente(employeeId: string | null | undefined) {
  return useQuery({
    queryKey: ["ciclo-vigente", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vacation_cycles")
        .select("*")
        .eq("employee_id", employeeId!)
        .eq("status", "vigente")
        .order("cycle_start", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Ciclo | null) ?? null;
    },
  });
}

export function useMisSolicitudes(employeeId: string | null | undefined) {
  return useQuery({
    queryKey: ["mis-solicitudes", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("*")
        .eq("employee_id", employeeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Solicitud[];
    },
  });
}

export function useEmpleados() {
  return useQuery({
    queryKey: ["empleados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as {
        id: string;
        employee_number: string;
        full_name: string;
        email: string;
        position: string | null;
        area_id: string | null;
        hire_date: string;
        accrue_expired_days: boolean;
        is_active: boolean;
        user_id: string | null;
      }[];
    },
  });
}

export function useAusencias(desde: string, hasta: string) {
  return useQuery({
    queryKey: ["ausencias", desde, hasta],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("absence_periods")
        .select("*")
        .lte("start_date", hasta)
        .gte("end_date", desde)
        .order("start_date");
      if (error) throw error;
      return (data ?? []) as Ausencia[];
    },
  });
}

export function useSolicitudesPendientes() {
  return useQuery({
    queryKey: ["solicitudes-pendientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("*")
        .eq("status", "pendiente")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Solicitud[];
    },
  });
}

export function useSolicitudesAprobadas() {
  return useQuery({
    queryKey: ["solicitudes-aprobadas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("*")
        .in("status", ["aprobada", "modificada_aprobada"])
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Solicitud[];
    },
  });
}

export function useNotificaciones(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["notificaciones", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as {
        id: string;
        title: string;
        message: string;
        type: string;
        is_read: boolean;
        created_at: string;
      }[];
    },
  });
}

export async function registrarAuditoria(params: {
  actorUserId: string | null;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  antes?: unknown;
  despues?: unknown;
}) {
  await supabase.from("audit_log").insert({
    actor_user_id: params.actorUserId,
    action: params.accion,
    entity: params.entidad,
    entity_id: params.entidadId ?? null,
    before_data: (params.antes ?? null) as never,
    after_data: (params.despues ?? null) as never,
  });
}

export async function notificarAdministradores(params: {
  tipo: string;
  titulo: string;
  mensaje: string;
  requestId?: string | null;
}) {
  const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
  const filas = (admins ?? []).map((a) => ({
    user_id: a.user_id as string,
    type: params.tipo,
    title: params.titulo,
    message: params.mensaje,
    request_id: params.requestId ?? null,
  }));
  if (filas.length) await supabase.from("notifications").insert(filas);
}
