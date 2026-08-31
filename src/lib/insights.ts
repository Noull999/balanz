import { addUtcMonths, startOfNextUtcMonth, startOfUtcMonth } from "@/lib/date";

/**
 * Forma minima de transaccion que necesitan las funciones de este archivo y las
 * de recommendations.ts. Son funciones puras: no tocan la base, solo reciben
 * datos y devuelven numeros. Eso las hace faciles de probar y de explicar.
 */
export type TransaccionInsight = {
  id: string;
  amountCents: number;
  type: "INCOME" | "EXPENSE";
  description: string;
  date: Date;
  categoryId: string | null;
  category: { id: string; name: string; color: string } | null;
};

export type ResumenMensual = {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
};

function enRango(fecha: Date, desde: Date, hasta: Date): boolean {
  return fecha >= desde && fecha < hasta;
}

export function resumenMensual(
  transacciones: TransaccionInsight[],
  mes: Date,
): ResumenMensual {
  const desde = startOfUtcMonth(mes);
  const hasta = startOfNextUtcMonth(mes);

  let incomeCents = 0;
  let expenseCents = 0;

  for (const t of transacciones) {
    if (!enRango(t.date, desde, hasta)) continue;
    if (t.type === "INCOME") incomeCents += t.amountCents;
    else expenseCents += t.amountCents;
  }

  return { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents };
}

export type CategoriaGasto = {
  categoryId: string;
  name: string;
  color: string;
  amountCents: number;
};

/** Gasto del mes agrupado por categoria, de mayor a menor. Para el grafico de torta. */
export function gastoPorCategoria(
  transacciones: TransaccionInsight[],
  mes: Date,
): CategoriaGasto[] {
  const desde = startOfUtcMonth(mes);
  const hasta = startOfNextUtcMonth(mes);

  const acumulado = new Map<string, CategoriaGasto>();

  for (const t of transacciones) {
    if (t.type !== "EXPENSE" || !enRango(t.date, desde, hasta)) continue;

    const clave = t.category?.id ?? "sin-categoria";
    const existente = acumulado.get(clave);

    if (existente) {
      existente.amountCents += t.amountCents;
    } else {
      acumulado.set(clave, {
        categoryId: clave,
        name: t.category?.name ?? "Sin categoria",
        color: t.category?.color ?? "#64748b",
        amountCents: t.amountCents,
      });
    }
  }

  return [...acumulado.values()].sort((a, b) => b.amountCents - a.amountCents);
}

export type GastoDiario = { day: number; date: Date; amountCents: number };

/** Gasto de cada dia del mes (day 1..N), para el calendario de presupuesto diario. */
export function gastoPorDia(
  transacciones: TransaccionInsight[],
  mes: Date,
): GastoDiario[] {
  const desde = startOfUtcMonth(mes);
  const hasta = startOfNextUtcMonth(mes);
  const dias = Math.round((hasta.getTime() - desde.getTime()) / 86_400_000);

  const totales = new Array(dias).fill(0) as number[];
  for (const t of transacciones) {
    if (t.type !== "EXPENSE" || !enRango(t.date, desde, hasta)) continue;
    const indice = Math.round((t.date.getTime() - desde.getTime()) / 86_400_000);
    totales[indice] += t.amountCents;
  }

  return totales.map((amountCents, i) => ({
    day: i + 1,
    date: new Date(desde.getTime() + i * 86_400_000),
    amountCents,
  }));
}

/**
 * Promedio de gasto mensual por categoria en los ultimos `meses` (sin contar
 * el actual). Es el habito real que usa el plan de distribucion para repartir
 * cada balde proporcional a lo que la persona ya gasta, no parejo a ciegas.
 */
export function promedioGastoPorCategoria(
  transacciones: TransaccionInsight[],
  hoy: Date,
  meses = 3,
): Map<string, number> {
  const totales = new Map<string, number>();

  for (let i = 1; i <= meses; i++) {
    const mesAnterior = addUtcMonths(hoy, -i);
    for (const categoria of gastoPorCategoria(transacciones, mesAnterior)) {
      totales.set(categoria.categoryId, (totales.get(categoria.categoryId) ?? 0) + categoria.amountCents);
    }
  }

  const promedios = new Map<string, number>();
  for (const [categoryId, total] of totales) {
    promedios.set(categoryId, Math.round(total / meses));
  }
  return promedios;
}

export type PuntoMensual = {
  mes: string;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
};

/** Un punto por mes, de `meses` atras hasta el mes de `hoy` (incluido). Para el grafico de linea. */
export function serieMensual(
  transacciones: TransaccionInsight[],
  hoy: Date,
  meses: number,
): PuntoMensual[] {
  const formatter = new Intl.DateTimeFormat("es-CL", { month: "short", timeZone: "UTC" });
  const puntos: PuntoMensual[] = [];

  for (let i = meses - 1; i >= 0; i--) {
    const mes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1));
    const resumen = resumenMensual(transacciones, mes);

    puntos.push({
      mes: formatter.format(mes).replace(".", ""),
      ...resumen,
    });
  }

  return puntos;
}
