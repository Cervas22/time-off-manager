import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Rol = "admin" | "jefe" | "empleado";

export type Empleado = {
  id: string;
  employee_number: string;
  user_id: string | null;
  full_name: string;
  email: string;
  position: string | null;
  area_id: string | null;
  hire_date: string;
  accrue_expired_days: boolean;
  is_active: boolean;
};

type AuthCtx = {
  session: Session | null;
  user: User | null;
  cargando: boolean;
};

const Ctx = createContext<AuthCtx>({ session: null, user: null, cargando: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setCargando(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCargando(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, cargando }),
    [session, cargando],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}

export function useRoles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["roles", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Rol[]> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as Rol);
    },
  });
}

export function useMiEmpleado() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mi-empleado", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Empleado | null> => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Empleado | null) ?? null;
    },
  });
}

export function usePerfil() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["perfil", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Rol efectivo con el que se muestra la navegación */
export function useRolPrincipal(): { rol: Rol; esAdmin: boolean; esJefe: boolean; cargando: boolean } {
  const { data: roles, isLoading } = useRoles();
  const esAdmin = !!roles?.includes("admin");
  const esJefe = !!roles?.includes("jefe");
  return {
    rol: esAdmin ? "admin" : esJefe ? "jefe" : "empleado",
    esAdmin,
    esJefe,
    cargando: isLoading,
  };
}
