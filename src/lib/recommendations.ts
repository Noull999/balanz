import { addUtcMonths, daysBetween, isWeekend, startOfNextUtcMonth, startOfUtcMonth } from "@/lib/date";
import { resumenMensual, type TransaccionInsight } from "@/lib/insights";

export type Severidad = "info" | "warning" | "danger";

/** A partir de que porcentaje del presupuesto se avisa. Compartido con la barra de progreso. */
export const UMBRAL_ALERTA_PRESUPUESTO = 0.8;

export type Insight = {
  id: string;
  severidad: Severidad;
  titulo: string;
  mensaje: string;
  categoryId?: string;
};

const PESO_SEVERIDAD: Record<Severidad, number> = { danger: 0, warning: 1, info: 2 };

function ordenarPorSeveridad(insights: Insight[]): Insight[] {
  return [...insights].sort((a, b) => PESO_SEVERIDAD[a.severidad] - PESO_SEVERIDAD[b.severidad]);
}

/**
 * Regla 1: si una categoria de gasto sube mas de 25% respecto al promedio de
 * los ultimos 3 meses, alerta. Sin promedio (categoria nueva) no hay con que
 * comparar, asi que no genera falsos positivos.
 */
export function reglaAumentoCategoria(
  transacciones: TransaccionInsight[],
  hoy: Date,
): Insight[] {
  const gastoPorMes = (mesesAtras: number, categoryId: string) => {
    const mes = addUtcMonths(hoy, -mesesAtras);
    const desde = startOfUtcMonth(mes);
    const hasta = startOfNextUtcMonth(mes);

    return transacciones
      .filter(
        (t) =>
          t.type === "EXPENSE" &&
          t.categoryId === categoryId &&
          t.date >= desde &&
          t.date < hasta,
      )
      .reduce((total, t) => total + t.amountCents, 0);
  };

  const categorias = new Map<string, string>();
  for (const t of transacciones) {
    if (t.type === "EXPENSE" && t.categoryId && t.category) {
      categorias.set(t.categoryId, t.category.name);
    }
  }

  const insights: Insight[] = [];

  for (const [categoryId, name] of categorias) {
    const actual = gastoPorMes(0, categoryId);
    const anteriores = [1, 2, 3].map((n) => gastoPorMes(n, categoryId));
    const mesesConDatos = anteriores.filter((c) => c > 0).length;

    if (mesesConDatos === 0 || actual === 0) continue;

    const promedio = anteriores.reduce((a, b) => a + b, 0) / anteriores.length;
    if (promedio === 0) continue;

    const variacion = (actual - promedio) / promedio;
    if (variacion <= 0.25) continue;

    insights.push({
      id: `aumento-${categoryId}`,
      severidad: variacion >= 0.5 ? "danger" : "warning",
      titulo: `Subiste el gasto en ${name}`,
      mensaje: `Gastaste ${Math.round(variacion * 100)}% mas que tu promedio de los ultimos meses en ${name}.`,
      categoryId,
    });
  }

  return insights;
}

const TOLERANCIA_MONTO = 0.1;
const INTERVALO_MIN_DIAS = 25;
const INTERVALO_MAX_DIAS = 35;

function montosParecidos(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOLERANCIA_MONTO * Math.max(a, b);
}

/**
 * Regla 2: agrupa gastos por descripcion (normalizada) y busca pares separados
 * por ~30 dias con montos parecidos. Dos o mas repeticiones asi son una
 * suscripcion, la haya marcado el usuario o no.
 */
