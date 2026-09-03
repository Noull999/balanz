// Progreso de una meta de ahorro: 100% matematica pura, sin IA ni escritura a
// la base. Balanz no tiene una "billetera" separada para el ahorro (no hay
// cuenta a la que se transfiera plata) - lo que se guarda ya esta ahi, en las
// transacciones. Asi que "cuanto llevas ahorrado hacia esta meta" se
// reconstruye sumando el balance real (ingresos - gastos) de cada mes desde
// que se creo la meta hasta hoy, usando resumenMensual (insights.ts), la
// misma funcion que ya calcula el balance del dashboard.
//
// Limitacion a proposito: si el usuario tiene varias metas activas, cada una
// se calcula contra el MISMO balance acumulado (no se reparte entre metas),
// porque no existe un concepto de "plata ya asignada a la meta A" en el
// esquema. Es informativo por meta, no una suma que cierra entre todas.

import { addUtcMonths, daysBetween, startOfUtcMonth } from "@/lib/date";
import { resumenMensual, type TransaccionInsight } from "@/lib/insights";

export type MetaAhorro = {
  id: string;
  name: string;
  targetCents: number;
  targetDate: Date | null;
  createdAt: Date;
};

export type ProgresoMeta = {
  ahorradoCents: number;
  ritmoMensualCents: number;
  /** null si el ritmo actual es 0 o negativo: a ese paso nunca se llega. */
  mesesRestantesEstimados: number | null;
  /** null si la meta no tiene fecha objetivo, no hay con que comparar. */
  vaATiempo: boolean | null;
};

export function calcularProgresoMeta(
  meta: MetaAhorro,
  transacciones: TransaccionInsight[],
  hoy: Date,
): ProgresoMeta {
  const desde = startOfUtcMonth(meta.createdAt);
  const mesesTranscurridos = Math.max(1, Math.round(daysBetween(desde, startOfUtcMonth(hoy)) / 30) + 1);

  let ahorradoCents = 0;
  for (let i = 0; i < mesesTranscurridos; i++) {
    const mes = addUtcMonths(desde, i);
    ahorradoCents += resumenMensual(transacciones, mes).balanceCents;
  }

  const ritmoMensualCents = ahorradoCents / mesesTranscurridos;
  const faltanteCents = meta.targetCents - ahorradoCents;

  const mesesRestantesEstimados =
    ritmoMensualCents > 0 && faltanteCents > 0 ? Math.ceil(faltanteCents / ritmoMensualCents) : faltanteCents <= 0 ? 0 : null;

  let vaATiempo: boolean | null = null;
  if (meta.targetDate && mesesRestantesEstimados !== null) {
    const fechaProyectada = addUtcMonths(startOfUtcMonth(hoy), mesesRestantesEstimados);
    vaATiempo = fechaProyectada <= startOfUtcMonth(meta.targetDate);
  }

  return { ahorradoCents, ritmoMensualCents, mesesRestantesEstimados, vaATiempo };
}
