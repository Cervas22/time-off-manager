import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/AppLayout";
import { CalendarioMensual, type EventoCalendario } from "@/components/Calendario";
import { Cargando } from "@/components/estados";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRolPrincipal } from "@/hooks/useAuth";
import { useAreas, useAusencias, useCategorias, useEmpleados, useFestivos } from "@/lib/datos";
import { agregarDias, hoyISO } from "@/lib/tz";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({
    meta: [
      { title: "Calendario de ausencias | Control de Vacaciones y Permisos" },
      {
        name: "description",
        content: "Vista mensual y anual de vacaciones, permisos y días festivos por área.",
      },
      { property: "og:title", content: "Calendario de ausencias" },
      { property: "og:description", content: "Disponibilidad del personal por día y por área." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarioPagina,
});

function CalendarioPagina() {
  const hoy = hoyISO();
  const { esAdmin, esJefe } = useRolPrincipal();
  const { data: ausencias, isLoading } = useAusencias(agregarDias(hoy, -400), agregarDias(hoy, 400));
  const { data: empleados } = useEmpleados();
  const { data: areas } = useAreas();
  const { data: categorias } = useCategorias();
  const { data: festivos } = useFestivos();

  const [areaFiltro, setAreaFiltro] = useState("todas");
  const [catFiltro, setCatFiltro] = useState("todas");

  const mapaFestivos = useMemo(
    () => new Map((festivos ?? []).map((f) => [f.holiday_date, f.name])),
    [festivos],
  );

  const eventos: EventoCalendario[] = useMemo(() => {
    const emp = new Map((empleados ?? []).map((e) => [e.id, e]));
    const ar = new Map((areas ?? []).map((a) => [a.id, a]));
    const cat = new Map((categorias ?? []).map((c) => [c.id, c]));
    return (ausencias ?? [])
      .filter((a) => {
        const e = emp.get(a.employee_id);
        if (areaFiltro !== "todas" && e?.area_id !== areaFiltro) return false;
        if (catFiltro !== "todas" && a.category_id !== catFiltro) return false;
        return true;
      })
      .map((a) => {
        const e = emp.get(a.employee_id);
        const c = a.category_id ? cat.get(a.category_id) : undefined;
        return {
          id: a.id,
          employee_id: a.employee_id,
          nombre: e?.full_name ?? "Personal",
          area: e?.area_id ? (ar.get(e.area_id)?.name ?? null) : null,
          categoria: c?.name ?? a.label ?? "Ausencia",
          color: c?.color ?? "#1e3a8a",
          start_date: a.start_date,
          end_date: a.end_date,
          detalle: a.start_time ? `${a.start_time.slice(0, 5)}–${a.end_time?.slice(0, 5)}` : null,
        };
      });
  }, [ausencias, empleados, areas, categorias, areaFiltro, catFiltro]);

  if (isLoading) return <Cargando />;

  return (
    <>
      <PageHeader
        titulo="Calendario"
        descripcion={
          esAdmin || esJefe
            ? "Ausencias del personal, festivos y disponibilidad por área."
            : "Tus periodos aprobados y los días festivos oficiales."
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
        <Select value={areaFiltro} onValueChange={setAreaFiltro}>
          <SelectTrigger aria-label="Filtrar por área">
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las áreas</SelectItem>
            {(areas ?? []).map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={catFiltro} onValueChange={setCatFiltro}>
          <SelectTrigger aria-label="Filtrar por categoría">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {(categorias ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CalendarioMensual eventos={eventos} festivos={mapaFestivos} />
    </>
  );
}
