import { addUtcMonths, daysBetween, daysInUtcMonth, isWeekend, startOfNextUtcMonth, startOfUtcMonth } from "@/lib/date";
import { resumenMensual, type TransaccionInsight } from "@/lib/insights";
import { formatMoney } from "@/lib/money";

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
 * Agrupa movimientos de un tipo por descripcion (normalizada) y busca pares
 * separados por ~30 dias con montos parecidos. Dos o mas repeticiones asi son
 * un gasto o ingreso recurrente, lo haya marcado el usuario o no. Compartido
 * entre reglaSuscripciones (gastos) y reglaIngresoRecurrente (ingresos).
 */
function agruparRecurrentes(
  transacciones: TransaccionInsight[],
  type: "INCOME" | "EXPENSE",
): { totalMensual: number; nombres: string[] } {
  const grupos = new Map<string, TransaccionInsight[]>();

  for (const t of transacciones) {
    if (t.type !== type) continue;
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

  return { totalMensual, nombres };
}

/** Regla 2: gastos recurrentes (suscripciones, alquiler, servicios...). */
export function reglaSuscripciones(transacciones: TransaccionInsight[]): Insight[] {
  const { totalMensual, nombres } = agruparRecurrentes(transacciones, "EXPENSE");
  if (nombres.length === 0) return [];

  return [
    {
      id: "suscripciones",
      severidad: "info",
      titulo: `Tienes ${nombres.length} gasto${nombres.length > 1 ? "s" : ""} recurrente${nombres.length > 1 ? "s" : ""}`,
      mensaje: `${nombres.join(", ")} suman ${formatMoney(totalMensual)} por mes, se repitan o no te des cuenta.`,
    },
  ];
}

/**
 * Regla 5: mismo agrupador que reglaSuscripciones pero sobre ingresos - detecta
 * el sueldo fijo sin que el usuario lo marque a mano. Solo informa; no toca
 * PlanSettings.incomeCents (esa persistencia ya tuvo sus propios bugs).
 */
export function reglaIngresoRecurrente(transacciones: TransaccionInsight[]): Insight[] {
  const { totalMensual, nombres } = agruparRecurrentes(transacciones, "INCOME");
  if (nombres.length === 0) return [];

  return [
    {
      id: "ingreso-recurrente",
      severidad: "info",
      titulo: "Ingreso fijo detectado",
      mensaje: `${nombres.join(", ")} entra todos los meses, alrededor de ${formatMoney(totalMensual)}.`,
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

const RACHA_MINIMA = 2;
const RACHA_TOPE_MESES = 12;

/**
 * Regla 6: cuenta meses consecutivos hacia atras (mes actual no cuenta, todavia
 * esta en curso) en los que el gasto de la categoria se mantuvo dentro del
 * limite vigente. Aplica el limite ACTUAL a los meses anteriores (mismo
 * criterio que ya usa promedioGastoPorCategoria en insights.ts) en vez de
 * intentar reconstruir que limite regia en cada mes, que no se guarda.
 */
export function reglaRachaPresupuesto(
  transacciones: TransaccionInsight[],
  presupuestos: PresupuestoInsight[],
  hoy: Date,
): Insight[] {
  const insights: Insight[] = [];

  for (const presupuesto of presupuestos) {
    if (presupuesto.monthlyLimitCents <= 0) continue;

    const transaccionesCategoria = transacciones.filter((t) => t.categoryId === presupuesto.categoryId);

    let racha = 0;
    for (let mesesAtras = 1; mesesAtras <= RACHA_TOPE_MESES; mesesAtras++) {
      const mes = addUtcMonths(hoy, -mesesAtras);
      const { expenseCents } = resumenMensual(transaccionesCategoria, mes);
      // 0 corta la racha en vez de sumarla: sin transacciones ese mes lo mas
      // probable es que no haya datos cargados (fuera de rango, o antes de
      // que la cuenta existiera), no que se haya "cumplido" el presupuesto.
      if (expenseCents === 0 || expenseCents > presupuesto.monthlyLimitCents) break;
      racha++;
    }

    if (racha < RACHA_MINIMA) continue;

    const nombre = presupuesto.category.name;
    insights.push({
      id: `racha-${presupuesto.categoryId}`,
      severidad: "info",
      titulo: `Racha en ${nombre}`,
      mensaje: `Llevas ${racha} meses seguidos dentro del presupuesto de ${nombre}.`,
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

const UMBRAL_GASTO_HORMIGA_CENTS = 500_000; // $5.000
const MIN_COMPRAS_HORMIGA = 5;
const PORCENTAJE_MIN_HORMIGA = 0.05;

/**
 * Regla 7: muchas compras chicas (menos de UMBRAL_GASTO_HORMIGA_CENTS) que,
 * juntas, ya son una porcion relevante del gasto del mes - cada una por
 * separado no dispara ninguna otra regla, pero suman.
 */
export function reglaGastoHormiga(transacciones: TransaccionInsight[], hoy: Date): Insight[] {
  const desde = startOfUtcMonth(hoy);
  const hasta = startOfNextUtcMonth(hoy);

  let totalHormiga = 0;
  let cantidad = 0;
  let totalGastoMes = 0;

  for (const t of transacciones) {
    if (t.type !== "EXPENSE" || t.date < desde || t.date >= hasta) continue;
    totalGastoMes += t.amountCents;
    if (t.amountCents > 0 && t.amountCents < UMBRAL_GASTO_HORMIGA_CENTS) {
      totalHormiga += t.amountCents;
      cantidad++;
    }
  }

  if (cantidad < MIN_COMPRAS_HORMIGA) return [];
  if (totalGastoMes === 0 || totalHormiga / totalGastoMes < PORCENTAJE_MIN_HORMIGA) return [];

  return [
    {
      id: "gasto-hormiga",
      severidad: "info",
      titulo: "Gasto hormiga",
      mensaje: `Llevas ${formatMoney(totalHormiga)} en ${cantidad} compras chicas (menos de ${formatMoney(UMBRAL_GASTO_HORMIGA_CENTS)} cada una) este mes - solas no se notan, pero ya suman.`,
    },
  ];
}

const DIAS_MINIMOS_PARA_PROYECTAR = 3;

/**
 * Regla 8: con el gasto acumulado a hoy, extrapola linealmente a como va a
 * cerrar el mes (mismo dia promedio de gasto, multiplicado por los dias que
 * quedan) y de paso calcula cuanto queda disponible por dia si se quiere
 * respetar el balance actual. No proyecta el ingreso: se asume el que ya
 * entro, que suele no seguir creciendo mes adentro.
 */
export function reglaProyeccion(transacciones: TransaccionInsight[], hoy: Date): Insight[] {
  const desde = startOfUtcMonth(hoy);
  const diasTranscurridos = daysBetween(desde, hoy) + 1;
  const diasTotales = daysInUtcMonth(hoy);
  if (diasTranscurridos < DIAS_MINIMOS_PARA_PROYECTAR) return [];

  const resumen = resumenMensual(transacciones, hoy);
  if (resumen.incomeCents === 0 && resumen.expenseCents === 0) return [];

  const gastoProyectadoCents = Math.round((resumen.expenseCents / diasTranscurridos) * diasTotales);
  const balanceProyectadoCents = resumen.incomeCents - gastoProyectadoCents;

  const diasRestantes = diasTotales - diasTranscurridos;
  const disponibleMensaje =
    diasRestantes > 0
      ? ` Te quedan ${formatMoney(Math.max(0, resumen.balanceCents) / diasRestantes)} por dia para los ${diasRestantes} dias que quedan.`
      : "";

  const severidad: Severidad =
    balanceProyectadoCents < 0 ? "danger" : balanceProyectadoCents < resumen.incomeCents * 0.05 ? "warning" : "info";

  return [
    {
      id: "proyeccion-mensual",
      severidad,
      titulo: balanceProyectadoCents < 0 ? "Vas a cerrar el mes en rojo" : "Proyeccion de fin de mes",
      mensaje: `A este ritmo vas a terminar el mes con un balance de ${formatMoney(balanceProyectadoCents)}.${disponibleMensaje}`,
    },
  ];
}

export function generarRecomendaciones(
  transacciones: TransaccionInsight[],
  presupuestos: PresupuestoInsight[],
  hoy: Date,
): Insight[] {
  return ordenarPorSeveridad([
    ...reglaProyeccion(transacciones, hoy),
    ...reglaAumentoCategoria(transacciones, hoy),
    ...reglaPresupuesto(transacciones, presupuestos, hoy),
    ...reglaGastoHormiga(transacciones, hoy),
    ...reglaSuscripciones(transacciones),
    ...reglaIngresoRecurrente(transacciones),
    ...reglaRachaPresupuesto(transacciones, presupuestos, hoy),
    ...reglaFinDeSemana(transacciones, hoy),
  ]);
}
