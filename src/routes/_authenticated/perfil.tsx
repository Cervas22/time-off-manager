import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cargando } from "@/components/estados";
import { useAuth, useMiEmpleado, usePerfil, useRolPrincipal } from "@/hooks/useAuth";
import { useAreas } from "@/lib/datos";
import { supabase } from "@/integrations/supabase/client";
import { antiguedadAnios, fechaLarga } from "@/lib/tz";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Mi perfil | Control de Vacaciones y Permisos" },
      {
        name: "description",
        content: "Consulta tus datos laborales y cambia tu contraseña de acceso.",
      },
      { property: "og:title", content: "Mi perfil" },
      { property: "og:description", content: "Datos laborales y seguridad de tu cuenta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const { user } = useAuth();
  const { data: empleado, isLoading } = useMiEmpleado();
  const { data: perfil } = usePerfil();
  const { data: areas } = useAreas();
  const { rol } = useRolPrincipal();

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const enviarCodigo = async () => {
    const { error } = await supabase.auth.reauthenticate();
    if (error) return toast.error("No se pudo enviar el código", { description: error.message });
    setCodigoEnviado(true);
    toast.success("Te enviamos un código de verificación a tu correo");
  };

  const cambiar = async () => {
    if (!actual.trim()) {
      toast.error("Escribe el código que llegó a tu correo");
      return;
    }
    if (nueva.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (nueva !== confirmar) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setGuardando(true);
    const { error } = await supabase.auth.updateUser({
      password: nueva,
      nonce: actual.trim(),
    });
    setGuardando(false);
    if (error) {
      toast.error("No se pudo actualizar la contraseña", { description: error.message });
      return;
    }
    setActual("");
    setNueva("");
    setConfirmar("");
    toast.success("Contraseña actualizada");
  };

  if (isLoading) return <Cargando />;

  const area = areas?.find((a) => a.id === empleado?.area_id);
  const etiquetaRol = rol === "admin" ? "Administrador" : rol === "jefe" ? "Jefe de área" : "Empleado";

  return (
    <>
      <PageHeader titulo="Mi perfil" descripcion="Tus datos laborales y acceso al sistema." />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-5">
          <p className="mb-4 text-sm font-semibold">Datos laborales</p>
          <dl className="space-y-3 text-sm">
            {[
              ["Nombre", empleado?.full_name ?? perfil?.full_name ?? "—"],
              ["Correo", empleado?.email ?? user?.email ?? "—"],
              ["Número de empleado", empleado?.employee_number ?? "—"],
              ["Puesto", empleado?.position ?? "—"],
              ["Área", area?.name ?? "Sin asignar"],
              ["Fecha de ingreso", empleado ? fechaLarga(empleado.hire_date) : "—"],
              ["Antigüedad", empleado ? `${antiguedadAnios(empleado.hire_date)} año(s)` : "—"],
              ["Rol en el sistema", etiquetaRol],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-border pb-2 last:border-0">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Si algún dato es incorrecto, solicita la corrección a tu administrador.
          </p>
        </div>

        <div className="surface-card p-5">
          <p className="mb-4 text-sm font-semibold">Cambiar contraseña</p>
          <div className="space-y-3">
            <Button variant="outline" onClick={enviarCodigo} className="w-full">
              {codigoEnviado ? "Reenviar código a mi correo" : "1. Enviarme código a mi correo"}
            </Button>
            <div className="space-y-1.5">
              <Label htmlFor="actual">2. Código de verificación</Label>
              <Input
                id="actual"
                inputMode="numeric"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nueva">Nueva contraseña</Label>
              <Input
                id="nueva"
                type="password"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmar">Confirmar nueva contraseña</Label>
              <Input
                id="confirmar"
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
              />
            </div>
            <Button onClick={cambiar} disabled={guardando} className="w-full">
              Actualizar contraseña
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
