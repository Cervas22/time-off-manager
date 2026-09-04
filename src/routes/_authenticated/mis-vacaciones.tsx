import { createFileRoute, Link } from "@tanstack/react-router";
import { Palmtree } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Cargando, VacioEstado } from "@/components/estados";
import { useMiEmpleado } from "@/hooks/useAuth";
import { useCicloVigente, useMisSolicitudes, useReglasAntiguedad } from "@/lib/datos";
import { diasPorAntiguedad } from "@/lib/reglas";
import { antiguedadAnios, fechaLarga } from "@/lib/tz";

export const Route = createFileRoute("/_authenticated/mis-vacaciones")({
  head: () => ({
    meta: [
      { title: "Mis vacaciones | Control de Vacaciones y Permisos" },
      {
        name: "description",
        content: "Consulta tu ciclo vigente, días asignados, tomados y disponibles.",
      },
      { property: "og:title", content: "Mis vacaciones" },
      { property: "og:description", content: "Ciclo vigente y saldo de días de vacaciones." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MisVacaciones,
});

function MisVacaciones() {
  const { data: empleado, isLoading } = useMiEmpleado();
  const { data: ciclo, isLoading: cargandoCiclo } = useCicloVigente(empleado?.id);
  const { data: reglas } = useReglasAntiguedad();
  const { data: solicitudes } = useMisSolicitudes(empleado?.id);

  if (isLoading || cargandoCiclo) return <Cargando />;

  if (!empleado)
    return (
      <VacioEstado
        titulo="Sin expediente de empleado"
        descripcion="Tu administrador debe darte de alta como empleado con este correo."
      />
    );

  const anios = antiguedadAnios(empleado.hire_date);
  const diasLey = diasPorAntiguedad(reglas ?? [], anios);
  const asignados = Number(ciclo?.assigned_days ?? 0);
  const tomados = Number(ciclo?.taken_days ?? 0);
  const vencidos = Number(ciclo?.expired_days ?? 0);
  const disponibles = Math.max(0, asignados - tomados - vencidos);

  const periodos = (solicitudes ?? []).filter(
    (s) => s.status === "aprobada" || s.status === "modificada_aprobada",
  );

  return (
    <>
      <PageHeader
        titulo="Mis vacaciones"
        descripcion={`Antigüedad: ${anios} año(s) · Tabla vigente: ${diasLey} días por año de servicio`}
        accion={
          <Button asChild>
            <Link to="/solicitar-vacaciones">
              <Palmtree className="mr-2 size-4" /> Solicitar vacaciones
            </Link>
          </Button>
        }
      />

      {!ciclo ? (
        <VacioEstado
          titulo="Aún no tienes un ciclo vigente"
          descripcion="El ciclo se genera al cumplir el aniversario de tu fecha de ingreso. Consulta con tu administrador si crees que ya te corresponde."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { t: "Asignados", v: asignados },
              { t: "Tomados", v: tomados },
              { t: "Disponibles", v: disponibles },
              { t: "Vencidos", v: vencidos },
            ].map((m) => (
              <div key={m.t} className="surface-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{m.t}</p>
                <p className="text-3xl font-bold">{m.v}</p>
              </div>
            ))}
          </div>

          <div className="surface-card mt-4 p-4">
            <p className="text-sm font-semibold">Ciclo vigente</p>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Inicio</dt>
                <dd className="font-medium">{fechaLarga(ciclo.cycle_start)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Fin</dt>
                <dd className="font-medium">{fechaLarga(ciclo.cycle_end)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Aniversario</dt>
                <dd className="font-medium">{fechaLarga(ciclo.anniversary_date)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Acumula vencidos</dt>
                <dd className="font-medium">{ciclo.accrue_expired ? "Sí" : "No"}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              Los días asignados provienen de la tabla de antigüedad configurable, cuya
              configuración inicial refleja la LFT vigente. Tu administrador puede actualizarla.
            </p>
          </div>
        </>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold">Periodos aprobados</h2>
      {periodos.length === 0 ? (
        <VacioEstado titulo="Sin periodos aprobados" />
      ) : (
        <div className="surface-card divide-y divide-border">
          {periodos.map((p) => (
            <div key={p.id} className="flex flex-wrap justify-between gap-2 p-4 text-sm">
              <span className="font-medium">
                {fechaLarga(p.start_date)} — {fechaLarga(p.end_date)}
              </span>
              <span className="text-muted-foreground">
                {Number(p.days_count)} día(s) · Pago:{" "}
                {p.payment_date ? fechaLarga(p.payment_date) : "por definir"}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
