"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { inputToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { fieldErrors, presupuestoSchema } from "@/lib/validation";

import type { FormState } from "@/lib/actions/auth";

export async function guardarPresupuesto(
  categoryId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const values = { monthlyLimit: String(formData.get("monthlyLimit") ?? "") };

  const parsed = presupuestoSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values };
  }

  const monthlyLimitCents = inputToCents(parsed.data.monthlyLimit);
  if (monthlyLimitCents === null) {
    return { errors: { monthlyLimit: "Ese monto no es un numero" }, values };
  }
  if (monthlyLimitCents <= 0) {
    return { errors: { monthlyLimit: "El limite tiene que ser mayor a cero" }, values };
  }

  // La categoria tiene que ser del usuario y de gasto: un presupuesto de
  // ingresos no tiene sentido (no hay "limite" a un ingreso).
  const categoria = await prisma.category.findFirst({
    where: { id: categoryId, userId: user.id, kind: "EXPENSE" },
    select: { id: true },
  });

  if (!categoria) {
    return { errors: { form: "Esa categoria no existe" }, values };
  }

  // Un presupuesto por categoria (categoryId es unique en el schema): crear
  // o actualizar es la misma operacion.
  await prisma.budget.upsert({
    where: { categoryId },
    create: { categoryId, userId: user.id, monthlyLimitCents },
    update: { monthlyLimitCents },
  });

  revalidatePath("/presupuestos");
  revalidatePath("/dashboard");
  redirect("/presupuestos");
}

export async function borrarPresupuesto(formData: FormData): Promise<void> {
  const user = await requireUser();
  const categoryId = String(formData.get("categoryId") ?? "");

  await prisma.budget.deleteMany({ where: { categoryId, userId: user.id } });

  revalidatePath("/presupuestos");
  revalidatePath("/dashboard");
}
