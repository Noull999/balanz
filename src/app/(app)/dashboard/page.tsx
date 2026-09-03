import type { Metadata } from "next";

import { AiAsk } from "@/components/dashboard/ai-ask";
import { AiSummary } from "@/components/dashboard/ai-summary";
import { BalanceChart } from "@/components/dashboard/balance-chart";
import { CategoryPieChart } from "@/components/dashboard/category-pie-chart";
import { InsightCard } from "@/components/dashboard/insight-card";
import { PlanSummaryCard } from "@/components/dashboard/plan-summary-card";
import { SaludBadge } from "@/components/dashboard/salud-badge";
import { SpendingCalendar } from "@/components/dashboard/spending-calendar";
import { StatTile } from "@/components/dashboard/stat-tile";
import { requireUser } from "@/lib/auth";
import { addUtcMonths, daysInUtcMonth, startOfUtcMonth, todayInput, toUtcDay } from "@/lib/date";
import { gastoPorCategoria, gastoPorDia, resumenMensual, serieMensual } from "@/lib/insights";
import { formatMoney } from "@/lib/money";
import { calcularPlan, bucketSugerido, PORCENTAJES_DEFECTO } from "@/lib/plan-distribucion";
import { prisma } from "@/lib/prisma";
import { generarRecomendaciones } from "@/lib/recommendations";
import { calcularSaludFinanciera } from "@/lib/salud-financiera";

export const metadata: Metadata = { title: "Panel" };

const MESES_HISTORIAL = 6;

export default async function DashboardPage() {
  const user = await requireUser();

  // "Hoy" ancla al dia calendario de Chile, no al reloj UTC del server:
  // ver el comentario de todayInput en src/lib/date.ts.
  const hoy = toUtcDay(todayInput());
  const desde = startOfUtcMonth(addUtcMonths(hoy, -(MESES_HISTORIAL - 1)));

  const [transacciones, presupuestos, categoriasBucket, configuracion, deuda] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: desde } },
      orderBy: { date: "asc" },
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
    prisma.category.findMany({
      where: { userId: user.id, kind: "EXPENSE" },
      select: { id: true, name: true, planBucket: true },
    }),
    prisma.planSettings.findUnique({ where: { userId: user.id } }),
    prisma.debt.findUnique({ where: { userId: user.id }, select: { remainingCents: true } }),
  ]);

  const resumen = resumenMensual(transacciones, hoy);
  const categorias = gastoPorCategoria(transacciones, hoy);
  const serie = serieMensual(transacciones, hoy, MESES_HISTORIAL);
  const recomendaciones = generarRecomendaciones(transacciones, presupuestos, hoy);

  const gastoDiario = gastoPorDia(transacciones, hoy);
  const presupuestoTotalCents = presupuestos.reduce((total, p) => total + p.monthlyLimitCents, 0);
  const presupuestoDiarioCents = Math.round(presupuestoTotalCents / daysInUtcMonth(hoy));

  // Mismo calculo que /plan (misma fuente: PlanSettings), asi el resumen del
  // dashboard y la pantalla del plan nunca muestran targets distintos.
  const ingresoPlanCents = configuracion?.incomeCents ?? resumen.incomeCents;
  const descuentoDeudaCents = configuracion?.deudaPagoPlaneadoCents ?? 0;
  const ingresoDisponiblePlanCents = Math.max(0, ingresoPlanCents - descuentoDeudaCents);
  const porcentajesPlan = configuracion
    ? {
        esencial: configuracion.porcentajeEsencial,
        ocio: configuracion.porcentajeOcio,
        ahorro: configuracion.porcentajeAhorro,
      }
    : PORCENTAJES_DEFECTO;
  const planTargets = calcularPlan(ingresoDisponiblePlanCents, [], porcentajesPlan);

  const bucketPorCategoria = new Map(
    categoriasBucket.map((c) => [c.id, c.planBucket ?? bucketSugerido(c.name)]),
  );
  let esencialGastadoCents = 0;
  let ocioGastadoCents = 0;
  for (const c of categorias) {
    if ((bucketPorCategoria.get(c.categoryId) ?? "ESENCIAL") === "OCIO") ocioGastadoCents += c.amountCents;
    else esencialGastadoCents += c.amountCents;
  }

  const presupuestosSuperados = presupuestos.filter((p) => {
    if (p.monthlyLimitCents <= 0) return false;
    const { expenseCents } = resumenMensual(
      transacciones.filter((t) => t.categoryId === p.categoryId),
      hoy,
    );
    return expenseCents > p.monthlyLimitCents;
  }).length;

  const salud = calcularSaludFinanciera({
    balanceCents: resumen.balanceCents,
    ahorroMetaCents: planTargets.ahorroCents,
    presupuestosSuperados,
    presupuestosTotal: presupuestos.length,
    deudaRemainingCents: deuda?.remainingCents ?? 0,
    ingresoMensualCents: ingresoPlanCents,
  });

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola{user.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <SaludBadge salud={salud} />
      </div>
      <p className="mt-1 text-muted">Asi viene este mes.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Ingresos del mes" value={formatMoney(resumen.incomeCents)} tone="positive" />
            <StatTile label="Gastos del mes" value={formatMoney(resumen.expenseCents)} tone="negative" />
            <StatTile
              label="Balance"
              value={formatMoney(resumen.balanceCents)}
              tone={resumen.balanceCents >= 0 ? "positive" : "negative"}
            />
          </div>

          <PlanSummaryCard
            esencialTargetCents={planTargets.esencialCents}
            ocioTargetCents={planTargets.ocioCents}
            ahorroTargetCents={planTargets.ahorroCents}
            esencialGastadoCents={esencialGastadoCents}
            ocioGastadoCents={ocioGastadoCents}
            balanceRealCents={resumen.balanceCents}
          />

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-border bg-surface p-6">
              <h2 className="text-sm font-medium">Gasto por categoria este mes</h2>
              <div className="mt-5">
                <CategoryPieChart data={categorias} />
              </div>
            </div>

            <div className="min-w-0 rounded-xl border border-border bg-surface p-6">
              <h2 className="text-sm font-medium">Ultimos {MESES_HISTORIAL} meses</h2>
              <div className="mt-5">
                <BalanceChart data={serie} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-sm font-medium">Ritmo de gasto diario</h2>
            <p className="mt-1 text-sm text-muted">
              {presupuestoDiarioCents > 0
                ? `Compara cada dia contra ${formatMoney(presupuestoDiarioCents)}, tu presupuesto mensual repartido entre los dias del mes.`
                : "Define presupuestos para ver que dias te fuiste de ritmo."}
            </p>
            <div className="mt-5">
              <SpendingCalendar dias={gastoDiario} presupuestoDiarioCents={presupuestoDiarioCents} hoy={hoy} />
            </div>
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-8 lg:self-start">
          <AiSummary />
          <AiAsk />

          <div>
            <h2 className="text-sm font-medium text-muted">Recomendaciones</h2>
            {recomendaciones.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted">
                Todavia no hay nada para avisarte. A medida que cargues mas movimientos van a aparecer patrones aca.
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {recomendaciones.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
