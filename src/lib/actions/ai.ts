"use server";

import { generarTexto, type ResultadoIA } from "@/lib/ai/gemini";
import { requireUser } from "@/lib/auth";
import { todayInput, toUtcDay } from "@/lib/date";
import { gastoPorCategoria, resumenMensual } from "@/lib/insights";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { generarRecomendaciones } from "@/lib/recommendations";

/**
 * Arma el prompt a partir de lo que YA calcularon las funciones puras de
 * insights.ts y recommendations.ts - la IA no ve movimientos sueltos, ve los
 * mismos numeros redondeados que se muestran en el dashboard. Asi no puede
 * inventar un monto que no este en la pantalla.
 */
export async function generarResumenMensual(): Promise<ResultadoIA> {
  const user = await requireUser();
  const hoy = toUtcDay(todayInput());
  const desde = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - 3, 1));

  const [transacciones, presupuestos] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: desde } },
      select: {
        id: true,
        amountCents: true,
        type: true,
        description: true,
        date: true,
        categoryId: true,
        category: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.budget.findMany({
      where: { userId: user.id },
      select: {
        categoryId: true,
        monthlyLimitCents: true,
        category: { select: { name: true } },
      },
    }),
  ]);

  const resumen = resumenMensual(transacciones, hoy);
  const categorias = gastoPorCategoria(transacciones, hoy).slice(0, 4);
  const recomendaciones = generarRecomendaciones(transacciones, presupuestos, hoy);

  if (resumen.incomeCents === 0 && resumen.expenseCents === 0) {
    return { ok: false, error: "Todavia no hay movimientos este mes para resumir." };
  }

  const lineas = [
    `Ingresos del mes: ${formatMoney(resumen.incomeCents)}.`,
    `Gastos del mes: ${formatMoney(resumen.expenseCents)}.`,
    `Balance: ${formatMoney(resumen.balanceCents)}.`,
    categorias.length > 0
      ? `Categorias con mas gasto: ${categorias.map((c) => `${c.name} (${formatMoney(c.amountCents)})`).join(", ")}.`
      : null,
    recomendaciones.length > 0
      ? `Alertas que ya detecto el sistema: ${recomendaciones.map((r) => r.mensaje).join(" ")}`
      : "No hay alertas activas este mes.",
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `Sos el asistente financiero de Balanz, una app de control de gastos personales en Argentina.
Con estos datos reales del mes (ya calculados, no inventes otros numeros ni otras categorias):

${lineas}

Escribi un resumen corto (maximo 4 frases, sin listas ni markdown) en espanol rioplatense, tuteando de "vos",
tono cercano y directo, sin exagerar ni sonar alarmista. Mencioná el dato mas relevante primero.`;

  return generarTexto(prompt);
}
