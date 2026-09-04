"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { parsearCartola, type MovimientoCartola } from "@/lib/cartola";
import { toUtcDay } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export type ResultadoImportacion =
  | { ok: true; archivos: number; leidos: number; nuevos: number; duplicados: number; descartados: number }
  | { ok: false; error: string };

const MAX_TAMANO_BYTES = 5 * 1024 * 1024;

/**
 * Importa una o mas cartolas a la vez (cta corriente + tarjeta, por ejemplo).
 * A diferencia del correo (que solo se compara contra otros correos por su
 * id), la cartola se compara contra los movimientos que YA existen -tanto
 * confirmados como pendientes, y tambien contra los demas archivos del MISMO
 * envio- porque es justamente la red de seguridad de lo que el correo ya
 * trajo: sin este chequeo, subir la cartola de un mes que ya se cargo por
 * mail (o subir cta corriente + tarjeta con un movimiento que aparece en las
 * dos, como un pago a la tarjeta) duplicaria todo.
 */
export async function importarCartola(formData: FormData): Promise<ResultadoImportacion> {
  const user = await requireUser();

  const archivos = formData.getAll("archivo").filter((a): a is File => a instanceof File && a.size > 0);
  if (archivos.length === 0) {
    return { ok: false, error: "Elige al menos un archivo primero." };
  }
  const demasiadoGrande = archivos.find((a) => a.size > MAX_TAMANO_BYTES);
  if (demasiadoGrande) {
    return { ok: false, error: `"${demasiadoGrande.name}" es demasiado grande (maximo 5 MB).` };
  }

  const categorias = await prisma.category.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, kind: true },
  });

  const porArchivo: { nombre: string; movimientos: MovimientoCartola[] }[] = [];
  let leidos = 0;
  let descartados = 0;

  for (const archivo of archivos) {
    const buffer = await archivo.arrayBuffer();
    const resultado = await parsearCartola(buffer, categorias, archivo.name);
    if (!resultado.ok) {
      return { ok: false, error: archivos.length > 1 ? `"${archivo.name}": ${resultado.error}` : resultado.error };
    }
    porArchivo.push({ nombre: archivo.name, movimientos: resultado.movimientos });
    leidos += resultado.filasLeidas;
    descartados += resultado.filasDescartadas;
  }

  const todos = porArchivo.flatMap(({ nombre, movimientos }) => movimientos.map((m) => ({ ...m, nombreArchivo: nombre })));
  if (todos.length === 0) {
    return { ok: true, archivos: archivos.length, leidos, nuevos: 0, duplicados: 0, descartados };
  }

  const fechas = todos.map((m) => toUtcDay(m.date));
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

  for (const movimiento of todos) {
    const fecha = toUtcDay(movimiento.date);
    const k = clave(fecha, movimiento.amountCents, movimiento.type);
    // Chequea contra la base Y contra lo ya insertado en este mismo envio
    // (ej. si el mismo pago aparece en la cartola de la cuenta y en la de
    // la tarjeta) antes de agregarlo al set, para no duplicar entre archivos.
    if (yaExisten.has(k)) {
      duplicados++;
      continue;
    }
    yaExisten.add(k);

    await prisma.pendingTransaction.create({
      data: {
        userId: user.id,
        amountCents: movimiento.amountCents,
        type: movimiento.type,
        description: movimiento.description,
        date: fecha,
        suggestedCategoryId: movimiento.suggestedCategoryId,
        confidence: movimiento.confidence,
        rawSource: `[Cartola: ${movimiento.nombreArchivo}]\n${movimiento.filaOriginal}`,
        externalId: null,
      },
    });
    nuevos++;
  }

  revalidatePath("/movimientos");
  return { ok: true, archivos: archivos.length, leidos, nuevos, duplicados, descartados };
}
