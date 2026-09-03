"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { todayInput, toUtcDay } from "@/lib/date";
import { extraerMovimiento } from "@/lib/extraccion";
import { prisma } from "@/lib/prisma";

export type ResultadoAnalisis = { ok: true; confidence: number } | { ok: false; error: string };

/**
 * Analiza el texto de un aviso bancario y lo deja como movimiento PENDIENTE
 * (no como movimiento real: eso pasa recien cuando el usuario lo confirma).
 *
 * `externalId` es el id del mensaje de origen cuando viene del cron de Gmail;
 * al pegar un texto a mano no hay, y se guarda null. La constraint
 * @@unique([userId, externalId]) del schema es la que evita que el mismo mail
 * entre dos veces si el cron vuelve a pasar por el mismo periodo.
 */
export async function analizarTexto(texto: string, externalId?: string): Promise<ResultadoAnalisis> {
  const user = await requireUser();

  if (externalId) {
    const yaExiste = await prisma.pendingTransaction.findFirst({
      where: { userId: user.id, externalId },
      select: { id: true },
    });
    if (yaExiste) {
      return { ok: false, error: "Ese aviso ya lo habias importado." };
    }
  }

  const categorias = await prisma.category.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, kind: true },
  });

  const hoy = toUtcDay(todayInput());
  const resultado = await extraerMovimiento(texto, categorias, hoy);
  if (!resultado.ok) return resultado;

  const { movimiento } = resultado;

  await prisma.pendingTransaction.create({
    data: {
      userId: user.id,
      amountCents: movimiento.amountCents,
      type: movimiento.type,
      description: movimiento.description,
      date: toUtcDay(movimiento.date),
      suggestedCategoryId: movimiento.suggestedCategoryId,
      confidence: movimiento.confidence,
      rawSource: texto.trim().slice(0, 4000),
      externalId: externalId ?? null,
    },
  });

  revalidatePath("/movimientos");
  return { ok: true, confidence: movimiento.confidence };
}

/**
 * Confirma un pendiente: crea el movimiento real y borra el pendiente, en una
 * sola transaccion para que no pueda quedar duplicado ni perdido a la mitad.
 * La categoria llega del form (el usuario pudo cambiar la que sugirio la IA).
 */
export async function confirmarPendiente(formData: FormData): Promise<void> {
  const user = await requireUser();

  const pendingId = String(formData.get("pendingId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");

  const pendiente = await prisma.pendingTransaction.findFirst({
    where: { id: pendingId, userId: user.id },
  });
  if (!pendiente) return;

  // Sin categoria valida del usuario se guarda sin categoria (el modelo lo
  // permite) en vez de rechazar el movimiento entero.
  const categoria = categoryId
    ? await prisma.category.findFirst({
        where: { id: categoryId, userId: user.id, kind: pendiente.type },
        select: { id: true },
      })
    : null;

  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId: user.id,
        categoryId: categoria?.id ?? null,
        amountCents: pendiente.amountCents,
        type: pendiente.type,
        description: pendiente.description,
        date: pendiente.date,
      },
    }),
    prisma.pendingTransaction.delete({ where: { id: pendiente.id } }),
  ]);

  revalidatePath("/movimientos");
  revalidatePath("/dashboard");
}

export async function descartarPendiente(formData: FormData): Promise<void> {
  const user = await requireUser();
  const pendingId = String(formData.get("pendingId") ?? "");

  await prisma.pendingTransaction.deleteMany({ where: { id: pendingId, userId: user.id } });

  revalidatePath("/movimientos");
}
