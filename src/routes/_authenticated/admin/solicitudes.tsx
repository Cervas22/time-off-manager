import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppLayout";
import { EtiquetaEstado } from "@/routes/_authenticated/mis-solicitudes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Cargando, VacioEstado } from "@/components/estados";
import { useAuth, useRolPrincipal } from "@/hooks/useAuth";
import {
  registrarAuditoria,
  useAreas,
  useCategorias,
  useEmpleados,
  useFestivos,
  useSolicitudesAprobadas,
  useSolicitudesPendientes,
  type Solicitud,
} from "@/lib/datos";
import { calcularPeriodo } from "@/lib/reglas";
import { supabase } from "@/integrations/supabase/client";
import { fechaHoraLarga, fechaLarga } from "@/lib/tz";

export const Route = createFileRoute("/_authenticated/admin/solicitudes")({
  head: () => ({
    meta: [
      { title: "Revisión de solicitudes | Administración" },
      {
        name: "description",
        content: "Aprueba, modifica o rechaza solicitudes de vacaciones y permisos del personal.",
      },
      { property: "og:title", content: "Revisión de solicitudes" },
      { property: "og:description", content: "Bandeja administrativa de solicitudes pendientes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminSolicitudes,
});

function AdminSolicitudes() {
  const { user } = useAuth();
  const { esAdmin, cargando } = useRolPrincipal();
  const { data: pendientes, isLoading } = useSolicitudesPendientes();
  const { data: aprobadas, isLoading: cargandoAprobadas } = useSolicitudesAprobadas();
  const { data: empleados } = useEmpleados();
  const { data: areas } = useAreas();
  const { data: categorias } = useCategorias();
  const { data: festivos } = useFestivos();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"pendientes" | "aprobadas">("pendientes");
  const [activa, setActiva] = useState<Solicitud | null>(null);
  const [comentario, setComentario] = useState("");
  const [excepcion, setExcepcion] = useState("");
  const [nuevoInicio, setNuevoInicio] = useState("");
  const [nuevosDias, setNuevosDias] = useState(0);
  const [nuevaPago, setNuevaPago] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [cancelando, setCancelando] = useState<Solicitud | null>(null);
  const [motivoCancel, setMotivoCancel] = useState("");
  const [modificando, setModificando] = useState<Solicitud | null>(null);

  const setFestivos = useMemo(
    () => new Set((festivos ?? []).map((f) => f.holiday_date)),
    [festivos],
  );
  const empMap = useMemo(() => new Map((empleados ?? []).map((e) => [e.id, e])), [empleados]);
  const areaMap = useMemo(() => new Map((areas ?? []).map((a) => [a.id, a])), [areas]);
  const catMap = useMemo(() => new Map((categorias ?? []).map((c) => [c.id, c])), [categorias]);

  const abrir = (s: Solicitud) => {
    setActiva(s);
    setComentario("");
    setExcepcion("");
    setNuevoInicio(s.start_date);
    setNuevosDias(Number(s.days_count));
    setNuevaPago(s.payment_date ?? "");
  };

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["solicitudes-pendientes"] });
    qc.invalidateQueries({ queryKey: ["ausencias"] });
    qc.invalidateQueries({ queryKey: ["mis-solicitudes"] });
  };

  const notificarEmpleado = async (s: Solicitud, titulo: string, mensaje: string) => {
    const emp = empMap.get(s.employee_id);
    if (!emp?.user_id) return;
    await supabase.from("notifications").insert({
      user_id: emp.user_id,
      type: "resolucion_solicitud",
      title: titulo,
      message: mensaje,
      request_id: s.id,
    });
  };

  const resolver = async (accion: "aprobar" | "modificar" | "rechazar") => {
    if (!activa) return;
    if (accion === "rechazar" && !comentario.trim()) {
      toast.error("El motivo del rechazo es obligatorio");
      return;
    }
    setProcesando(true);

    const porDias = activa.mode === "dias_completos";
    const modificado = accion === "modificar";
    const inicio = modificado ? nuevoInicio : activa.start_date;
    const dias = modificado ? nuevosDias : Number(activa.days_count);
    const fin = porDias && dias > 0 ? calcularPeriodo(inicio, dias, setFestivos).fin : activa.end_date;
    const pago = modificado ? nuevaPago || null : activa.payment_date;

    const estado =
      accion === "rechazar" ? "rechazada" : accion === "modificar" ? "modificada_aprobada" : "aprobada";

    const { data: actualizada, error } = await supabase
      .from("requests")
      .update({
        status: estado,
        start_date: inicio,
        end_date: fin,
        days_count: porDias ? dias : activa.days_count,
        payment_date: pago,
        admin_comment: comentario.trim() || null,
        exception_reason: excepcion.trim() || null,
        resolved_by: user?.id ?? null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", activa.id)
      .select()
      .single();

    if (error) {
      setProcesando(false);
      toast.error("No se pudo actualizar la solicitud", { description: error.message });
      return;
    }

    if (accion !== "rechazar") {
      await supabase.from("absence_periods").insert({
        employee_id: activa.employee_id,
        request_id: activa.id,
        category_id: activa.category_id,
        start_date: inicio,
        end_date: fin,
        start_time: activa.start_time,
        end_time: activa.end_time,
        label: catMap.get(activa.category_id ?? "")?.name ?? "Ausencia",
      });

      if (activa.cycle_id && porDias && dias > 0) {
        const { data: ciclo } = await supabase
          .from("vacation_cycles")
          .select("taken_days")
          .eq("id", activa.cycle_id)
          .maybeSingle();
        await supabase
          .from("vacation_cycles")
          .update({ taken_days: Number(ciclo?.taken_days ?? 0) + dias })
          .eq("id", activa.cycle_id);
      }

      if (pago) {
        await supabase.from("vacation_payments").insert({
          employee_id: activa.employee_id,
          cycle_id: activa.cycle_id,
          request_id: activa.id,
          payment_date: pago,
          created_by: user?.id ?? null,
        });
      }
    }

    await notificarEmpleado(
      activa,
      accion === "rechazar" ? "Solicitud rechazada" : "Solicitud aprobada",
      accion === "rechazar"
        ? `Tu solicitud del ${fechaLarga(activa.start_date)} fue rechazada. Motivo: ${comentario}`
        : `Tu solicitud quedó autorizada del ${fechaLarga(inicio)} al ${fechaLarga(fin)}.`,
    );
    await registrarAuditoria({
      actorUserId: user?.id ?? null,
      accion: `resolver_solicitud_${estado}`,
      entidad: "requests",
      entidadId: activa.id,
      antes: activa,
      despues: actualizada,
    });

    setProcesando(false);
    setActiva(null);
    refrescar();
    toast.success(accion === "rechazar" ? "Solicitud rechazada" : "Solicitud autorizada");
  };

  if (cargando || isLoading) return <Cargando />;
  if (!esAdmin)
    return (
      <VacioEstado
        titulo="Acceso restringido"
        descripcion="Solo los administradores pueden revisar y resolver solicitudes."
      />
    );

  const lista = pendientes ?? [];

  return (
    <>
      <PageHeader
        titulo="Solicitudes pendientes"
        descripcion={`${lista.length} solicitud(es) esperando revisión.`}
      />

      {lista.length === 0 ? (
        <VacioEstado titulo="Todo revisado" descripcion="No hay solicitudes pendientes." />
      ) : (
        <div className="space-y-3">
          {lista.map((s) => {
            const emp = empMap.get(s.employee_id);
            const area = emp?.area_id ? areaMap.get(emp.area_id) : undefined;
            const cat = s.category_id ? catMap.get(s.category_id) : undefined;
            return (
              <div key={s.id} className="surface-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{emp?.full_name ?? "Empleado"}</p>
                      <EtiquetaEstado estado={s.status} />
                      {cat && (
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-medium text-primary-foreground"
                          style={{ backgroundColor: cat.color }}
                        >
                          {cat.name}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {area?.name ?? "Sin área"} · {emp?.position ?? "Sin puesto"} · Solicitada el{" "}
                      {fechaHoraLarga(s.created_at)}
                    </p>
                    <p className="mt-2 text-sm">
                      {fechaLarga(s.start_date)}
                      {s.end_date !== s.start_date ? ` — ${fechaLarga(s.end_date)}` : ""} ·{" "}
                      {Number(s.days_count) > 0
                        ? `${Number(s.days_count)} día(s)`
                        : `${Number(s.hours_count)} hora(s)`}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{s.reason}</p>
                  </div>
                  <Button onClick={() => abrir(s)}>Revisar</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!activa} onOpenChange={(o) => !o && setActiva(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resolver solicitud</DialogTitle>
            <DialogDescription>
              {empMap.get(activa?.employee_id ?? "")?.full_name} ·{" "}
              {activa ? fechaLarga(activa.start_date) : ""}
            </DialogDescription>
          </DialogHeader>

          {activa && (
            <div className="space-y-4">
              {activa.document_path && (
                <Button variant="outline" size="sm" onClick={() => verDocumento(activa.document_path!)}>
                  Ver documento adjunto
                </Button>
              )}

              {activa.mode === "dias_completos" && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ni">Inicio</Label>
                    <Input
                      id="ni"
                      type="date"
                      value={nuevoInicio}
                      onChange={(e) => setNuevoInicio(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nd">Días</Label>
                    <Input
                      id="nd"
                      type="number"
                      min={0}
                      value={nuevosDias}
                      onChange={(e) => setNuevosDias(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="np">Pago</Label>
                    <Input
                      id="np"
                      type="date"
                      value={nuevaPago}
                      onChange={(e) => setNuevaPago(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="com">Comentario para el empleado</Label>
                <Textarea
                  id="com"
                  rows={3}
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Obligatorio al rechazar"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exc">Justificación de excepción (opcional)</Label>
                <Input
                  id="exc"
                  value={excepcion}
                  onChange={(e) => setExcepcion(e.target.value)}
                  placeholder="Si autorizas fuera de las reglas configuradas"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <Button disabled={procesando} onClick={() => resolver("aprobar")}>
                  Aprobar
                </Button>
                <Button
                  variant="secondary"
                  disabled={procesando}
                  onClick={() => resolver("modificar")}
                >
                  Modificar y aprobar
                </Button>
                <Button
                  variant="destructive"
                  disabled={procesando}
                  onClick={() => resolver("rechazar")}
                >
                  Rechazar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

async function verDocumento(ruta: string) {
  const { data, error } = await supabase.storage.from("documentos").createSignedUrl(ruta, 300);
  if (error || !data) {
    toast.error("No se pudo abrir el documento");
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener");
}
