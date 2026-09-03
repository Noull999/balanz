// Nucleo de la sincronizacion, sin "use server": lo comparten el boton manual
// (actions/gmail.ts) y el cron (/api/cron/gmail), asi que vive aparte para no
// duplicar la logica ni exponer como server action algo que el cron llama
// directo.

import { todayInput, toUtcDay } from "@/lib/date";
import { extraerMovimiento } from "@/lib/extraccion";
import { armarQuery, buscarMensajes, obtenerAccessToken } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";

export type ResultadoSync =
  | { ok: true; revisados: number; detectados: number }
  | { ok: false; error: string };

export async function sincronizarCasilla(userId: string): Promise<ResultadoSync> {
  const conexion = await prisma.gmailConnection.findUnique({ where: { userId } });
  if (!conexion) {
    return { ok: false, error: "Todavia no conectaste tu casilla." };
  }

  const token = await obtenerAccessToken(conexion.refreshToken);
  if (!token.ok) return token;

  const mensajes = await buscarMensajes(token.accessToken, armarQuery(conexion.lastSyncAt));
  if (mensajes.length === 0) {
    await prisma.gmailConnection.update({ where: { userId }, data: { lastSyncAt: new Date() } });
    return { ok: true, revisados: 0, detectados: 0 };
  }

  // Los ya vistos se filtran ANTES de llamar a la IA: cada extraccion cuesta
  // una llamada a Gemini, y el cron vuelve a pasar por los mismos mensajes
  // seguido (Gmail filtra por dia, no por hora).
  const conocidos = await prisma.pendingTransaction.findMany({
    where: { userId, externalId: { in: mensajes.map((m) => m.id) } },
    select: { externalId: true },
  });
  const yaVistos = new Set(conocidos.map((c) => c.externalId));

  const nuevos = mensajes.filter((m) => !yaVistos.has(m.id));

  const categorias = await prisma.category.findMany({
    where: { userId },
    select: { id: true, name: true, kind: true },
  });

  const hoy = toUtcDay(todayInput());
  let detectados = 0;

  for (const mensaje of nuevos) {
    const resultado = await extraerMovimiento(mensaje.texto, categorias, hoy);
    // Un mensaje que no es un movimiento (publicidad, aviso de seguridad) no
    // es un error: se saltea y se sigue con el resto.
    if (!resultado.ok) continue;

    const { movimiento } = resultado;

    try {
      await prisma.pendingTransaction.create({
        data: {
          userId,
          amountCents: movimiento.amountCents,
          type: movimiento.type,
          description: movimiento.description,
          date: toUtcDay(movimiento.date),
          suggestedCategoryId: movimiento.suggestedCategoryId,
          confidence: movimiento.confidence,
          rawSource: mensaje.texto.slice(0, 4000),
          externalId: mensaje.id,
        },
      });
      detectados++;
    } catch {
      // Choque contra @@unique([userId, externalId]): otra corrida lo metio en
      // el medio. Es exactamente lo que esa constraint tiene que evitar.
    }
  }

  await prisma.gmailConnection.update({ where: { userId }, data: { lastSyncAt: new Date() } });

  return { ok: true, revisados: nuevos.length, detectados };
}
