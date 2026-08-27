// Las fechas de las transacciones representan un dia calendario, no un instante.
// Se guardan a medianoche UTC y se leen siempre con getters UTC para que la fecha
// no se corra un dia segun la zona horaria de quien mira la pantalla.

/** Una fecha (o "2026-08-27") -> medianoche UTC de ese dia. */
export function toUtcDay(value: Date | string): Date {
  if (typeof value === "string") {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

/** Medianoche UTC del primer dia del mes de `date`. */
export function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** Medianoche UTC del primer dia del mes siguiente (limite superior exclusivo). */
export function startOfNextUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

/** Corre `months` meses desde `date` (negativo para ir hacia atras). */
export function addUtcMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()),
  );
}

/** Dias enteros entre dos fechas. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Date -> "2026-08-27" (para inputs type="date"). */
export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "agosto 2026" */
export function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** "27 ago" */
export function formatDay(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

/** true si cae sabado o domingo (usado por la regla de fin de semana). */
export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}
