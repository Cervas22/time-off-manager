import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  Clock,
  Palmtree,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Cargando } from "@/components/estados";
import { useMiEmpleado, useRolPrincipal } from "@/hooks/useAuth";
import {
  useAreas,
  useCicloVigente,
  useEmpleados,
  useMisSolicitudes,
  useSolicitudesPendientes,
  useAusencias,
} from "@/lib/datos";
import { PageHeader } from "@/components/AppLayout";
import { agregarDias, fechaLarga, hoyISO } from "@/lib/tz";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Inicio | Control de Vacaciones y Permisos" },
      {
        name: "description",
        content: "Resumen de tus días disponibles, ciclo vigente y solicitudes pendientes.",
      },
      { property: "og:title", content: "Panel de vacaciones y permisos" },
      { property: "og:description", content: "Días disponibles, ciclo vigente y solicitudes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Panel,
});

function Metrica({
  icono: Icono,
  etiqueta,
  valor,
  detalle,
  tono = "normal",
}: {
  icono: typeof Palmtree;
  etiqueta: string;
  valor: string | number;
  detalle?: string;
  tono?: "normal" | "alerta" | "exito";
}) {
  const color =
    tono === "alerta"
      ? "bg-destructive-soft text-destructive"
      : tono === "exito"
        ? "bg-success-soft text-success"
        : "bg-primary-soft text-primary";
  return (
    <div className="surface-card p-4">
      <div className="flex items-center gap-3">
        <span className={`grid size-10 place-items-center rounded-lg ${color}`}>
          <Icono className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {etiqueta}
          </p>
          <p className="text-2xl font-bold leading-tight">{valor}</p>
        </div>
      </div>
      {detalle && <p className="mt-3 text-xs text-muted-foreground">{detalle}</p>}
    </div>
  );
}

