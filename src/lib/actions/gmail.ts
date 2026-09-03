"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sincronizarCasilla, type ResultadoSync } from "@/lib/sincronizar-gmail";

/** Botón "Buscar ahora" de la bandeja: la misma sincronizacion que corre el cron. */
export async function sincronizarAhora(): Promise<ResultadoSync> {
  const user = await requireUser();
  const resultado = await sincronizarCasilla(user.id);

  revalidatePath("/movimientos");
  return resultado;
}

export async function desconectarGmail(): Promise<void> {
  const user = await requireUser();

  await prisma.gmailConnection.deleteMany({ where: { userId: user.id } });

  revalidatePath("/movimientos");
}
