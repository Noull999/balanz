import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoriaForm } from "@/components/categories/categoria-form";
import { actualizarCategoria } from "@/lib/actions/categories";
import { requireUser } from "@/lib/auth";
import { esIconoValido } from "@/lib/category-icons";

import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Editar categoria" };

export default async function EditarCategoriaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const categoria = await prisma.category.findFirst({
    // El userId en el where evita editar la categoria de otra cuenta
    // mandando su id en la URL.
    where: { id, userId: user.id },
    select: { id: true, name: true, kind: true, color: true, icon: true },
  });

  if (!categoria) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">Editar categoria</h1>
      <div className="mt-6 rounded-xl border border-border bg-surface p-6">
        <CategoriaForm
          action={actualizarCategoria.bind(null, categoria.id)}
          submitLabel="Guardar cambios"
          inicial={{
            name: categoria.name,
            kind: categoria.kind,
            color: categoria.color,
            icon: esIconoValido(categoria.icon) ? categoria.icon : "Wallet",
          }}
        />
      </div>
    </div>
  );
}
