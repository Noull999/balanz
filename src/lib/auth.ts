import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { prisma } from "@/lib/prisma";

const COOKIE = "balanz_session";
const DIAS = 30;

function getSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "Falta AUTH_SECRET. Generalo con: node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\"",
    );
  }

  return new TextEncoder().encode(secret);
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Firma un JWT con el id del usuario y lo guarda en una cookie httpOnly. */
export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${DIAS}d`)
    .sign(getSecret());

  const store = await cookies();

  store.set(COOKIE, token, {
    httpOnly: true, // el JS del browser no puede leerla
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DIAS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/**
 * Usuario de la sesion actual, o null. Va envuelto en `cache` para que aunque
 * lo llamen cinco componentes en el mismo render, la consulta salga una sola vez.
 */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;

    return await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true },
    });
  } catch {
    // Token vencido, manipulado o firmado con otro secreto.
    return null;
  }
});

/** Igual que getCurrentUser pero manda al login si no hay sesion. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
