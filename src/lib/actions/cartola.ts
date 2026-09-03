"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { parsearCartola } from "@/lib/cartola";
import { toUtcDay } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export type ResultadoImportacion =
  | { ok: true; leidos: number; nuevos: number; duplicados: number; descartados: number }
  | { ok: false; error: string };

const MAX_TAMANO_BYTES = 5 * 1024 * 1024;

/**
 * Importa una cartola. A diferencia del correo (que solo se compara contra
 * otros correos por su id), la cartola se compara contra los movimientos que
 * YA existen -tanto confirmados como pendientes- porque es justamente la red
 * de seguridad de lo que el correo ya trajo: sin este chequeo, subir la
 * cartola de un mes que ya se cargo por mail duplicaria todo.
 */
export async function importarCartola(formData: FormData): Promise<ResultadoImportacion> {
  const user = await requireUser();

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: "Elige un archivo primero." };
  }
  if (archivo.size > MAX_TAMANO_BYTES) {
    return { ok: false, error: "El archivo es demasiado grande (maximo 5 MB)." };
  }

  const categorias = await prisma.category.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, kind: true },
  });

  const buffer = await archivo.arrayBuffer();
  const resultado = await parsearCartola(buffer, categorias, archivo.name);
  if (!resultado.ok) return resultado;

  const { movimientos } = resultado;
  if (movimientos.length === 0) {
    return { ok: true, leidos: resultado.filasLeidas, nuevos: 0, duplicados: 0, descartados: resultado.filasDescartadas };
  }

  const fechas = movimientos.map((m) => toUtcDay(m.date));
  const desde = new Date(Math.min(...fechas.map((f) => f.getTime())));
  const hasta = new Date(Math.max(...fechas.map((f) => f.getTime())) + 86_400_000);

  const [existentes, pendientesExistentes] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: desde, lt: hasta } },
      select: { date: true, amountCents: true, type: true },
    }),
    prisma.pendingTransaction.findMany({
      where: { userId: user.id, date: { gte: desde, lt: hasta } },
      select: { date: true, amountCents: true, type: true },
    }),
  ]);

  const clave = (d: Date, amountCents: number, type: string) => `${d.getTime()}|${amountCents}|${type}`;
  const yaExisten = new Set([
    ...existentes.map((t) => clave(t.date, t.amountCents, t.type)),
    ...pendientesExistentes.map((t) => clave(t.date, t.amountCents, t.type)),
  ]);

  let nuevos = 0;
  let duplicados = 0;

  for (const movimiento of movimientos) {
    const fecha = toUtcDay(movimiento.date);
    if (yaExisten.has(clave(fecha, movimiento.amountCents, movimiento.type))) {
      duplicados++;
      continue;
    }

    await prisma.pendingTransaction.create({
      data: {
        userId: user.id,
        amountCents: movimiento.amountCents,
        type: movimiento.type,
        description: movimiento.description,
        date: fecha,
        suggestedCategoryId: movimiento.suggestedCategoryId,
        confidence: movimiento.confidence,
        rawSource: `[Cartola: ${archivo.name}]\n${movimiento.filaOriginal}`,
        externalId: null,
      },
    });
    nuevos++;
  }

  revalidatePath("/movimientos");
  return { ok: true, leidos: resultado.filasLeidas, nuevos, duplicados, descartados: resultado.filasDescartadas };
}
