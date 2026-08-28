import type { Metadata } from "next";

import { AiAsk } from "@/components/dashboard/ai-ask";
import { AiSummary } from "@/components/dashboard/ai-summary";
import { BalanceChart } from "@/components/dashboard/balance-chart";
import { CategoryPieChart } from "@/components/dashboard/category-pie-chart";
import { InsightCard } from "@/components/dashboard/insight-card";
import { SpendingCalendar } from "@/components/dashboard/spending-calendar";
import { StatTile } from "@/components/dashboard/stat-tile";
import { requireUser } from "@/lib/auth";
import { addUtcMonths, daysInUtcMonth, startOfUtcMonth, todayInput, toUtcDay } from "@/lib/date";
import { gastoPorCategoria, gastoPorDia, resumenMensual, serieMensual } from "@/lib/insights";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { generarRecomendaciones } from "@/lib/recommendations";

export const metadata: Metadata = { title: "Panel" };

const MESES_HISTORIAL = 6;

export default async function DashboardPage() {
  const user = await requireUser();

  // "Hoy" ancla al dia calendario de Chile, no al reloj UTC del server:
  // ver el comentario de todayInput en src/lib/date.ts.
  const hoy = toUtcDay(todayInput());
  const desde = startOfUtcMonth(addUtcMonths(hoy, -(MESES_HISTORIAL - 1)));

  const [transacciones, presupuestos] = await Promise.all([
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
  ]);

  const resumen = resumenMensual(transacciones, hoy);
  const categorias = gastoPorCategoria(transacciones, hoy);
  const serie = serieMensual(transacciones, hoy, MESES_HISTORIAL);
  const recomendaciones = generarRecomendaciones(transacciones, presupuestos, hoy);

  const gastoDiario = gastoPorDia(transacciones, hoy);
  const presupuestoTotalCents = presupuestos.reduce((total, p) => total + p.monthlyLimitCents, 0);
  const presupuestoDiarioCents = Math.round(presupuestoTotalCents / daysInUtcMonth(hoy));

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">
        Hola{user.name ? `, ${user.name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-1 text-muted">Asi viene este mes.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-8">
          <div className="grid gap-5 sm:grid-cols-3">
            <StatTile label="Ingresos del mes" value={formatMoney(resumen.incomeCents)} tone="positive" />
            <StatTile label="Gastos del mes" value={formatMoney(resumen.expenseCents)} tone="negative" />
            <StatTile
              label="Balance"
              value={formatMoney(resumen.balanceCents)}
              tone={resumen.balanceCents >= 0 ? "positive" : "negative"}
            />
          </div>

          <AiSummary />

          <AiAsk />

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

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <h2 className="text-sm font-medium text-muted">Recomendaciones</h2>
          {recomendaciones.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
              Todavia no hay nada para avisarte. A medida que cargues mas movimientos van a aparecer patrones aca.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {recomendaciones.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </ul>
          )}
        </aside>
      </div>
    </>
  );
}
