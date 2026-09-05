import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/AppLayout";
import { Cargando, VacioEstado } from "@/components/estados";
import { useRolPrincipal } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fechaHoraLarga } from "@/lib/tz";

export const Route = createFileRoute("/_authenticated/admin/auditoria")({
  head: () => ({
    meta: [
      { title: "Bitácora de auditoría | Administración" },
      {
        name: "description",
        content: "Historial de acciones administrativas: quién hizo qué y cuándo.",
      },
      { property: "og:title", content: "Bitácora de auditoría" },
      { property: "og:description", content: "Trazabilidad completa de las acciones del sistema." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Auditoria,
});

function Auditoria() {
  const { esAdmin, cargando } = useRolPrincipal();
  const { data, isLoading } = useQuery({
    queryKey: ["auditoria"],
    enabled: esAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as {
        id: string;
        action: string;
        entity: string;
        entity_id: string | null;
        actor_user_id: string | null;
        created_at: string;
      }[];
    },
  });

  if (cargando || isLoading) return <Cargando />;
  if (!esAdmin)
    return <VacioEstado titulo="Acceso restringido" descripcion="Solo para administradores." />;

  const lista = data ?? [];

  return (
    <>
      <PageHeader
        titulo="Bitácora"
        descripcion="Últimas 300 acciones registradas en el sistema."
      />
      {lista.length === 0 ? (
        <VacioEstado titulo="Sin registros" />
      ) : (
        <div className="surface-card divide-y divide-border">
          {lista.map((r) => (
            <div key={r.id} className="flex flex-wrap justify-between gap-2 p-3 text-sm">
              <span className="font-medium">{r.action.replace(/_/g, " ")}</span>
              <span className="text-muted-foreground">
                {r.entity} · {fechaHoraLarga(r.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
