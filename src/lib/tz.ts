/**
 * Utilidades de fecha/hora en la zona horaria de Matamoros, México.
 * Toda la aplicación opera con esta zona horaria.
 */
export const TIMEZONE = "America/Matamoros";

const DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const DATETIME_FMT = new Intl.DateTimeFormat("es-MX", {
  timeZone: TIMEZONE,
  dateStyle: "medium",
  timeStyle: "short",
});

/** Fecha de hoy en Matamoros, formato YYYY-MM-DD */
export function hoyISO(): string {
  return DATE_FMT.format(new Date());
}

/** Convierte un timestamp a texto legible en la zona de Matamoros */
export function fechaHoraLarga(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return DATETIME_FMT.format(new Date(value));
}

/** Parsea YYYY-MM-DD como fecha local (sin desfase de zona) */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

/** Formatea un Date local a YYYY-MM-DD */
export function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export const NOMBRES_MES = MESES;
export const DIAS_SEMANA_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** "12 de marzo de 2026" */
export function fechaLarga(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

/** "12/mar/2026" */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${MESES[d.getMonth()]!.slice(0, 3)}/${d.getFullYear()}`;
}

export function agregarDias(iso: string, dias: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + dias);
  return toISO(d);
}

/** 0 = lunes ... 6 = domingo */
export function diaSemanaLunes(iso: string): number {
  return (parseISO(iso).getDay() + 6) % 7;
}

export function esLunes(iso: string): boolean {
  return diaSemanaLunes(iso) === 0;
}

export function esViernes(iso: string): boolean {
  return diaSemanaLunes(iso) === 4;
}

export function rangoFechas(desde: string, hasta: string): string[] {
  const out: string[] = [];
  let cur = desde;
  let guard = 0;
  while (cur <= hasta && guard < 800) {
    out.push(cur);
    cur = agregarDias(cur, 1);
    guard++;
  }
  return out;
}

/** Años de antigüedad cumplidos a la fecha indicada */
export function antiguedadAnios(fechaIngreso: string, referencia = hoyISO()): number {
  const ing = parseISO(fechaIngreso);
  const ref = parseISO(referencia);
  let anios = ref.getFullYear() - ing.getFullYear();
  const cumpleEsteAnio = new Date(ref.getFullYear(), ing.getMonth(), ing.getDate());
  if (ref < cumpleEsteAnio) anios--;
  return Math.max(0, anios);
}
