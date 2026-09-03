import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NOMBRES_MES, hoyISO, parseISO, toISO } from "@/lib/tz";
import { cn } from "@/lib/utils";

export type EventoCalendario = {
  id: string;
  employee_id: string;
  nombre: string;
  area: string | null;
  categoria: string;
  color: string;
  start_date: string;
  end_date: string;
  detalle?: string | null;
};

const DIAS = ["L", "M", "M", "J", "V", "S", "D"];

function celdasDelMes(anio: number, mes: number) {
  const primero = new Date(anio, mes, 1);
  const offset = (primero.getDay() + 6) % 7;
  const dias = new Date(anio, mes + 1, 0).getDate();
  const celdas: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= dias; d++) celdas.push(toISO(new Date(anio, mes, d)));
  while (celdas.length % 7 !== 0) celdas.push(null);
  return celdas;
}

export function CalendarioMensual({
  eventos,
  festivos,
  cargando,
}: {
  eventos: EventoCalendario[];
  festivos: Map<string, string>;
  cargando?: boolean;
}) {
  const hoy = hoyISO();
  const [cursor, setCursor] = useState(() => {
    const d = parseISO(hoy);
    return { anio: d.getFullYear(), mes: d.getMonth() };
  });
  const [vista, setVista] = useState<"mensual" | "anual">("mensual");

  const celdas = useMemo(() => celdasDelMes(cursor.anio, cursor.mes), [cursor]);

  const porDia = useMemo(() => {
    const map = new Map<string, EventoCalendario[]>();
    for (const e of eventos) {
      let cur = e.start_date;
      let guard = 0;
      while (cur <= e.end_date && guard < 400) {
        const arr = map.get(cur) ?? [];
        arr.push(e);
        map.set(cur, arr);
        const d = parseISO(cur);
        d.setDate(d.getDate() + 1);
        cur = toISO(d);
        guard++;
      }
    }
    return map;
  }, [eventos]);

  const mover = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.anio, c.mes + delta, 1);
      return { anio: d.getFullYear(), mes: d.getMonth() };
    });
  };

  const irHoy = () => {
    const d = parseISO(hoy);
    setCursor({ anio: d.getFullYear(), mes: d.getMonth() });
  };

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => mover(-1)} aria-label="Mes anterior">
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-40 text-center text-base font-semibold capitalize">
            {vista === "mensual" ? `${NOMBRES_MES[cursor.mes]} ${cursor.anio}` : cursor.anio}
          </span>
          <Button variant="ghost" size="icon" onClick={() => mover(1)} aria-label="Mes siguiente">
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={irHoy} className="ml-2">
            <CalendarCheck2 className="mr-1 size-4" /> Hoy
          </Button>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(["mensual", "anual"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors",
                vista === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className="p-6 text-sm text-muted-foreground">Cargando calendario…</div>
      ) : vista === "mensual" ? (
        <div>
          <div className="grid grid-cols-7 border-b border-border bg-muted/50 text-center text-xs font-semibold uppercase text-muted-foreground">
            {DIAS.map((d, i) => (
              <div key={i} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {celdas.map((iso, i) => {
              const items = iso ? (porDia.get(iso) ?? []) : [];
              const festivo = iso ? festivos.get(iso) : undefined;
              const finde = i % 7 >= 5;
              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-24 border-b border-r border-border p-1.5 align-top",
                    !iso && "bg-muted/30",
                    finde && "bg-muted/20",
                    iso === hoy && "bg-primary-soft",
                  )}
                >
                  {iso && (
                    <>
                      <div className="mb-1 flex items-center justify-between">
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            iso === hoy ? "text-primary" : "text-muted-foreground",
                          )}
                        >
                          {parseISO(iso).getDate()}
                        </span>
                        {items.length > 0 && (
                          <span className="rounded bg-foreground/10 px-1 text-[10px] font-bold">
                            {items.length}
                          </span>
                        )}
                      </div>
                      {festivo && (
                        <p className="mb-1 truncate rounded bg-destructive-soft px-1 text-[10px] font-medium text-destructive">
                          {festivo}
                        </p>
                      )}
                      <div className="space-y-0.5">
                        {items.slice(0, 3).map((e) => (
                          <p
                            key={e.id + iso}
                            title={`${e.nombre} — ${e.categoria}`}
                            className="truncate rounded px-1 py-0.5 text-[10px] font-medium text-white"
                            style={{ backgroundColor: e.color }}
                          >
                            {e.nombre}
                          </p>
                        ))}
                        {items.length > 3 && (
                          <p className="px-1 text-[10px] text-muted-foreground">
                            +{items.length - 3} más
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }, (_, m) => {
            const celdasMes = celdasDelMes(cursor.anio, m);
            return (
              <div key={m} className="rounded-lg border border-border p-2">
                <p className="mb-1 text-sm font-semibold capitalize">{NOMBRES_MES[m]}</p>
                <div className="grid grid-cols-7 gap-0.5">
                  {celdasMes.map((iso, i) => {
                    const items = iso ? (porDia.get(iso) ?? []) : [];
                    return (
                      <div
                        key={i}
                        title={iso ?? ""}
                        className={cn(
                          "grid aspect-square place-items-center rounded text-[10px]",
                          !iso && "opacity-0",
                          items.length > 0
                            ? "font-bold text-white"
                            : "bg-muted/50 text-muted-foreground",
                        )}
                        style={items.length ? { backgroundColor: items[0]!.color } : undefined}
                      >
                        {iso ? parseISO(iso).getDate() : ""}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
