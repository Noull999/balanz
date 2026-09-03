import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { credencialesGoogle, urlAutorizacion, urlBase } from "@/lib/gmail";

export const COOKIE_STATE = "balanz_gmail_state";

/**
 * Arranca la autorizacion: manda al usuario a la pantalla de consentimiento de
 * Google. El `state` aleatorio viaja en la URL y tambien en una cookie
 * httpOnly; el callback compara los dos para descartar un pedido que no salio
 * de aca (CSRF).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(`${urlBase()}/login`);
  }

  const credenciales = credencialesGoogle();
  if (!credenciales) {
    return NextResponse.redirect(`${urlBase()}/movimientos?gmail=sin-credenciales`);
  }

  const state = randomBytes(32).toString("base64url");

  (await cookies()).set(COOKIE_STATE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  return NextResponse.redirect(urlAutorizacion(credenciales.clientId, state));
}
