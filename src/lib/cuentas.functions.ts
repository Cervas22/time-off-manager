import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Entrada = z.object({
  email: z.string().email(),
  oldEmail: z.string().email().optional(),
  password: z.string().min(8).max(72).optional(),
  fullName: z.string().max(200),
  role: z.enum(["admin", "jefe", "empleado"]),
});

/** Crea o actualiza la cuenta de acceso de un empleado (solo administradores). */
export const guardarCuentaEmpleado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Entrada.parse(d))
  .handler(async ({ data, context }) => {
    const { data: esAdmin } = await context.supabase.rpc("is_admin");
    if (!esAdmin) throw new Error("Solo un administrador puede gestionar cuentas");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();
    const buscar = (data.oldEmail ?? email).trim().toLowerCase();

    const { data: perfil } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", buscar)
      .maybeSingle();
    let uid = perfil?.id as string | undefined;

    if (uid) {
      const cambios: { email?: string; password?: string; email_confirm?: boolean } = {};
      if (email !== buscar) Object.assign(cambios, { email, email_confirm: true });
      if (data.password) cambios.password = data.password;
      if (Object.keys(cambios).length) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(uid, cambios);
        if (error) throw new Error(error.message);
        if (cambios.email) await supabaseAdmin.from("profiles").update({ email }).eq("id", uid);
      }
    } else if (data.password) {
      const { data: creado, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName },
      });
      if (error) throw new Error(error.message);
      uid = creado.user.id;
    }

    if (uid) {
      await supabaseAdmin.from("employees").update({ user_id: uid }).ilike("email", email).is("user_id", null);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", uid).in("role", ["admin", "jefe"]);
      if (data.role !== "empleado") {
        await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role });
      }
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: uid, role: "empleado" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
    }
    return { cuenta: !!uid };
  });

/** Roles actuales por correo, para mostrarlos en la lista. */
export const rolesPorCorreo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: esAdmin } = await context.supabase.rpc("is_admin");
    if (!esAdmin) return {} as Record<string, string>;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const mapa: Record<string, string> = {};
    for (const r of roles ?? []) {
      const actual = mapa[r.user_id as string];
      const rank = { admin: 3, jefe: 2, empleado: 1 } as Record<string, number>;
      if (!actual || rank[r.role as string]! > rank[actual]!) mapa[r.user_id as string] = r.role as string;
    }
    return mapa;
  });
