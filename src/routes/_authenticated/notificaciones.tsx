import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BellRing } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Cargando, VacioEstado } from "@/components/estados";
import { useAuth } from "@/hooks/useAuth";
import { useNotificaciones } from "@/lib/datos";
import { supabase } from "@/integrations/supabase/client";
import { fechaHoraLarga } from "@/lib/tz";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notificaciones")({
  head: () => ({
    meta: [
      { title: "Notificaciones | Control de Vacaciones y Permisos" },
      {
        name: "description",
        content: "Avisos sobre tus solicitudes, aprobaciones, rechazos y recordatorios.",
      },
      { property: "og:title", content: "Notificaciones" },
      { property: "og:description", content: "Avisos de solicitudes y recordatorios del sistema." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Notificaciones,
});

function Notificaciones() {
  const { user } = useAuth();
  const { data, isLoading } = useNotificaciones(user?.id);
  const qc = useQueryClient();

  const marcarTodas = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    qc.invalidateQueries({ queryKey: ["notificaciones"] });
    qc.invalidateQueries({ queryKey: ["notificaciones-no-leidas"] });
  };

  const marcarUna = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notificaciones"] });
    qc.invalidateQueries({ queryKey: ["notificaciones-no-leidas"] });
  };

  if (isLoading) return <Cargando />;

  const lista = data ?? [];
  const noLeidas = lista.filter((n) => !n.is_read).length;

  return (
    <>
      <PageHeader
        titulo="Notificaciones"
        descripcion={noLeidas > 0 ? `${noLeidas} sin leer` : "Todo al día"}
        accion={
          noLeidas > 0 ? (
            <Button variant="outline" onClick={marcarTodas}>
              Marcar todas como leídas
            </Button>
          ) : undefined
        }
      />

      {lista.length === 0 ? (
        <VacioEstado
          titulo="Sin notificaciones"
          descripcion="Aquí verás avisos sobre tus solicitudes y recordatorios."
        />
      ) : (
        <div className="space-y-2">
          {lista.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.is_read && marcarUna(n.id)}
              className={cn(
                "surface-card flex w-full gap-3 p-4 text-left transition-colors",
                !n.is_read && "border-primary/40 bg-primary-soft",
              )}
            >
              <BellRing
                className={cn("mt-0.5 size-4 shrink-0", n.is_read ? "text-muted-foreground" : "text-primary")}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{fechaHoraLarga(n.created_at)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
