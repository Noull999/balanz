import { PiggyBank, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BudgetProgress } from "@/components/budgets/budget-progress";
import { CategoryIcon } from "@/components/categories/category-icon";
import { borrarPresupuesto } from "@/lib/actions/budgets";
import { requireUser } from "@/lib/auth";
import { toUtcDay, todayInput } from "@/lib/date";
import { gastoPorCategoria } from "@/lib/insights";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Presupuestos" };

export default async function PresupuestosPage() {
  const user = await requireUser();
  const hoy = toUtcDay(todayInput());

  const [categorias, transaccionesDelMes] = await Promise.all([
    prisma.category.findMany({
      where: { userId: user.id, kind: "EXPENSE" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        budget: { select: { monthlyLimitCents: true } },
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: "EXPENSE",
        date: { gte: new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1)) },
      },
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
  ]);

  const gastoPorCategoriaId = new Map(
    gastoPorCategoria(transaccionesDelMes, hoy).map((c) => [c.categoryId, c.amountCents]),
  );

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Presupuestos</h1>
        <p className="mt-1 text-sm text-muted">
          Limite mensual por categoria de gasto. Balanz avisa cuando llegas al 80%.
        </p>
      </div>

      {categorias.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <PiggyBank className="mx-auto size-8 text-muted" strokeWidth={1.5} aria-hidden />
          <p className="mt-4 font-medium">No tienes categorias de gasto todavia</p>
          <Link
            href="/categorias/nueva"
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-strong"
          >
            Crear una categoria
          </Link>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {categorias.map((categoria) => {
            const gastado = gastoPorCategoriaId.get(categoria.id) ?? 0;
            const limite = categoria.budget?.monthlyLimitCents ?? null;

            return (
              <li key={categoria.id} className="flex items-center gap-4 px-4 py-4">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `${categoria.color}1a`, color: categoria.color }}
                >
                  <CategoryIcon name={categoria.icon} className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{categoria.name}</span>
                    <span className="shrink-0 text-sm tabular-nums text-muted">
                      {limite === null
                        ? formatMoney(gastado)
                        : `${formatMoney(gastado)} / ${formatMoney(limite)}`}
                    </span>
                  </div>

                  {limite !== null && (
                    <div className="mt-2">
                      <BudgetProgress spentCents={gastado} limitCents={limite} />
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={`/presupuestos/${categoria.id}`}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-background"
                  >
                    {limite === null ? "Definir" : "Editar"}
                  </Link>

                  {limite !== null && (
                    <form action={borrarPresupuesto}>
                      <input type="hidden" name="categoryId" value={categoria.id} />
                      <button
                        type="submit"
                        title="Quitar presupuesto"
                        aria-label={`Quitar presupuesto de ${categoria.name}`}
                        className="rounded-md p-1.5 text-muted transition hover:bg-negative/10 hover:text-negative"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
