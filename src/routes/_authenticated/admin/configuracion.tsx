import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Cargando, VacioEstado } from "@/components/estados";
import { useAuth, useRolPrincipal } from "@/hooks/useAuth";
import {
  registrarAuditoria,
  useAjustes,
  useCategorias,
  useFestivos,
  useReglasAntiguedad,
  useTipos,
} from "@/lib/datos";
import { supabase } from "@/integrations/supabase/client";
import { fechaLarga } from "@/lib/tz";

export const Route = createFileRoute("/_authenticated/admin/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración de reglas | Administración" },
      {
        name: "description",
        content:
          "Ajusta la tabla de antigüedad, políticas de vacaciones, días festivos y tipos de permiso.",
      },
      { property: "og:title", content: "Configuración de reglas" },
      { property: "og:description", content: "Reglas legales y políticas internas configurables." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminConfiguracion,
});

const INTERRUPTORES: { key: string; etiqueta: string; ayuda: string }[] = [
  {
    key: "vacation_start_monday",
    etiqueta: "Las vacaciones deben iniciar en lunes",
    ayuda: "Política interna de la empresa, no un requisito legal.",
  },
  {
    key: "payment_day_rule_enabled",
    etiqueta: "Aplicar regla de día de pago",
    ayuda: "Activa la validación de la fecha de pago al solicitar vacaciones.",
  },
  {
    key: "payment_day_friday",
    etiqueta: "Los pagos se programan en viernes",
    ayuda: "Solo aplica si la regla de día de pago está activa.",
  },
  {
    key: "allow_expired_accrual",
    etiqueta: "Permitir acumular días vencidos",
    ayuda: "Configurable por empleado desde su expediente.",
  },
];

const NUMERICOS: { key: string; etiqueta: string; ayuda: string }[] = [
  {
    key: "min_continuous_days",
    etiqueta: "Mínimo de días continuos de vacaciones",
    ayuda: "Se valida al enviar la solicitud.",
  },
  {
    key: "max_permission_days_deducted",
    etiqueta: "Máximo de días de permiso descontables de vacaciones",
    ayuda: "Aplica a los tipos marcados como descontables.",
  },
];

function AdminConfiguracion() {
  const { user } = useAuth();
  const { esAdmin, cargando } = useRolPrincipal();
  const { data: ajustes, isLoading } = useAjustes();
  const { data: reglas } = useReglasAntiguedad();
  const { data: festivos } = useFestivos();
  const { data: categorias } = useCategorias();
  const { data: tipos } = useTipos();
  const qc = useQueryClient();
  const [guardando, setGuardando] = useState<string | null>(null);

  const guardar = async (key: string, value: unknown) => {
    setGuardando(key);
    const { error } = await supabase
      .from("app_settings")
      .update({ value: value as never, updated_at: new Date().toISOString() })
      .eq("key", key);
    setGuardando(null);
    if (error) {
      toast.error("No se pudo guardar el ajuste", { description: error.message });
      return;
    }
    await registrarAuditoria({
      actorUserId: user?.id ?? null,
      accion: "actualizar_ajuste",
      entidad: "app_settings",
      despues: { key, value },
    });
    toast.success("Configuración actualizada");
    qc.invalidateQueries({ queryKey: ["ajustes"] });
  };

  const guardarDias = async (id: string, dias: number) => {
    const { error } = await supabase.from("seniority_rules").update({ days: dias }).eq("id", id);
    if (error) {
      toast.error("No se pudo actualizar la tabla de antigüedad");
      return;
    }
    toast.success("Tabla de antigüedad actualizada");
    qc.invalidateQueries({ queryKey: ["reglas-antiguedad"] });
  };

  if (cargando || isLoading) return <Cargando />;
  if (!esAdmin)
    return <VacioEstado titulo="Acceso restringido" descripcion="Solo para administradores." />;

  return (
    <>
      <PageHeader
        titulo="Configuración"
        descripcion="Todas las reglas son editables: nada está fijo en el código."
      />

      <div className="surface-card mb-6 p-5">
        <p className="mb-4 text-sm font-semibold">Políticas de solicitud</p>
        <div className="space-y-4">
          {INTERRUPTORES.map((i) => (
            <div key={i.key} className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor={i.key}>{i.etiqueta}</Label>
                <p className="text-xs text-muted-foreground">{i.ayuda}</p>
              </div>
              <Switch
                id={i.key}
                disabled={guardando === i.key}
                checked={Boolean(ajustes?.[i.key])}
                onCheckedChange={(v) => guardar(i.key, v)}
              />
            </div>
          ))}

          {NUMERICOS.map((n) => (
            <div key={n.key} className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <Label htmlFor={n.key}>{n.etiqueta}</Label>
                <p className="text-xs text-muted-foreground">{n.ayuda}</p>
              </div>
              <Input
                id={n.key}
                type="number"
                min={0}
                className="w-24"
                defaultValue={Number(ajustes?.[n.key] ?? 0)}
                onBlur={(e) => guardar(n.key, Number(e.target.value))}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="surface-card mb-6 p-5">
        <p className="mb-1 text-sm font-semibold">Tabla de antigüedad</p>
        <p className="mb-4 text-xs text-muted-foreground">
          Valores iniciales conforme a la LFT vigente. Puedes ajustarlos si tu empresa otorga más
          días.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(reglas ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <span className="text-sm">
                Año {r.year_from}
                {r.year_to && r.year_to !== r.year_from ? `–${r.year_to}` : ""}
              </span>
              <Input
                type="number"
                min={0}
                className="w-20"
                defaultValue={r.days}
                onBlur={(e) => guardarDias(r.id, Number(e.target.value))}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-5">
          <p className="mb-3 text-sm font-semibold">Días festivos</p>
          <div className="max-h-72 space-y-1.5 overflow-y-auto text-sm">
            {(festivos ?? []).map((f) => (
              <div key={f.id} className="flex justify-between gap-3 border-b border-border pb-1.5">
                <span>{f.name}</span>
                <span className="text-muted-foreground">{fechaLarga(f.holiday_date)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <p className="mb-3 text-sm font-semibold">Categorías y tipos de solicitud</p>
          <div className="max-h-72 space-y-3 overflow-y-auto text-sm">
            {(categorias ?? []).map((c) => (
              <div key={c.id}>
                <p className="flex items-center gap-2 font-medium">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </p>
                <ul className="mt-1 space-y-1 pl-5 text-muted-foreground">
                  {(tipos ?? [])
                    .filter((t) => t.category_id === c.id)
                    .map((t) => (
                      <li key={t.id}>
                        {t.name}
                        {t.deducts_vacation ? " · descuenta vacaciones" : ""}
                        {t.requires_document ? " · requiere comprobante" : ""}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
