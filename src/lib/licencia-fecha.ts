export function hoyISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Matamoros" }).format(new Date());
}
