import { Target } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PlanConDeuda } from "@/components/plan/plan-con-deuda";
import { SavingsGoalsCard } from "@/components/plan/savings-goals-card";
import { requireUser } from "@/lib/auth";
import { addUtcMonths, startOfUtcMonth, todayInput, toUtcDay } from "@/lib/date";
import { promedioGastoPorCategoria, resumenMensual, type TransaccionInsight } from "@/lib/insights";
import { bucketSugerido } from "@/lib/plan-distribucion";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Plan de distribucion" };

const MESES_HISTORIAL = 4;

export default async function PlanPage() {
  const user = await requireUser();
  const hoy = toUtcDay(todayInput());
  const desde = startOfUtcMonth(addUtcMonths(hoy, -(MESES_HISTORIAL - 1)));

  const [categorias, deuda, configuracion, metas] = await Promise.all([
    prisma.category.findMany({
      where: { userId: user.id, kind: "EXPENSE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true, icon: true, planBucket: true },
    }),
    prisma.debt.findUnique({
      where: { userId: user.id },
      select: { name: true, originalCents: true, remainingCents: true },
    }),
    prisma.planSettings.findUnique({ where: { userId: user.id } }),
    prisma.savingsGoal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, targetCents: true, targetDate: true, createdAt: true },
    }),
  ]);

  // El progreso de una meta necesita transacciones desde que se creo, que
  // puede ser mas atras que el historial que usa el reparto (MESES_HISTORIAL).
  const desdeMetas = metas.reduce(
    (min, meta) => (meta.createdAt < min ? startOfUtcMonth(meta.createdAt) : min),
    desde,
  );

  const transacciones: TransaccionInsight[] = await prisma.transaction.findMany({
    where: { userId: user.id, date: { gte: desdeMetas } },
    select: {
      id: true,
      amountCents: true,
      type: true,
      description: true,
      date: true,
      categoryId: true,
      category: { select: { id: true, name: true, color: true } },
    },
  });

  const ingresoDelMes = configuracion?.incomeCents ?? resumenMensual(transacciones, hoy).incomeCents;
  const porcentajesIniciales = configuracion
    ? {
        esencial: configuracion.porcentajeEsencial,
        ocio: configuracion.porcentajeOcio,
        ahorro: configuracion.porcentajeAhorro,
      }
    : undefined;
  const promedios = promedioGastoPorCategoria(transacciones, hoy, MESES_HISTORIAL - 1);

  const categoriasPlan = categorias.map((categoria) => ({
    categoryId: categoria.id,
    name: categoria.name,
    color: categoria.color,
    icon: categoria.icon,
    // El balde elegido a mano queda guardado en la categoria; solo se usa la
    // sugerencia automatica la primera vez, antes de que el usuario lo toque.
    bucket: categoria.planBucket ?? bucketSugerido(categoria.name),
    promedioCents: promedios.get(categoria.id) ?? 0,
  }));

  return (
    <>
      <div className="flex items-center gap-2.5">
        <Target className="size-6 text-brand" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight">Plan de distribucion</h1>
      </div>
      <p className="mt-1 text-sm text-muted">
        Coloca tu ingreso mensual y Balanz te sugiere cuanto destinar a lo esencial, a tu ocio y al ahorro,
        repartido entre tus categorias reales. Podes ajustar todo a mano antes de aplicarlo.
      </p>

      {categoriasPlan.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <Target className="mx-auto size-8 text-muted" strokeWidth={1.5} aria-hidden />
          <p className="mt-4 font-medium">No tienes categorias de gasto todavia</p>
          <Link
            href="/categorias/nueva"
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-strong"
          >
            Crear una categoria
          </Link>
        </div>
      ) : (
        <div className="mt-6">
          <PlanConDeuda
            deuda={deuda}
            categoriasGasto={categorias}
            categoriasPlan={categoriasPlan}
            ingresoInicialCents={ingresoDelMes}
            ingresoEsManual={configuracion?.incomeCents != null}
            porcentajesIniciales={porcentajesIniciales}
            montoDeudaInicialCents={configuracion?.deudaPagoPlaneadoCents ?? 0}
          />
        </div>
      )}

      <div className="mt-6">
        <SavingsGoalsCard metas={metas} transacciones={transacciones} hoy={hoy} />
      </div>
    </>
  );
}