export function reglaSuscripciones(transacciones: TransaccionInsight[]): Insight[] {
  const grupos = new Map<string, TransaccionInsight[]>();

  for (const t of transacciones) {
    if (t.type !== "EXPENSE") continue;
    const clave = t.description.trim().toLowerCase();
    if (!clave) continue;

    const grupo = grupos.get(clave);
    if (grupo) grupo.push(t);
    else grupos.set(clave, [t]);
  }

  let totalMensual = 0;
  const nombres: string[] = [];

  for (const grupo of grupos.values()) {
    const ordenado = [...grupo].sort((a, b) => a.date.getTime() - b.date.getTime());

    let repeticiones = 0;
    for (let i = 1; i < ordenado.length; i++) {
      const dias = daysBetween(ordenado[i - 1].date, ordenado[i].date);
      const parecidos = montosParecidos(ordenado[i - 1].amountCents, ordenado[i].amountCents);

      if (dias >= INTERVALO_MIN_DIAS && dias <= INTERVALO_MAX_DIAS && parecidos) {
        repeticiones++;
      }
    }

    if (repeticiones >= 1) {
      totalMensual += ordenado[ordenado.length - 1].amountCents;
      nombres.push(ordenado[0].description);
    }
  }

  if (nombres.length === 0) return [];

  return [
    {
      id: "suscripciones",
      severidad: "info",
      titulo: `Tenes ${nombres.length} gasto${nombres.length > 1 ? "s" : ""} recurrente${nombres.length > 1 ? "s" : ""}`,
      mensaje: `${nombres.join(", ")} suman ${(totalMensual / 100).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })} por mes, se repitan o no te des cuenta.`,
    },
  ];
}

export type PresupuestoInsight = {
  categoryId: string;
  monthlyLimitCents: number;
  category: { name: string };
};

/** Regla 3: gasto acumulado del mes contra el limite de presupuesto de la categoria. */
export function reglaPresupuesto(
  transacciones: TransaccionInsight[],
  presupuestos: PresupuestoInsight[],
  hoy: Date,
): Insight[] {
  const insights: Insight[] = [];

  for (const presupuesto of presupuestos) {
    const { expenseCents } = resumenMensual(
      transacciones.filter((t) => t.categoryId === presupuesto.categoryId),
      hoy,
    );

    if (presupuesto.monthlyLimitCents <= 0) continue;
    const ratio = expenseCents / presupuesto.monthlyLimitCents;
    if (ratio < UMBRAL_ALERTA_PRESUPUESTO) continue;

    const nombre = presupuesto.category.name;

    insights.push({
      id: `presupuesto-${presupuesto.categoryId}`,
      severidad: ratio >= 1 ? "danger" : "warning",
      titulo: ratio >= 1 ? `Superaste el presupuesto de ${nombre}` : `Te estas acercando al limite de ${nombre}`,
      mensaje: `Llevas gastado ${Math.round(ratio * 100)}% de tu presupuesto mensual de ${nombre}.`,
      categoryId: presupuesto.categoryId,
    });
  }

  return insights;
}

/** Regla 4: promedio de gasto diario en fin de semana contra entre semana, ultimos `dias`. */
export function reglaFinDeSemana(
  transacciones: TransaccionInsight[],
  hoy: Date,
  dias = 30,
): Insight[] {
  const desde = new Date(hoy.getTime() - dias * 86_400_000);

  let gastoFinde = 0;
  let diasFinde = 0;
  let gastoSemana = 0;
  let diasSemana = 0;

  for (let i = 0; i < dias; i++) {
    const dia = new Date(desde.getTime() + i * 86_400_000);
    if (isWeekend(dia)) diasFinde++;
    else diasSemana++;
  }

  for (const t of transacciones) {
    if (t.type !== "EXPENSE" || t.date < desde || t.date > hoy) continue;
    if (isWeekend(t.date)) gastoFinde += t.amountCents;
    else gastoSemana += t.amountCents;
  }

  if (diasFinde === 0 || diasSemana === 0 || gastoSemana === 0) return [];

  const promedioFinde = gastoFinde / diasFinde;
  const promedioSemana = gastoSemana / diasSemana;
  if (promedioFinde === 0) return [];

  const veces = promedioFinde / promedioSemana;
  if (veces < 1.5) return [];

  return [
    {
      id: "fin-de-semana",
      severidad: "info",
      titulo: "Gastas mas los fines de semana",
      mensaje: `Los fines de semana gastas ${veces.toFixed(1)}x mas por dia que entre semana.`,
    },
  ];
}

export function generarRecomendaciones(
  transacciones: TransaccionInsight[],
  presupuestos: PresupuestoInsight[],
  hoy: Date,
): Insight[] {
  return ordenarPorSeveridad([
    ...reglaAumentoCategoria(transacciones, hoy),
    ...reglaPresupuesto(transacciones, presupuestos, hoy),
    ...reglaSuscripciones(transacciones),
    ...reglaFinDeSemana(transacciones, hoy),
  ]);
}
