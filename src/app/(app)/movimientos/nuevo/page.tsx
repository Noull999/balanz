import type { Metadata } from "next";

import { MovimientoForm } from "@/components/transactions/movimiento-form";
import { crearMovimiento } from "@/lib/actions/transactions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Nuevo movimiento" };

export default async function NuevoMovimientoPage() {
  const user = await requireUser();

  const categorias = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, kind: true },
  });

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">Nuevo movimiento</h1>
      <div className="mt-6 rounded-xl border border-border bg-surface p-6">
        <MovimientoForm
          categorias={categorias}
          action={crearMovimiento}
          submitLabel="Guardar"
        />
      </div>
    </div>
  );
}
