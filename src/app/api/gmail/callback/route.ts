import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { canjearCodigo, emailDeLaCuenta, urlBase } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";

import { COOKIE_STATE } from "../connect/route";

/** Vuelta de la pantalla de consentimiento de Google. */
export async function GET(request: NextRequest) {
  const destino = `${urlBase()}/movimientos`;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(`${urlBase()}/login`);
  }

  const params = request.nextUrl.searchParams;
  const store = await cookies();
  const stateGuardado = store.get(COOKIE_STATE)?.value;
  store.delete(COOKIE_STATE);

  // El usuario apreto "Cancelar" en la pantalla de Google.
  if (params.get("error")) {
    return NextResponse.redirect(`${destino}?gmail=cancelado`);
  }

  const code = params.get("code");
  const state = params.get("state");

  if (!code || !state || !stateGuardado || state !== stateGuardado) {
    return NextResponse.redirect(`${destino}?gmail=error`);
  }

  const canje = await canjearCodigo(code);
  if (!canje.ok) {
    return NextResponse.redirect(`${destino}?gmail=error`);
  }

  const email = await emailDeLaCuenta(canje.accessToken);

  await prisma.gmailConnection.upsert({
    where: { userId: user.id },
    create: { userId: user.id, refreshToken: canje.refreshToken, email },
    update: { refreshToken: canje.refreshToken, email },
  });

  return NextResponse.redirect(`${destino}?gmail=conectado`);
}
