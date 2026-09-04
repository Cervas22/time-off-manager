import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Cargando, VacioEstado } from "@/components/estados";
import { useAuth, useMiEmpleado } from "@/hooks/useAuth";
import {
  notificarAdministradores,
  registrarAuditoria,
  useAjustes,
  useAreas,
  useAusencias,
  useCategorias,
  useCicloVigente,
  useEmpleados,
  useFestivos,
  useTipos,
} from "@/lib/datos";
import { calcularPeriodo, leerAjuste, validarSolicitudVacaciones } from "@/lib/reglas";
import { agregarDias, fechaLarga, hoyISO } from "@/lib/tz";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/solicitar-vacaciones")({
  head: () => ({
    meta: [
      { title: "Solicitar vacaciones | Control de Vacaciones y Permisos" },
      {
        name: "description",
        content:
          "Selecciona fecha de inicio, días laborables y fecha de pago para enviar tu solicitud de vacaciones.",
      },
      { property: "og:title", content: "Solicitar vacaciones" },
      { property: "og:description", content: "Envía tu solicitud de vacaciones con validaciones automáticas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SolicitarVacaciones,
});

function SolicitarVacaciones() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: empleado, isLoading } = useMiEmpleado();
  const { data: ciclo } = useCicloVigente(empleado?.id);
  const { data: ajustes } = useAjustes();
  const { data: festivos } = useFestivos();
  const { data: categorias } = useTiposYCategorias();
  const { data: areas } = useAreas();
  const { data: empleados } = useEmpleados();

  const [inicio, setInicio] = useState(agregarDias(hoyISO(), 7));
  const [dias, setDias] = useState(12);
  const [fechaPago, setFechaPago] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pagosOcupados, setPagosOcupados] = useState<string[]>([]);

  const setFestivos = useMemo(
    () => new Set((festivos ?? []).map((f) => f.holiday_date)),
    [festivos],
  );

  const periodo = useMemo(
    () => calcularPeriodo(inicio, Math.max(0, dias), setFestivos),
    [inicio, dias, setFestivos],
  );

  const { data: ausencias } = useAusencias(inicio, periodo.fin || inicio);

  const asignados = Number(ciclo?.assigned_days ?? 0);
  const tomados = Number(ciclo?.taken_days ?? 0);
  const vencidos = Number(ciclo?.expired_days ?? 0);
  const disponibles = Math.max(0, asignados - tomados - vencidos);

  const area = areas?.find((a) => a.id === empleado?.area_id);
  const empMap = new Map((empleados ?? []).map((e) => [e.id, e]));
  const ocupantes = (ausencias ?? [])
    .filter((a) => a.employee_id !== empleado?.id && empMap.get(a.employee_id)?.area_id === area?.id)
    .map((a) => empMap.get(a.employee_id)?.full_name ?? "Compañero");
  const capacidadDisponible = area ? area.max_simultaneous_absences - ocupantes.length : null;

  const validaciones = validarSolicitudVacaciones({
    inicio,
    dias,
    diasDisponibles: disponibles,
    iniciaLunesObligatorio: leerAjuste<boolean>(ajustes, "vacation_start_monday"),
    minimoContinuo: Number(leerAjuste<number>(ajustes, "min_continuous_days")),
    fechaPago: fechaPago || null,
    reglaPagoViernes:
      leerAjuste<boolean>(ajustes, "payment_day_rule_enabled") &&
      leerAjuste<boolean>(ajustes, "payment_day_friday"),
    fechasPagoOcupadas: pagosOcupados,
    capacidadDisponible,
    ocupantes,
  });

  const errores = validaciones.filter((v) => v.nivel === "error");

  const enviar = async () => {
    if (!empleado || errores.length) return;
    setEnviando(true);

    const { data: pagos } = await supabase
      .from("vacation_payments")
      .select("payment_date")
      .eq("employee_id", empleado.id)
      .neq("status", "cancelado");
    const ocupadas = (pagos ?? []).map((p) => p.payment_date as string);
    if (fechaPago && ocupadas.includes(fechaPago)) {
      setPagosOcupados(ocupadas);
      setEnviando(false);
      toast.error("Esa fecha de pago ya está programada. Selecciona otra fecha.");
      return;
    }

    const catVac = categorias?.find((c) => c.code === "VACACIONES");
    const { data: creada, error } = await supabase
      .from("requests")
      .insert({
        employee_id: empleado.id,
        category_id: catVac?.id ?? null,
        type_id: catVac?.tipoId ?? null,
        cycle_id: ciclo?.id ?? null,
        mode: "dias_completos",
        start_date: inicio,
        end_date: periodo.fin,
        days_count: dias,
        reason: motivo || "Solicitud de vacaciones",
        payment_date: fechaPago || null,
      })
      .select()
      .single();

    setEnviando(false);
    if (error) {
      toast.error("No se pudo enviar la solicitud", { description: error.message });
      return;
    }

    await notificarAdministradores({
      tipo: "nueva_solicitud",
      titulo: "Nueva solicitud de vacaciones",
      mensaje: `${empleado.full_name} solicitó ${dias} día(s) del ${fechaLarga(inicio)} al ${fechaLarga(periodo.fin)}.`,
      requestId: creada?.id as string,
    });
    await registrarAuditoria({
      actorUserId: user?.id ?? null,
      accion: "crear_solicitud_vacaciones",
      entidad: "requests",
      entidadId: creada?.id as string,
      despues: creada,
    });

    toast.success("Solicitud enviada", { description: "Tu solicitud quedó en estado Pendiente." });
    navigate({ to: "/mis-solicitudes" });
  };

  if (isLoading) return <Cargando />;
  if (!empleado)
    return (
      <VacioEstado
        titulo="Sin expediente de empleado"
        descripcion="Tu administrador debe darte de alta para poder solicitar vacaciones."
      />
    );

  return (
    <>
      <PageHeader
        titulo="Solicitar vacaciones"
        descripcion="Días completos y laborables. El sistema calcula la fecha final automáticamente."
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="surface-card p-5">
          <div className="mb-5 grid gap-3 rounded-lg bg-muted p-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Días asignados</p>
              <p className="text-lg font-bold">{asignados}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Días tomados</p>
              <p className="text-lg font-bold">{tomados}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Disponibles</p>
              <p className="text-lg font-bold text-success">{disponibles}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inicio">Fecha de inicio</Label>
              <Input
                id="inicio"
                type="date"
                value={inicio}
                min={hoyISO()}
                onChange={(e) => setInicio(e.target.value)}
              />
              {leerAjuste<boolean>(ajustes, "vacation_start_monday") && (
                <p className="text-xs text-muted-foreground">
                  Política interna de la empresa: el periodo debe iniciar en lunes (configurable).
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dias">Cantidad de días laborables</Label>
              <Input
                id="dias"
                type="number"
                min={1}
                max={60}
                value={dias}
                onChange={(e) => setDias(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pago">Fecha de pago</Label>
              <Input
                id="pago"
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {leerAjuste<boolean>(ajustes, "payment_day_friday")
                  ? "Configuración actual: los pagos se programan en viernes."
                  : "La regla de viernes está desactivada; puedes elegir otra fecha."}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="motivo">Comentario (opcional)</Label>
              <Textarea
                id="motivo"
                rows={3}
                value={motivo}
                placeholder="Información adicional para el administrador"
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface-card p-5">
            <p className="mb-3 text-sm font-semibold">Resumen</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Inicio</dt>
                <dd className="font-medium">{fechaLarga(inicio)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Fin calculado</dt>
                <dd className="font-medium">{fechaLarga(periodo.fin)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Días laborables</dt>
                <dd className="font-medium">{periodo.fechas.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Fecha de pago</dt>
                <dd className="font-medium">{fechaPago ? fechaLarga(fechaPago) : "Sin definir"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Área</dt>
                <dd className="font-medium">{area?.name ?? "Sin área"}</dd>
              </div>
              {area && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Capacidad del área</dt>
                  <dd className="font-medium">
                    {Math.max(0, capacidadDisponible ?? 0)} de {area.max_simultaneous_absences}{" "}
                    disponibles
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {validaciones.length > 0 && (
            <div className="space-y-2">
              {validaciones.map((v, i) => (
                <div
                  key={i}
                  className={
                    v.nivel === "error"
                      ? "flex gap-2 rounded-lg border border-destructive/30 bg-destructive-soft p-3 text-sm text-destructive"
                      : "flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm"
                  }
                >
                  {v.nivel === "error" ? (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  ) : (
                    <Info className="mt-0.5 size-4 shrink-0" />
                  )}
                  <p>{v.mensaje}</p>
                </div>
              ))}
            </div>
          )}

          {validaciones.length === 0 && (
            <div className="flex gap-2 rounded-lg border border-success/30 bg-success-soft p-3 text-sm text-success">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <p>La solicitud cumple con todas las validaciones.</p>
            </div>
          )}

          <Button className="w-full" size="lg" disabled={enviando || errores.length > 0} onClick={enviar}>
            {enviando && <Loader2 className="mr-2 size-4 animate-spin" />}
            Enviar solicitud
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Se notificará a los administradores para su revisión.
          </p>
        </div>
      </div>
    </>
  );
}

/** Categorías con el id del tipo principal de vacaciones */
function useTiposYCategorias() {
  const categorias = useCategorias();
  const tipos = useTipos();
  return {
    data: (categorias.data ?? []).map((c) => ({
      ...c,
      tipoId: (tipos.data ?? []).find((t) => t.category_id === c.id)?.id ?? null,
    })),
    isLoading: categorias.isLoading || tipos.isLoading,
  };
}
