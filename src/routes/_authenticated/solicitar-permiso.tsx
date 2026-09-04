import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cargando, VacioEstado } from "@/components/estados";
import { useAuth, useMiEmpleado } from "@/hooks/useAuth";
import {
  notificarAdministradores,
  registrarAuditoria,
  useAjustes,
  useCategorias,
  useCicloVigente,
  useFestivos,
  useTipos,
} from "@/lib/datos";
import { calcularPeriodo, leerAjuste } from "@/lib/reglas";
import { fechaLarga, hoyISO } from "@/lib/tz";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/solicitar-permiso")({
  head: () => ({
    meta: [
      { title: "Solicitar permiso | Control de Vacaciones y Permisos" },
      {
        name: "description",
        content:
          "Solicita permisos por días, por horas, entrada tardía o salida anticipada con documento adjunto.",
      },
      { property: "og:title", content: "Solicitar permiso" },
      { property: "og:description", content: "Permisos por días u horas con motivo y comprobante." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SolicitarPermiso,
});

type Modalidad = "dias_completos" | "horas" | "entrada_tardia" | "salida_anticipada";

const MODALIDADES: { valor: Modalidad; etiqueta: string }[] = [
  { valor: "dias_completos", etiqueta: "Días completos" },
  { valor: "horas", etiqueta: "Por horas" },
  { valor: "entrada_tardia", etiqueta: "Entrada tardía" },
  { valor: "salida_anticipada", etiqueta: "Salida anticipada" },
];

function SolicitarPermiso() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: empleado, isLoading } = useMiEmpleado();
  const { data: categorias } = useCategorias();
  const { data: tipos } = useTipos();
  const { data: festivos } = useFestivos();
  const { data: ajustes } = useAjustes();
  const { data: ciclo } = useCicloVigente(empleado?.id);

  const [categoriaId, setCategoriaId] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [modalidad, setModalidad] = useState<Modalidad>("dias_completos");
  const [fecha, setFecha] = useState(hoyISO());
  const [dias, setDias] = useState(1);
  const [horaInicio, setHoraInicio] = useState("08:30");
  const [horaFin, setHoraFin] = useState("10:00");
  const [motivo, setMotivo] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  const tiposCategoria = (tipos ?? []).filter(
    (t) => t.is_active && (!categoriaId || t.category_id === categoriaId),
  );
  const tipo = tiposCategoria.find((t) => t.id === tipoId);

  const setFestivos = useMemo(
    () => new Set((festivos ?? []).map((f) => f.holiday_date)),
    [festivos],
  );
  const periodo = useMemo(
    () => calcularPeriodo(fecha, Math.max(1, dias), setFestivos),
    [fecha, dias, setFestivos],
  );

  const maxDescontables = Number(leerAjuste<number>(ajustes, "max_permission_days_deducted"));
  const horas = useMemo(() => {
    const [h1, m1] = horaInicio.split(":").map(Number);
    const [h2, m2] = horaFin.split(":").map(Number);
    const total = (h2! * 60 + m2!) - (h1! * 60 + m1!);
    return total > 0 ? Math.round((total / 60) * 100) / 100 : 0;
  }, [horaInicio, horaFin]);

  const avisos: string[] = [];
  if (modalidad === "dias_completos" && tipo?.max_days && dias > tipo.max_days)
    avisos.push(
      `El tipo seleccionado permite máximo ${tipo.max_days} día(s). Más días deben tramitarse como vacaciones.`,
    );
  if (modalidad === "dias_completos" && tipo?.deducts_vacation && dias > maxDescontables)
    avisos.push(
      `La política de la empresa descuenta de vacaciones hasta ${maxDescontables} día(s) de permiso.`,
    );
  if (tipo?.requires_document && !archivo)
    avisos.push("Este tipo de permiso requiere adjuntar un comprobante.");
  if (modalidad !== "dias_completos" && horas <= 0)
    avisos.push("El rango de horas no es válido.");

  const enviar = async () => {
    if (!empleado || !tipo || !motivo.trim() || avisos.length) return;
    setEnviando(true);

    let ruta: string | null = null;
    if (archivo) {
      const nombre = `${user?.id}/${Date.now()}-${archivo.name.replace(/[^\w.-]/g, "_")}`;
      const { error: errUp } = await supabase.storage.from("documentos").upload(nombre, archivo);
      if (errUp) {
        setEnviando(false);
        toast.error("No se pudo subir el documento", { description: errUp.message });
        return;
      }
      ruta = nombre;
    }

    const porDias = modalidad === "dias_completos";
    const { data: creada, error } = await supabase
      .from("requests")
      .insert({
        employee_id: empleado.id,
        category_id: categoriaId || null,
        type_id: tipo.id,
        cycle_id: tipo.deducts_vacation ? (ciclo?.id ?? null) : null,
        mode: modalidad,
        start_date: fecha,
        end_date: porDias ? periodo.fin : fecha,
        start_time: porDias ? null : horaInicio,
        end_time: porDias ? null : horaFin,
        days_count: porDias ? dias : 0,
        hours_count: porDias ? 0 : horas,
        reason: motivo.trim(),
        document_path: ruta,
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
      titulo: "Nueva solicitud de permiso",
      mensaje: `${empleado.full_name} solicitó un permiso (${tipo.name}) para el ${fechaLarga(fecha)}.`,
      requestId: creada?.id as string,
    });
    await registrarAuditoria({
      actorUserId: user?.id ?? null,
      accion: "crear_solicitud_permiso",
      entidad: "requests",
      entidadId: creada?.id as string,
      despues: creada,
    });

    toast.success("Solicitud enviada");
    navigate({ to: "/mis-solicitudes" });
  };

  if (isLoading) return <Cargando />;
  if (!empleado)
    return (
      <VacioEstado
        titulo="Sin expediente de empleado"
        descripcion="Tu administrador debe darte de alta para poder solicitar permisos."
      />
    );

  return (
    <>
      <PageHeader
        titulo="Solicitar permiso"
        descripcion="Selecciona la categoría, el tipo y la modalidad de tu permiso."
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="surface-card space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select
                value={categoriaId}
                onValueChange={(v) => {
                  setCategoriaId(v);
                  setTipoId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {(categorias ?? [])
                    .filter((c) => c.is_active)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipoId} onValueChange={setTipoId} disabled={!categoriaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposCategoria.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Modalidad</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {MODALIDADES.map((m) => {
                const permitido =
                  !tipo ||
                  (m.valor === "dias_completos" ? tipo.allows_days : tipo.allows_hours);
                return (
                  <button
                    key={m.valor}
                    type="button"
                    disabled={!permitido}
                    onClick={() => setModalidad(m.valor)}
                    className={`rounded-lg border p-2.5 text-sm font-medium transition-colors ${
                      modalidad === m.valor
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-accent disabled:opacity-40"
                    }`}
                  >
                    {m.etiqueta}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            {modalidad === "dias_completos" ? (
              <div className="space-y-1.5">
                <Label htmlFor="dias">Días</Label>
                <Input
                  id="dias"
                  type="number"
                  min={1}
                  max={tipo?.max_days ?? 30}
                  value={dias}
                  onChange={(e) => setDias(Number(e.target.value))}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="hi">
                    {modalidad === "entrada_tardia" ? "Hora prevista" : "Hora inicial"}
                  </Label>
                  <Input
                    id="hi"
                    type="time"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hf">
                    {modalidad === "entrada_tardia" ? "Hora autorizada" : "Hora final"}
                  </Label>
                  <Input
                    id="hf"
                    type="time"
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="motivo">Motivo (obligatorio)</Label>
            <Textarea
              id="motivo"
              rows={3}
              required
              value={motivo}
              placeholder="Describe el motivo de tu permiso"
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc">
              Documento {tipo?.requires_document ? "(obligatorio)" : "(opcional)"}
            </Label>
            <label
              htmlFor="doc"
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground hover:bg-accent"
            >
              <Paperclip className="size-4" />
              {archivo ? archivo.name : "Adjuntar fotografía o PDF"}
            </label>
            <input
              id="doc"
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              Los comprobantes son privados: solo los administradores pueden verlos.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface-card p-5">
            <p className="mb-3 text-sm font-semibold">Resumen</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tipo</dt>
                <dd className="font-medium">{tipo?.name ?? "Sin seleccionar"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Fecha</dt>
                <dd className="font-medium">{fechaLarga(fecha)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Duración</dt>
                <dd className="font-medium">
                  {modalidad === "dias_completos" ? `${dias} día(s)` : `${horas} hora(s)`}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Descuenta vacaciones</dt>
                <dd className="font-medium">{tipo?.deducts_vacation ? "Sí" : "No"}</dd>
              </div>
            </dl>
          </div>

          {avisos.map((a, i) => (
            <div
              key={i}
              className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <p>{a}</p>
            </div>
          ))}

          <Button
            className="w-full"
            size="lg"
            disabled={enviando || !tipo || !motivo.trim() || avisos.length > 0}
            onClick={enviar}
          >
            {enviando && <Loader2 className="mr-2 size-4 animate-spin" />}
            Enviar solicitud
          </Button>
        </div>
      </div>
    </>
  );
}
