import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { sincronizarCasilla } from "@/lib/sincronizar-gmail";

// Puede tardar: una llamada a Gemini por mensaje nuevo.
export const maxDuration = 60;

/**
 * Corre la sincronizacion de todas las casillas conectadas. Lo llama el cron
 * de Vercel (ver vercel.json).
 *
 * Protegido con CRON_SECRET: Vercel manda ese valor en el header
 * Authorization, asi que la ruta es publica pero nadie de afuera puede
 * dispararla (evita que alguien queme la cuota gratis de Gemini a pedidos).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const conexiones = await prisma.gmailConnection.findMany({ select: { userId: true } });

  let detectados = 0;
  for (const conexion of conexiones) {
    const resultado = await sincronizarCasilla(conexion.userId);
    if (resultado.ok) detectados += resultado.detectados;
  }

  return NextResponse.json({ casillas: conexiones.length, detectados });
}
