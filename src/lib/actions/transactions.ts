"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { toUtcDay } from "@/lib/date";
import { inputToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { fieldErrors, movimientoSchema } from "@/lib/validation";

import type { FormState } from "@/lib/actions/auth";

/**
 * Valida lo que llego del form y ademas comprueba que la categoria sea del
 * usuario y del tipo correcto: sin esto, cualquiera podria mandar el id de una
 * categoria ajena editando el HTML.
 */
async function parseMovimiento(userId: string, formData: FormData) {
  const values = {
    type: String(formData.get("type") ?? ""),
    description: String(formData.get("description") ?? ""),
    date: String(formData.get("date") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
  };

  const parsed = movimientoSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false as const, state: { errors: fieldErrors(parsed.error), values } };
  }

  const amountCents = inputToCents(parsed.data.amount);

  if (amountCents === null) {
    return {
      ok: false as const,
      state: { errors: { amount: "Ese monto no es un numero" }, values },
    };
  }

  if (amountCents <= 0) {
    return {
      ok: false as const,
      state: { errors: { amount: "El monto tiene que ser mayor a cero" }, values },
    };
  }

  const categoria = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, userId },
    select: { id: true, kind: true },
  });

  if (!categoria) {
    return {
      ok: false as const,
      state: { errors: { categoryId: "Esa categoria no existe" }, values },
    };
  }

  if (categoria.kind !== parsed.data.type) {
    return {
      ok: false as const,
      state: {
        errors: { categoryId: "Esa categoria no corresponde al tipo elegido" },
        values,
      },
    };
  }

  return {
    ok: true as const,
    data: {
      amountCents,
      type: parsed.data.type,
      description: parsed.data.description,
      date: toUtcDay(parsed.data.date),
      categoryId: categoria.id,
    },
  };
}

export async function crearMovimiento(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = await parseMovimiento(user.id, formData);

  if (!parsed.ok) return parsed.state;

  await prisma.transaction.create({
    data: { ...parsed.data, userId: user.id },
  });

  revalidatePath("/movimientos");
  revalidatePath("/dashboard");
  redirect("/movimientos");
}

export async function actualizarMovimiento(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = await parseMovimiento(user.id, formData);

  if (!parsed.ok) return parsed.state;

  // El where incluye userId para que no se pueda editar el movimiento de otro
  // mandando un id que no es propio.
  const { count } = await prisma.transaction.updateMany({
    where: { id, userId: user.id },
    data: parsed.data,
  });

  if (count === 0) {
    return { errors: { form: "Ese movimiento ya no existe" } };
  }

  revalidatePath("/movimientos");
  revalidatePath("/dashboard");
  redirect("/movimientos");
}

export async function borrarMovimiento(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  await prisma.transaction.deleteMany({ where: { id, userId: user.id } });

  revalidatePath("/movimientos");
  revalidatePath("/dashboard");
}
