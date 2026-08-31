"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { toUtcDay, todayInput } from "@/lib/date";
import { inputToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { deudaSchema, pagoDeudaSchema } from "@/lib/validation";

import type { FormState } from "@/lib/actions/auth";

/**
 * Crea la deuda del usuario o edita el monto original de la que ya tiene
 * (una por usuario). Si edita el monto original, el saldo pendiente se
 * ajusta por la diferencia en vez de resetearse, para no perder los pagos
 * que ya habia registrado.
 */
export async function guardarDeuda(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const values = {
    name: String(formData.get("name") ?? ""),
    originalAmount: String(formData.get("originalAmount") ?? ""),
  };

  const parsed = deudaSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])), values };
  }

  const originalCents = inputToCents(parsed.data.originalAmount);
  if (originalCents === null) {
    return { errors: { originalAmount: "Ese monto no es un numero" }, values };
  }
  if (originalCents <= 0) {
    return { errors: { originalAmount: "El monto tiene que ser mayor a cero" }, values };
  }

  const existente = await prisma.debt.findUnique({ where: { userId: user.id } });

  if (existente) {
    const diferencia = originalCents - existente.originalCents;
    await prisma.debt.update({
      where: { userId: user.id },
      data: {
        name: parsed.data.name ?? existente.name,
        originalCents,
        remainingCents: Math.max(0, existente.remainingCents + diferencia),
      },
    });
  } else {
    await prisma.debt.create({
      data: {
        userId: user.id,
        name: parsed.data.name ?? "Deuda",
        originalCents,
        remainingCents: originalCents,
      },
    });
  }

  revalidatePath("/plan");
  return null;
}

export type RegistrarPagoResultado = { ok: true } | { ok: false; error: string };

/**
 * Registra un pago: crea un movimiento real (EXPENSE) en la categoria elegida
 * -asi el pago se ve en movimientos, en el dashboard y en los graficos, no
 * queda invisible- y descuenta el mismo monto del saldo pendiente de la deuda.
 */
export async function registrarPagoDeuda(formData: FormData): Promise<RegistrarPagoResultado> {
  const user = await requireUser();

  const parsed = pagoDeudaSchema.safeParse({
    amount: formData.get("amount"),
    categoryId: formData.get("categoryId"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos invalidos." };
  }

  const amountCents = inputToCents(parsed.data.amount);
  if (amountCents === null || amountCents <= 0) {
    return { ok: false, error: "Ese monto no es valido." };
  }

  const [deuda, categoria] = await Promise.all([
    prisma.debt.findUnique({ where: { userId: user.id } }),
    prisma.category.findFirst({
      where: { id: parsed.data.categoryId, userId: user.id, kind: "EXPENSE" },
      select: { id: true },
    }),
  ]);

  if (!deuda) {
    return { ok: false, error: "Todavia no cargaste una deuda." };
  }
  if (!categoria) {
    return { ok: false, error: "Esa categoria no existe." };
  }

  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId: user.id,
        categoryId: categoria.id,
        amountCents,
        type: "EXPENSE",
        description: `Pago de ${deuda.name}`,
        date: toUtcDay(todayInput()),
      },
    }),
    prisma.debt.update({
      where: { userId: user.id },
      data: { remainingCents: Math.max(0, deuda.remainingCents - amountCents) },
    }),
  ]);

  revalidatePath("/plan");
  revalidatePath("/movimientos");
  revalidatePath("/dashboard");

  return { ok: true };
}