function Panel() {
  const { data: empleado, isLoading } = useMiEmpleado();
  const { esAdmin, esJefe } = useRolPrincipal();
  const { data: ciclo } = useCicloVigente(empleado?.id);
  const { data: solicitudes } = useMisSolicitudes(empleado?.id);

  if (isLoading) return <Cargando />;

  const asignados = Number(ciclo?.assigned_days ?? 0);
  const tomados = Number(ciclo?.taken_days ?? 0);
  const vencidos = Number(ciclo?.expired_days ?? 0);
  const disponibles = Math.max(0, asignados - tomados - vencidos);
  const pendientes = (solicitudes ?? []).filter((s) => s.status === "pendiente");
  const proximas = (solicitudes ?? [])
    .filter((s) => s.status === "aprobada" && s.start_date >= hoyISO())
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];

  return (
    <>
      <PageHeader
        titulo={`Hola, ${empleado?.full_name?.split(" ")[0] ?? "bienvenido"}`}
        descripcion={
          empleado
            ? `${empleado.position ?? "Empleado"} · Ingreso ${fechaLarga(empleado.hire_date)}`
            : "Tu administrador aún no ha vinculado tu expediente de empleado."
        }
      />

      {!empleado && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>
            Tu cuenta aún no está vinculada a un expediente de empleado. Un administrador debe darte
            de alta con este mismo correo para que puedas solicitar vacaciones o permisos.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica
          icono={Palmtree}
          etiqueta="Días disponibles"
          valor={disponibles}
          detalle={ciclo ? `Ciclo vigente ${fechaLarga(ciclo.cycle_start)}` : "Sin ciclo vigente"}
          tono="exito"
        />
        <Metrica icono={TrendingUp} etiqueta="Días asignados" valor={asignados} />
        <Metrica icono={Clock} etiqueta="Días tomados" valor={tomados} />
        <Metrica
          icono={AlertTriangle}
          etiqueta="Días vencidos"
          valor={vencidos}
          tono={vencidos > 0 ? "alerta" : "normal"}
          detalle={
            empleado?.accrue_expired_days
              ? "Política individual: sí acumula días vencidos"
              : "Política individual: no acumula días vencidos"
          }
        />
      </div>

      {ciclo && (
        <div className="surface-card mt-4 p-4">
          <p className="text-sm font-semibold">Ciclo vigente</p>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Inicio</p>
              <p className="font-medium">{fechaLarga(ciclo.cycle_start)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fin</p>
              <p className="font-medium">{fechaLarga(ciclo.cycle_end)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Aniversario</p>
              <p className="font-medium">{fechaLarga(ciclo.anniversary_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Antigüedad</p>
              <p className="font-medium">{ciclo.seniority_years} año(s)</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${asignados ? Math.min(100, (tomados / asignados) * 100) : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Button asChild size="lg" className="h-14 justify-start">
          <Link to="/solicitar-vacaciones">
            <Palmtree className="mr-2 size-5" /> Solicitar vacaciones
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary" className="h-14 justify-start">
          <Link to="/solicitar-permiso">
            <Clock className="mr-2 size-5" /> Solicitar permiso
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-14 justify-start">
          <Link to="/calendario">
            <CalendarDays className="mr-2 size-5" /> Ver calendario
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-14 justify-start">
          <Link to="/mis-solicitudes">
            <ClipboardList className="mr-2 size-5" /> Mis solicitudes
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-4">
          <p className="mb-3 text-sm font-semibold">Solicitudes pendientes</p>
          {pendientes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tienes solicitudes en revisión.</p>
          ) : (
            <ul className="space-y-2">
              {pendientes.slice(0, 5).map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm"
                >
                  <span>
                    {fechaLarga(s.start_date)}
                    {s.end_date !== s.start_date ? ` — ${fechaLarga(s.end_date)}` : ""}
                  </span>
                  <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground">
                    Pendiente
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="surface-card p-4">
          <p className="mb-3 text-sm font-semibold">Próximas vacaciones aprobadas</p>
          {proximas ? (
            <div className="rounded-lg bg-primary-soft p-3 text-sm">
              <p className="font-semibold text-primary">
                {fechaLarga(proximas.start_date)} — {fechaLarga(proximas.end_date)}
              </p>
              <p className="mt-1 text-muted-foreground">
                {Number(proximas.days_count)} día(s) · Pago programado{" "}
                {proximas.payment_date ? fechaLarga(proximas.payment_date) : "por definir"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin periodos aprobados próximos.</p>
          )}
        </div>
      </div>

      {(esAdmin || esJefe) && <ResumenGestion esAdmin={esAdmin} />}
    </>
  );
}

function ResumenGestion({ esAdmin }: { esAdmin: boolean }) {
  const { data: pendientes } = useSolicitudesPendientes();
  const { data: empleados } = useEmpleados();
  const { data: areas } = useAreas();
  const hoy = hoyISO();
  const { data: ausencias } = useAusencias(hoy, agregarDias(hoy, 30));

  const ausentesHoy = (ausencias ?? []).filter((a) => a.start_date <= hoy && a.end_date >= hoy);
  const nombres = new Map((empleados ?? []).map((e) => [e.id, e]));

  const areasAltaAusencia = (areas ?? [])
    .map((area) => {
      const conteo = ausentesHoy.filter(
        (a) => nombres.get(a.employee_id)?.area_id === area.id,
      ).length;
      return { area, conteo };
    })
    .filter((x) => x.conteo > 0)
    .sort((a, b) => b.conteo - a.conteo);

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">
        {esAdmin ? "Resumen administrativo" : "Resumen de mi área"}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica
          icono={ClipboardList}
          etiqueta="Solicitudes pendientes"
          valor={pendientes?.length ?? 0}
          tono={(pendientes?.length ?? 0) > 0 ? "alerta" : "normal"}
        />
        <Metrica icono={Users} etiqueta="Ausentes hoy" valor={ausentesHoy.length} />
        <Metrica icono={Users} etiqueta="Personal registrado" valor={empleados?.length ?? 0} />
        <Metrica
          icono={Wallet}
          etiqueta="Ausencias próximas 30 días"
          valor={ausencias?.length ?? 0}
        />
      </div>

      {areasAltaAusencia.length > 0 && (
        <div className="surface-card mt-4 p-4">
          <p className="mb-3 text-sm font-semibold">Áreas con ausencias hoy</p>
          <ul className="space-y-2 text-sm">
            {areasAltaAusencia.map(({ area, conteo }) => {
              const excedido = conteo >= area.max_simultaneous_absences;
              return (
                <li
                  key={area.id}
                  className="flex items-center justify-between rounded-lg border border-border p-2.5"
                >
                  <span className="font-medium">{area.name}</span>
                  <span
                    className={
                      excedido
                        ? "rounded-full bg-destructive-soft px-2 py-0.5 text-xs font-semibold text-destructive"
                        : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
                    }
                  >
                    {conteo} / {area.max_simultaneous_absences} ausentes
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {esAdmin && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/admin/solicitudes">Revisar solicitudes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/empleados">Administrar empleados</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
