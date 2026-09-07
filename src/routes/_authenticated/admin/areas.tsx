import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cargando, VacioEstado } from "@/components/estados";
import { useRolPrincipal } from "@/hooks/useAuth";
import { useAreas } from "@/lib/datos";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/areas")({
  head: () => ({
    meta: [
      { title: "Áreas y horarios | Administración" },
      {
        name: "description",
        content:
          "Configura áreas de trabajo, ausencias simultáneas permitidas y plantillas de horario.",
      },
      { property: "og:title", content: "Áreas y horarios" },
      { property: "og:description", content: "Capacidad por área y plantillas de jornada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminAreas,
});

function AdminAreas() {
  const { esAdmin, cargando } = useRolPrincipal();
  const { data: areas, isLoading } = useAreas();
  const qc = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [maximo, setMaximo] = useState(1);

  const { data: horarios } = useQuery({
    queryKey: ["horarios"],
    enabled: esAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("schedule_templates").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as {
        id: string;
        name: string;
        description: string | null;
        is_rotating: boolean;
        is_night_shift: boolean;
      }[];
    },
  });

  const crearArea = async () => {
    if (!nombre.trim()) return;
    const { error } = await supabase
      .from("areas")
      .insert({ name: nombre.trim(), max_simultaneous_absences: maximo });
    if (error) {
      toast.error("No se pudo crear el área", { description: error.message });
      return;
    }
    setNombre("");
    setMaximo(1);
    toast.success("Área creada");
    qc.invalidateQueries({ queryKey: ["areas"] });
  };

  const actualizarMaximo = async (id: string, valor: number) => {
    const { error } = await supabase
      .from("areas")
      .update({ max_simultaneous_absences: valor })
      .eq("id", id);
    if (error) {
      toast.error("No se pudo actualizar el área");
      return;
    }
    qc.invalidateQueries({ queryKey: ["areas"] });
  };

  if (cargando || isLoading) return <Cargando />;
  if (!esAdmin)
    return <VacioEstado titulo="Acceso restringido" descripcion="Solo para administradores." />;

  return (
    <>
      <PageHeader
        titulo="Áreas y horarios"
        descripcion="Define cuántas personas pueden ausentarse al mismo tiempo en cada área."
      />

      <div className="surface-card mb-6 p-5">
        <p className="mb-3 text-sm font-semibold">Nueva área</p>
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max">Ausencias simultáneas</Label>
            <Input
              id="max"
              type="number"
              min={1}
              value={maximo}
              onChange={(e) => setMaximo(Number(e.target.value))}
            />
          </div>
          <Button onClick={crearArea}>
            <Plus className="mr-2 size-4" /> Agregar
          </Button>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Áreas registradas</h2>
      {(areas ?? []).length === 0 ? (
        <VacioEstado titulo="Sin áreas" descripcion="Crea la primera área de trabajo." />
      ) : (
        <div className="space-y-2">
          {(areas ?? []).map((a) => (
            <div key={a.id} className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">{a.name}</p>
                <p className="text-sm text-muted-foreground">
                  {a.description ?? "Sin descripción"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`m-${a.id}`} className="text-xs text-muted-foreground">
                  Máx. simultáneos
                </Label>
                <Input
                  id={`m-${a.id}`}
                  type="number"
                  min={1}
                  defaultValue={a.max_simultaneous_absences}
                  className="w-20"
                  onBlur={(e) => actualizarMaximo(a.id, Number(e.target.value))}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold">Plantillas de horario</h2>
      {(horarios ?? []).length === 0 ? (
        <VacioEstado
          titulo="Sin plantillas de horario"
          descripcion="Las plantillas permiten distinguir turnos fijos, rotativos y nocturnos."
        />
      ) : (
        <div className="surface-card divide-y divide-border">
          {(horarios ?? []).map((h) => (
            <div key={h.id} className="flex flex-wrap justify-between gap-2 p-4 text-sm">
              <span className="font-medium">{h.name}</span>
              <span className="text-muted-foreground">
                {h.is_rotating ? "Rotativo" : "Fijo"}
                {h.is_night_shift ? " · Nocturno" : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
