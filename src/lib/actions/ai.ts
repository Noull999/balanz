"use server";

import { generarJSON, generarTexto, type ResultadoIA, type ResultadoJSON } from "@/lib/ai/gemini";
import { requireUser } from "@/lib/auth";
import { addUtcMonths, startOfUtcMonth, todayInput, toUtcDay } from "@/lib/date";
import { gastoPorCategoria, resumenMensual } from "@/lib/insights";
import { formatMoney } from "@/lib/money";
import type { PlanDistribucion } from "@/lib/plan-distribucion";
import { prisma } from "@/lib/prisma";
import { generarRecomendaciones } from "@/lib/recommendations";

/**
 * Arma el bloque de datos que le llega a la IA en texto plano, a partir de lo
 * que YA calcularon las funciones puras de insights.ts y recommendations.ts.
 * La IA nunca ve movimientos sueltos, solo estos numeros ya redondeados -
 * asi no puede inventar un monto o una categoria que no esten en esta lista.
 * Lo comparten el resumen del mes y las preguntas libres para no repetir las
 * mismas consultas a la base dos veces.
 */
async function armarContexto(userId: string) {
  const hoy = toUtcDay(todayInput());
  const desde = startOfUtcMonth(addUtcMonths(hoy, -3));

  const [transacciones, presupuestos] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: desde } },
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
      where: { userId },
      select: {
        categoryId: true,
        monthlyLimitCents: true,
        category: { select: { name: true } },
      },
    }),
  ]);

  const resumen = resumenMensual(transacciones, hoy);
  const categorias = gastoPorCategoria(transacciones, hoy);
  const recomendaciones = generarRecomendaciones(transacciones, presupuestos, hoy);

  const lineas = [
    `Ingresos del mes: ${formatMoney(resumen.incomeCents)}.`,
    `Gastos del mes: ${formatMoney(resumen.expenseCents)}.`,
    `Balance del mes: ${formatMoney(resumen.balanceCents)}.`,
    categorias.length > 0
      ? `Gasto por categoria este mes: ${categorias.map((c) => `${c.name} (${formatMoney(c.amountCents)})`).join(", ")}.`
      : "Todavia no hay gastos categorizados este mes.",
    presupuestos.length > 0
      ? `Presupuestos definidos: ${presupuestos.map((p) => `${p.category.name} hasta ${formatMoney(p.monthlyLimitCents)} por mes`).join(", ")}.`
      : "No hay presupuestos definidos.",
    recomendaciones.length > 0
      ? `Alertas que ya detecto el sistema: ${recomendaciones.map((r) => r.mensaje).join(" ")}`
      : "No hay alertas activas este mes.",
  ].join("\n");

  return { resumen, lineas };
}

export type ResumenConTips = { resumen: string; tips: string[] };

const ESQUEMA_RESUMEN = {
  type: "OBJECT",
  properties: {
    resumen: { type: "STRING", description: "Resumen del mes en 2-3 frases" },
    tips: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "2 o 3 acciones concretas y accionables para mejorar",
    },
  },
  required: ["resumen", "tips"],
};

export async function generarResumenMensual(): Promise<ResultadoJSON<ResumenConTips>> {
  const user = await requireUser();
  const { resumen, lineas } = await armarContexto(user.id);

  if (resumen.incomeCents === 0 && resumen.expenseCents === 0) {
    return { ok: false, error: "Todavia no hay movimientos este mes para resumir." };
  }

  const prompt = `Eres el asistente financiero de Balanz, una app de control de gastos personales.
Con estos datos reales (ya calculados, no inventes otros numeros ni otras categorias):

${lineas}

Devuelve un resumen del mes (2-3 frases, el dato mas relevante primero, sin markdown) y 2 o 3 tips
concretos y accionables para mejorar (nada generico tipo "gasta menos", numeros o categorias
puntuales de la lista de arriba). Todo en espanol neutro, tuteando de "tu", tono cercano y directo,
sin exagerar ni sonar alarmista.`;

  return generarJSON<ResumenConTips>(prompt, ESQUEMA_RESUMEN);
}

const LARGO_MAXIMO_PREGUNTA = 300;

/**
 * "Pregúntale a tus finanzas": la pregunta la escribe el usuario, pero la
 * respuesta esta obligada a basarse solo en armarContexto() de arriba - el
 * prompt le pide explicitamente decir que no tiene el dato en vez de
 * inventar algo fuera de esa lista.
 */
export async function preguntarIA(pregunta: string): Promise<ResultadoIA> {
  const user = await requireUser();
  const preguntaLimpia = pregunta.trim().slice(0, LARGO_MAXIMO_PREGUNTA);

  if (!preguntaLimpia) {
    return { ok: false, error: "Escribe una pregunta." };
  }

  const { lineas } = await armarContexto(user.id);

  const prompt = `Eres el asistente financiero de Balanz, una app de control de gastos personales.
Estos son los unicos datos reales que tienes disponibles (no inventes otros numeros, categorias ni meses):

${lineas}

Pregunta del usuario: "${preguntaLimpia}"

Responde en espanol neutro, tuteando de "tu", maximo 3 frases, sin markdown. Si la pregunta no se
puede responder solo con los datos de arriba, dilo con claridad en vez de inventar una respuesta.`;

  return generarTexto(prompt);
}

/**
 * Redacta en palabras el plan de distribucion que ya calculo calcularPlan()
 * (src/lib/plan-distribucion.ts): la IA recibe los montos ya hechos y solo
 * explica el porque, nunca inventa ni ajusta un numero por su cuenta.
 */
export async function explicarPlanDistribucion(plan: PlanDistribucion): Promise<ResultadoIA> {
  await requireUser();

  const lineas = [
    `Ingreso mensual: ${formatMoney(plan.incomeCents)}.`,
    `Gastos esenciales: ${formatMoney(plan.esencialCents)}.`,
    `Ocio: ${formatMoney(plan.ocioCents)}.`,
    `Ahorro: ${formatMoney(plan.ahorroCents)}.`,
    plan.asignaciones.length > 0
      ? `Reparto por categoria: ${plan.asignaciones
          .map((a) => `${a.name} (${a.bucket === "OCIO" ? "ocio" : "esencial"}, ${formatMoney(a.monthlyLimitCents)})`)
          .join(", ")}.`
      : "Todavia no hay categorias de gasto para repartir.",
  ].join("\n");

  const prompt = `Eres el asistente financiero de Balanz, una app de control de gastos personales.
Un usuario acaba de armar este plan de distribucion de su ingreso mensual (los numeros ya estan
calculados, no los cambies ni inventes otros):

${lineas}

Explicale en 2-3 frases por que este reparto le permite ahorrar sin resignar del todo su ocio, y
anima a aplicarlo o ajustarlo si algo no calza con su realidad. Espanol neutro, tuteando de "tu",
sin markdown, tono cercano y directo.`;

  return generarTexto(prompt);
}
