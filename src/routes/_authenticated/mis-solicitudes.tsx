import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Cargando, VacioEstado } from "@/components/estados";
import { useMiEmpleado } from "@/hooks/useAuth";
import { useCategorias, useMisSolicitudes, type Solicitud } from "@/lib/datos";
import { supabase } from "@/integrations/supabase/client";
import { fechaLarga } from "@/lib/tz";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mis-solicitudes")({
  head: () => ({
    meta: [
      { title: "Mis solicitudes | Control de Vacaciones y Permisos" },
      {
        name: "description",
        content: "Consulta el estado de tus solicitudes de vacaciones y permisos.",
      },
      { property: "og:title", content: "Mis solicitudes" },
      { property: "og:description", content: "Estado de tus solicitudes de vacaciones y permisos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MisSolicitudes,
});

export function EtiquetaEstado({ estado }: { estado: Solicitud["status"] }) {
  const mapa: Record<Solicitud["status"], { txt: string; cls: string }> = {
    pendiente: { txt: "Pendiente", cls: "bg-warning/15 text-warning-foreground" },
    aprobada: { txt: "Aprobada", cls: "bg-success-soft text-success" },
    modificada_aprobada: { txt: "Modificada y aprobada", cls: "bg-primary-soft text-primary" },
    rechazada: { txt: "Rechazada", cls: "bg-destructive-soft text-destructive" },
    cancelada: { txt: "Cancelada", cls: "bg-muted text-muted-foreground" },
  };
  const it = mapa[estado];
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", it.cls)}>{it.txt}</span>
  );
}

const FILTROS = ["todas", "pendiente", "aprobada", "rechazada", "cancelada"] as const;

function MisSolicitudes() {
  const { data: empleado } = useMiEmpleado();
  const { data: solicitudes, isLoading } = useMisSolicitudes(empleado?.id);
  const { data: categorias } = useCategorias();
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>("todas");

  const cancelar = async (id: string) => {
    const { error } = await supabase.from("requests").update({ status: "cancelada" }).eq("id", id);
    if (error) {
      toast.error("No se pudo cancelar la solicitud");
      return;
    }
    toast.success("Solicitud cancelada");
    qc.invalidateQueries({ queryKey: ["mis-solicitudes"] });
  };

  if (isLoading) return <Cargando />;

  const catNombre = new Map((categorias ?? []).map((c) => [c.id, c]));
  const lista = (solicitudes ?? []).filter((s) => filtro === "todas" || s.status === filtro);

  return (
    <>
      <PageHeader titulo="Mis solicitudes" descripcion="Historial completo de tus peticiones." />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm capitalize transition-colors",
              filtro === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <VacioEstado titulo="Sin solicitudes" descripcion="Aquí aparecerán tus peticiones." />
      ) : (
        <div className="space-y-3">
          {lista.map((s) => {
            const cat = s.category_id ? catNombre.get(s.category_id) : undefined;
            return (
              <div key={s.id} className="surface-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {cat && (
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                      )}
                      <p className="font-semibold">{cat?.name ?? "Solicitud"}</p>
                      <EtiquetaEstado estado={s.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {fechaLarga(s.start_date)}
                      {s.end_date !== s.start_date ? ` — ${fechaLarga(s.end_date)}` : ""}
                      {s.start_time ? ` · ${s.start_time.slice(0, 5)}–${s.end_time?.slice(0, 5)}` : ""}
                    </p>
                    <p className="mt-2 text-sm">{s.reason}</p>
                    {s.admin_comment && (
                      <p className="mt-2 rounded-lg bg-muted p-2 text-sm">
                        <span className="font-medium">Nota del administrador: </span>
                        {s.admin_comment}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">
                      {Number(s.days_count) > 0
                        ? `${Number(s.days_count)} día(s)`
                        : `${Number(s.hours_count)} hora(s)`}
                    </p>
                    {s.payment_date && (
                      <p className="text-xs text-muted-foreground">
                        Pago: {fechaLarga(s.payment_date)}
                      </p>
                    )}
                    {s.status === "pendiente" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => cancelar(s.id)}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
