"use server";

import { redirect } from "next/navigation";

import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";
import { prisma } from "@/lib/prisma";
import { fieldErrors, loginSchema, registroSchema } from "@/lib/validation";

/**
 * React 19 resetea el form cuando termina la action, asi que se pierde lo tipeado.
 * Devolvemos `values` para volver a pintar los campos (nunca la contrasena).
 */
export type FormState = {
  errors: Record<string, string>;
  values?: Record<string, string>;
} | null;

export async function registrar(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };

  const parsed = registroSchema.safeParse({
    ...values,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values };
  }

  const { name, email, password } = parsed.data;

  const yaExiste = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (yaExiste) {
    return { errors: { email: "Ya hay una cuenta con ese email" }, values };
  }

  // La cuenta nace con sus categorias: sin esto la primera pantalla util
  // obligaria a crear categorias antes de poder cargar un solo gasto.
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      categories: { create: DEFAULT_CATEGORIES.map((c) => ({ ...c })) },
    },
    select: { id: true },
  });

  await createSession(user.id);

  // redirect() funciona lanzando una excepcion: tiene que quedar fuera de
  // cualquier try/catch o se la come el catch.
  redirect("/dashboard");
}

export async function ingresar(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = { email: String(formData.get("email") ?? "") };

  const parsed = loginSchema.safeParse({
    ...values,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values };
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  // Mismo mensaje si el mail no existe o si la contrasena esta mal: distinguirlos
  // le confirmaria a un desconocido que ese email tiene cuenta.
  const credencialesInvalidas = {
    errors: { form: "Email o contrasena incorrectos" },
    values,
  };

  if (!user) {
    // Se calcula un hash igual para que la respuesta tarde lo mismo que cuando
    // el usuario si existe, y no se pueda deducir por el tiempo.
    await hashPassword(password);
    return credencialesInvalidas;
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    return credencialesInvalidas;
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function salir(): Promise<void> {
  await destroySession();
  redirect("/login");
}
