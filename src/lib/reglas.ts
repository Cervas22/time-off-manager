import { agregarDias, antiguedadAnios, diaSemanaLunes, esLunes, hoyISO, rangoFechas } from "./tz";

export type ReglaAntiguedad = {
  id: string;
  year_from: number;
  year_to: number | null;
  days: number;
  is_active: boolean;
};

export type Ajustes = Record<string, unknown>;

export const AJUSTES_DEFAULT = {
  vacation_start_monday: true,
  min_continuous_days: 12,
  accrue_expired_days_default: false,
  payment_day_friday: true,
  payment_day_rule_enabled: true,
  max_permission_days_deducted: 3,
  grace_months_art81: 6,
};

export function leerAjuste<T>(ajustes: Ajustes | undefined, key: keyof typeof AJUSTES_DEFAULT): T {
  const v = ajustes?.[key];
  return (v === undefined ? AJUSTES_DEFAULT[key] : v) as T;
}

/** Días de vacaciones correspondientes según la tabla configurable de antigüedad */
export function diasPorAntiguedad(reglas: ReglaAntiguedad[], anios: number): number {
  const activas = reglas.filter((r) => r.is_active);
  const match = activas.find(
    (r) => anios >= r.year_from && (r.year_to === null || anios <= r.year_to),
  );
  if (match) return match.days;
  const mayor = activas.reduce<ReglaAntiguedad | null>(
    (acc, r) => (acc === null || r.year_from > acc.year_from ? r : acc),
    null,
  );
  return anios >= 1 && mayor ? mayor.days : 0;
}

export function esDiaLaborable(
  iso: string,
  festivos: Set<string>,
  diasLaborables: Set<number> = new Set([0, 1, 2, 3, 4]),
): boolean {
  if (festivos.has(iso)) return false;
  return diasLaborables.has(diaSemanaLunes(iso));
}

/**
 * Calcula la fecha final a partir de una fecha inicial y una cantidad de días laborables.
 * Devuelve también las fechas que abarca el periodo.
 */
export function calcularPeriodo(
  inicio: string,
  diasLaborables: number,
  festivos: Set<string>,
  laborables: Set<number> = new Set([0, 1, 2, 3, 4]),
): { fin: string; fechas: string[] } {
  const fechas: string[] = [];
  let cur = inicio;
  let restantes = diasLaborables;
  let guard = 0;
  let ultimoLaborable = inicio;
  while (restantes > 0 && guard < 400) {
    if (esDiaLaborable(cur, festivos, laborables)) {
      fechas.push(cur);
      ultimoLaborable = cur;
      restantes--;
    }
    if (restantes > 0) cur = agregarDias(cur, 1);
    guard++;
  }
  return { fin: ultimoLaborable, fechas };
}

export function contarDiasLaborables(
  inicio: string,
  fin: string,
  festivos: Set<string>,
  laborables: Set<number> = new Set([0, 1, 2, 3, 4]),
): number {
  return rangoFechas(inicio, fin).filter((f) => esDiaLaborable(f, festivos, laborables)).length;
}

export type Validacion = { nivel: "error" | "advertencia"; mensaje: string };

export function validarSolicitudVacaciones(params: {
  inicio: string;
  dias: number;
  diasDisponibles: number;
  iniciaLunesObligatorio: boolean;
  minimoContinuo: number;
  fechaPago: string | null;
  reglaPagoViernes: boolean;
  fechasPagoOcupadas: string[];
  capacidadDisponible: number | null;
  ocupantes: string[];
}): Validacion[] {
  const v: Validacion[] = [];
  if (params.dias <= 0) v.push({ nivel: "error", mensaje: "Selecciona al menos un día." });
  if (params.inicio <= hoyISO())
    v.push({ nivel: "advertencia", mensaje: "La fecha de inicio no es posterior a hoy." });
  if (params.iniciaLunesObligatorio && !esLunes(params.inicio))
    v.push({
      nivel: "error",
      mensaje: "Política interna de la empresa: el periodo debe iniciar en lunes.",
    });
  if (params.dias > params.diasDisponibles)
    v.push({
      nivel: "error",
      mensaje: `Solo tienes ${params.diasDisponibles} días disponibles en tu ciclo vigente.`,
    });
  if (params.dias < params.minimoContinuo)
    v.push({
      nivel: "advertencia",
      mensaje: `El mínimo continuo configurado es de ${params.minimoContinuo} días (configuración basada en el art. 78 de la LFT vigente). Requiere excepción autorizada por un administrador.`,
    });
  if (params.fechaPago) {
    if (params.reglaPagoViernes && diaSemanaLunes(params.fechaPago) !== 4)
      v.push({
        nivel: "error",
        mensaje: "La configuración actual exige que la fecha de pago sea viernes.",
      });
    if (params.fechasPagoOcupadas.includes(params.fechaPago))
      v.push({
        nivel: "error",
        mensaje: "Esa fecha de pago ya está programada/autorizada. Selecciona otra fecha.",
      });
  }
  if (params.capacidadDisponible !== null && params.capacidadDisponible <= 0)
    v.push({
      nivel: "error",
      mensaje: `El límite de ausencias simultáneas de tu área ya está alcanzado${
        params.ocupantes.length ? `: ${params.ocupantes.join(", ")}` : ""
      }.`,
    });
  return v;
}

export function calcularAntiguedad(fechaIngreso: string): number {
  return antiguedadAnios(fechaIngreso);
}
