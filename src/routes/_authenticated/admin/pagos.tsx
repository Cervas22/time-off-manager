import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Cargando, VacioEstado } from "@/components/estados";
import { useRolPrincipal } from "@/hooks/useAuth";
import { useEmpleados } from "@/lib/datos";
import { supabase } from "@/integrations/supabase/client";
import { fechaLarga, hoyISO } from "@/lib/tz";

export const Route = createFileRoute("/_authenticated/admin/pagos")({
  head: () => ({
    meta: [
      { title: "Pagos programados | Administración" },
      {
        name: "description",
        content: "Consulta y marca los pagos de vacaciones programados por fecha y empleado.",
      },
      { property: "og:title", content: "Pagos programados" },
      { property: "og:description", content: "Calendario de pagos de vacaciones del personal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPagos,
});

type Pago = {
  id: string;
  employee_id: string;
  payment_date: string;
  status: "programado" | "pagado" | "cancelado";
};

function AdminPagos() {
  const { esAdmin, cargando } = useRolPrincipal();
  const { data: empleados } = useEmpleados();
  const qc = useQueryClient();

  const { data: pagos, isLoading } = useQuery({
    queryKey: ["pagos"],
    enabled: esAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vacation_payments")
        .select("id, employee_id, payment_date, status")
        .order("payment_date");
      if (error) throw error;
      return (data ?? []) as Pago[];
    },
  });

  const empMap = useMemo(() => new Map((empleados ?? []).map((e) => [e.id, e])), [empleados]);

  const cambiarEstado = async (id: string, status: Pago["status"]) => {
    const { error } = await supabase.from("vacation_payments").update({ status }).eq("id", id);
    if (error) {
      toast.error("No se pudo actualizar el pago");
      return;
    }
    toast.success("Pago actualizado");
    qc.invalidateQueries({ queryKey: ["pagos"] });
  };

  if (cargando || isLoading) return <Cargando />;
  if (!esAdmin)
    return <VacioEstado titulo="Acceso restringido" descripcion="Solo para administradores." />;

  const hoy = hoyISO();
  const proximos = (pagos ?? []).filter((p) => p.payment_date >= hoy);
  const pasados = (pagos ?? []).filter((p) => p.payment_date < hoy);

  const Fila = ({ p }: { p: Pago }) => (
    <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <p className="font-semibold">{empMap.get(p.employee_id)?.full_name ?? "Empleado"}</p>
        <p className="text-sm text-muted-foreground">
          {fechaLarga(p.payment_date)} ·{" "}
          {p.status === "programado" ? "Programado" : p.status === "pagado" ? "Pagado" : "Cancelado"}
        </p>
      </div>
      {p.status === "programado" && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => cambiarEstado(p.id, "pagado")}>
            Marcar pagado
          </Button>
          <Button size="sm" variant="outline" onClick={() => cambiarEstado(p.id, "cancelado")}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        titulo="Pagos programados"
        descripcion="Este módulo solo registra fechas: no realiza cálculos monetarios ni conexión con nómina."
      />

      <h2 className="mb-3 text-lg font-semibold">Próximos</h2>
      {proximos.length === 0 ? (
        <VacioEstado titulo="Sin pagos próximos" />
      ) : (
        <div className="space-y-2">
          {proximos.map((p) => (
            <Fila key={p.id} p={p} />
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold">Historial</h2>
      {pasados.length === 0 ? (
        <VacioEstado titulo="Sin historial" />
      ) : (
        <div className="space-y-2">
          {pasados.map((p) => (
            <Fila key={p.id} p={p} />
          ))}
        </div>
      )}
    </>
  );
}
