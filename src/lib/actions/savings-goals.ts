"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { toUtcDay } from "@/lib/date";
import { inputToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { metaAhorroSchema } from "@/lib/validation";

import type { FormState } from "@/lib/actions/auth";

/** Crea una meta nueva, o edita nombre/monto/fecha de una existente si llega goalId. */
export async function guardarMeta(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const values = {
    name: String(formData.get("name") ?? ""),
    targetAmount: String(formData.get("targetAmount") ?? ""),
    targetDate: String(formData.get("targetDate") ?? ""),
  };
  const goalId = formData.get("goalId");

  const parsed = metaAhorroSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])), values };
  }

  const targetCents = inputToCents(parsed.data.targetAmount);
  if (targetCents === null) {
    return { errors: { targetAmount: "Ese monto no es un numero" }, values };
  }
  if (targetCents <= 0) {
    return { errors: { targetAmount: "El monto tiene que ser mayor a cero" }, values };
  }

  const data = {
    name: parsed.data.name,
    targetCents,
    targetDate: parsed.data.targetDate ? toUtcDay(parsed.data.targetDate) : null,
  };

  if (typeof goalId === "string" && goalId) {
    const existente = await prisma.savingsGoal.findFirst({ where: { id: goalId, userId: user.id }, select: { id: true } });
    if (!existente) {
      return { errors: { form: "Esa meta no existe" }, values };
    }
    await prisma.savingsGoal.update({ where: { id: goalId }, data });
  } else {
    await prisma.savingsGoal.create({ data: { ...data, userId: user.id } });
  }

  revalidatePath("/plan");
  return null;
}

export async function eliminarMeta(formData: FormData): Promise<void> {
  const user = await requireUser();
  const goalId = String(formData.get("goalId") ?? "");

  await prisma.savingsGoal.deleteMany({ where: { id: goalId, userId: user.id } });

  revalidatePath("/plan");
}
