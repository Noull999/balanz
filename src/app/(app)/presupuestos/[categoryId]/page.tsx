import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PresupuestoForm } from "@/components/budgets/presupuesto-form";
import { guardarPresupuesto } from "@/lib/actions/budgets";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Presupuesto" };

export default async function EditarPresupuestoPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  const user = await requireUser();

  const categoria = await prisma.category.findFirst({
    // userId + kind en el where: no se puede setear presupuesto a una
    // categoria ajena, ni a una de ingresos.
    where: { id: categoryId, userId: user.id, kind: "EXPENSE" },
    select: { id: true, name: true, budget: { select: { monthlyLimitCents: true } } },
  });

  if (!categoria) notFound();

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">
        Presupuesto de {categoria.name}
      </h1>
      <div className="mt-6 rounded-xl border border-border bg-surface p-6">
        <PresupuestoForm
          action={guardarPresupuesto.bind(null, categoria.id)}
          limiteActualCents={categoria.budget?.monthlyLimitCents ?? null}
        />
      </div>
    </div>
  );
}
