import type { Metadata } from "next";

import { BalanceChart } from "@/components/dashboard/balance-chart";
import { CategoryPieChart } from "@/components/dashboard/category-pie-chart";
import { InsightCard } from "@/components/dashboard/insight-card";
import { StatTile } from "@/components/dashboard/stat-tile";
import { requireUser } from "@/lib/auth";
import { addUtcMonths, startOfUtcMonth, todayInput, toUtcDay } from "@/lib/date";
import { gastoPorCategoria, resumenMensual, serieMensual } from "@/lib/insights";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { generarRecomendaciones } from "@/lib/recommendations";

export const metadata: Metadata = { title: "Panel" };

const MESES_HISTORIAL = 6;

export default async function DashboardPage() {
  const user = await requireUser();

  // "Hoy" ancla al dia calendario de Argentina, no al reloj UTC del server:
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

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">
        Hola{user.name ? `, ${user.name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-1 text-muted">Asi viene este mes.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatTile label="Ingresos del mes" value={formatMoney(resumen.incomeCents)} tone="positive" />
        <StatTile label="Gastos del mes" value={formatMoney(resumen.expenseCents)} tone="negative" />
        <StatTile
          label="Balance"
          value={formatMoney(resumen.balanceCents)}
          tone={resumen.balanceCents >= 0 ? "positive" : "negative"}
        />
      </div>

      {recomendaciones.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-muted">Recomendaciones</h2>
          <ul className="mt-3 space-y-2.5">
            {recomendaciones.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-medium">Gasto por categoria este mes</h2>
          <div className="mt-4">
            <CategoryPieChart data={categorias} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-medium">Ultimos {MESES_HISTORIAL} meses</h2>
          <div className="mt-4">
            <BalanceChart data={serie} />
          </div>
        </div>
      </div>
    </>
  );
}
