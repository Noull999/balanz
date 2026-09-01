"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { esIconoValido } from "@/lib/category-icons";
import { prisma } from "@/lib/prisma";
import { categoriaSchema, fieldErrors } from "@/lib/validation";

import type { FormState } from "@/lib/actions/auth";

function parseCategoria(formData: FormData) {
  const values = {
    name: String(formData.get("name") ?? ""),
    kind: String(formData.get("kind") ?? ""),
    color: String(formData.get("color") ?? ""),
    icon: String(formData.get("icon") ?? ""),
  };

  const parsed = categoriaSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false as const, state: { errors: fieldErrors(parsed.error), values } };
  }

  if (!esIconoValido(parsed.data.icon)) {
    return {
      ok: false as const,
      state: { errors: { icon: "Ese icono no existe" }, values },
    };
  }

  return { ok: true as const, data: parsed.data };
}

export async function crearCategoria(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseCategoria(formData);

  if (!parsed.ok) return parsed.state;

  const yaExiste = await prisma.category.findFirst({
    where: { userId: user.id, name: parsed.data.name, kind: parsed.data.kind },
    select: { id: true },
  });

  if (yaExiste) {
    return {
      errors: { name: "Ya tienes una categoria con ese nombre y tipo" },
      values: formDataToValues(formData),
    };
  }

  await prisma.category.create({ data: { ...parsed.data, userId: user.id } });

  revalidatePath("/categorias");
  revalidatePath("/presupuestos");
  revalidatePath("/plan");
  redirect("/categorias");
}

export async function actualizarCategoria(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseCategoria(formData);

  if (!parsed.ok) return parsed.state;

  const yaExiste = await prisma.category.findFirst({
    where: {
      userId: user.id,
      name: parsed.data.name,
      kind: parsed.data.kind,
      id: { not: id },
    },
    select: { id: true },
  });

  if (yaExiste) {
    return {
      errors: { name: "Ya tienes otra categoria con ese nombre y tipo" },
      values: formDataToValues(formData),
    };
  }

  // El where incluye userId para que no se pueda editar la categoria de otro
  // mandando un id que no es propio.
  const { count } = await prisma.category.updateMany({
    where: { id, userId: user.id },
    data: parsed.data,
  });

  if (count === 0) {
    return { errors: { form: "Esa categoria ya no existe" } };
  }

  revalidatePath("/categorias");
  revalidatePath("/presupuestos");
  revalidatePath("/plan");
  redirect("/categorias");
}

export async function borrarCategoria(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  // No se borra en cascada: los movimientos que ya la usaban quedan en pie
  // con category null (la relacion es onDelete: SetNull), asi no se pierde
  // el historial de gastos por borrar una categoria. El presupuesto de la
  // categoria si se borra en cascada (Budget.categoryId), por eso hay que
  // avisarle tambien a Presupuestos y Plan.
  await prisma.category.deleteMany({ where: { id, userId: user.id } });

  revalidatePath("/categorias");
  revalidatePath("/movimientos");
  revalidatePath("/presupuestos");
  revalidatePath("/plan");
  revalidatePath("/dashboard");
}

function formDataToValues(formData: FormData): Record<string, string> {
  return {
    name: String(formData.get("name") ?? ""),
    kind: String(formData.get("kind") ?? ""),
    color: String(formData.get("color") ?? ""),
    icon: String(formData.get("icon") ?? ""),
  };
}
