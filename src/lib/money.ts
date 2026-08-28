// Toda la plata se guarda como centavos enteros. Estas son las unicas funciones
// que deberian traducir entre centavos y lo que ve o escribe el usuario.

const formatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 125050 -> "$ 1.251" (redondeado, para mostrar en tarjetas y graficos) */
export function formatMoney(cents: number): string {
  return formatter.format(Math.round(cents / 100));
}

/** 125050 -> "1250.50" (para precargar un input) */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** "1.250,50" | "1250.50" -> 125050. Devuelve null si no es un numero valido. */
export function inputToCents(value: string): number | null {
  const normalized = value
    .trim()
    .replace(/\s/g, "")
    .replace(/[$]/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");

  if (normalized === "") return null;

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;

  return Math.round(amount * 100);
}

/** Variacion porcentual entre dos montos. null si no hay base con que comparar. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
