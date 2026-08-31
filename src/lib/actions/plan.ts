"use server";

import { revalidatePath } from "next/cache";

import { PlanBucket } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { asignacionSchema } from "@/lib/validation";

export type AplicarPlanResultado = { ok: true } | { ok: false; error: string };

/**
 * Vuelca el plan (calculado en el cliente por calcularPlan, editado a mano o
 * no) a la tabla de presupuestos: un upsert por categoria, igual que
 * guardarPresupuesto pero para varias categorias a la vez.
 */
export async function aplicarPlanDistribucion(
  asignaciones: { categoryId: string; monthlyLimitCents: number }[],
): Promise<AplicarPlanResultado> {
  const user = await requireUser();

  const parsed = asignacionSchema.array().safeParse(asignaciones);
  if (!parsed.success) {
    return { ok: false, error: "El plan tiene datos invalidos." };
  }

  const conMonto = parsed.data.filter((a) => a.monthlyLimitCents > 0);
  if (conMonto.length === 0) {
    return { ok: false, error: "No hay ningun monto mayor a cero para aplicar." };
  }

  // Solo se aplican categorias de gasto que sean del usuario: evita que
  // alguien mande un categoryId ajeno o de una categoria de ingresos.
  const categoriasValidas = await prisma.category.findMany({
    where: { id: { in: conMonto.map((a) => a.categoryId) }, userId: user.id, kind: "EXPENSE" },
    select: { id: true },
  });
  const idsValidos = new Set(categoriasValidas.map((c) => c.id));
  const aplicables = conMonto.filter((a) => idsValidos.has(a.categoryId));

  if (aplicables.length === 0) {
    return { ok: false, error: "Ninguna de esas categorias es tuya." };
  }

  await prisma.$transaction(
    aplicables.map((a) =>
      prisma.budget.upsert({
        where: { categoryId: a.categoryId },
        create: { categoryId: a.categoryId, userId: user.id, monthlyLimitCents: a.monthlyLimitCents },
        update: { monthlyLimitCents: a.monthlyLimitCents },
      }),
    ),
  );

  revalidatePath("/presupuestos");
  revalidatePath("/dashboard");
  revalidatePath("/plan");

  return { ok: true };
}

/**
 * Guarda a que balde (Esencial/Ocio) pertenece una categoria, para que /plan
 * deje de recalcularlo con bucketSugerido() cada vez que se abre la pantalla.
 */
export async function actualizarBucketCategoria(
  categoryId: string,
  bucket: PlanBucket,
): Promise<{ ok: boolean }> {
  const user = await requireUser();

  // El where incluye userId: evita mover el balde de una categoria ajena.
  const { count } = await prisma.category.updateMany({
    where: { id: categoryId, userId: user.id, kind: "EXPENSE" },
    data: { planBucket: bucket },
  });

  if (count > 0) revalidatePath("/plan");

  return { ok: count > 0 };
}
