import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { hoyISO } from "@/lib/licencia-fecha";

export const SUPERADMIN_EMAIL = "contabilidad@impulsoalcomercio.mx";

export type Empresa = {
  id: string;
  nombre: string;
  rfc: string | null;
  correo_contacto: string | null;
  telefono: string | null;
  estatus: "prueba" | "activa" | "suspendida";
  fecha_vencimiento: string;
};

export type Cobro = {
  paypal_url: string | null;
  banco: string | null;
  titular: string | null;
  clabe: string | null;
  oxxo_tarjeta: string | null;
  whatsapp: string | null;
  correo: string | null;
  precio_mensual: string | null;
  precio_anual: string | null;
};

export function diasRestantes(fecha: string): number {
  const a = new Date(hoyISO() + "T00:00:00Z").getTime();
  const b = new Date(fecha + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

export function estadoLicencia(e: { estatus: string; fecha_vencimiento: string }) {
  const dias = diasRestantes(e.fecha_vencimiento);
  if (e.estatus === "suspendida") return { dias, etiqueta: "Suspendida", nivel: "rojo" as const, vigente: false };
  if (dias < 0) return { dias, etiqueta: "Vencida", nivel: "rojo" as const, vigente: false };
  const etiqueta = e.estatus === "prueba" ? "Prueba" : "Activa";
  return { dias, etiqueta, nivel: dias < 7 ? ("amarillo" as const) : ("verde" as const), vigente: true };
}

export function useEsSuperadmin() {
  const { user } = useAuth();
  return (user?.email ?? "").toLowerCase() === SUPERADMIN_EMAIL;
}

export function useMiEmpresa() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mi-empresa", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: perfil } = await supabase.from("profiles").select("empresa_id").eq("id", user!.id).maybeSingle();
      const id = (perfil as { empresa_id: string | null } | null)?.empresa_id;
      if (!id) return null;
      const { data, error } = await supabase.from("empresas").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Empresa | null;
    },
  });
}

export function useCobro() {
  return useQuery({
    queryKey: ["cobro"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plataforma_cobro").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data as Cobro | null;
    },
  });
}
