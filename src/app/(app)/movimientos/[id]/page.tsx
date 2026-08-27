import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MovimientoForm } from "@/components/transactions/movimiento-form";
import { actualizarMovimiento } from "@/lib/actions/transactions";
import { requireUser } from "@/lib/auth";
import { toDateInput } from "@/lib/date";
import { centsToInput } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Editar movimiento" };

export default async function EditarMovimientoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const [movimiento, categorias] = await Promise.all([
    prisma.transaction.findFirst({
      // El userId en el where es lo que evita que se pueda abrir el movimiento
      // de otra cuenta poniendo su id en la URL.
      where: { id, userId: user.id },
      select: {
        id: true,
        description: true,
        amountCents: true,
        type: true,
        date: true,
        categoryId: true,
      },
    }),
    prisma.category.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, kind: true },
    }),
  ]);

  if (!movimiento) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">Editar movimiento</h1>
      <div className="mt-6 rounded-xl border border-border bg-surface p-6">
        <MovimientoForm
          categorias={categorias}
          action={actualizarMovimiento.bind(null, movimiento.id)}
          submitLabel="Guardar cambios"
          inicial={{
            type: movimiento.type,
            description: movimiento.description,
            date: toDateInput(movimiento.date),
            amount: centsToInput(movimiento.amountCents),
            categoryId: movimiento.categoryId ?? "",
          }}
        />
      </div>
    </div>
  );
}
