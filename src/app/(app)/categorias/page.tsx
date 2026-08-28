import { Pencil, Plus, Tags } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BorrarCategoria } from "@/components/categories/borrar-categoria";
import { CategoryIcon } from "@/components/categories/category-icon";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Categorias" };

export default async function CategoriasPage() {
  const user = await requireUser();

  const categorias = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, kind: true, color: true, icon: true },
  });

  const gastos = categorias.filter((c) => c.kind === "EXPENSE");
  const ingresos = categorias.filter((c) => c.kind === "INCOME");

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
          <p className="mt-1 text-sm text-muted">
            Como agrupas tus movimientos. Las usa el motor de recomendaciones
            para saber donde comparar.
          </p>
        </div>

        <Link
          href="/categorias/nueva"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-strong"
        >
          <Plus className="size-4" />
          Nueva
        </Link>
      </div>

      {categorias.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <Tags className="mx-auto size-8 text-muted" strokeWidth={1.5} aria-hidden />
          <p className="mt-4 font-medium">No tenes categorias todavia</p>
          <Link
            href="/categorias/nueva"
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-strong"
          >
            <Plus className="size-4" />
            Nueva categoria
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <CategoriaGrupo titulo="Gastos" categorias={gastos} />
          <CategoriaGrupo titulo="Ingresos" categorias={ingresos} />
        </div>
      )}
    </>
  );
}

function CategoriaGrupo({
  titulo,
  categorias,
}: {
  titulo: string;
  categorias: {
    id: string;
    name: string;
    color: string;
    icon: string;
  }[];
}) {
  return (
    <div className="rounded-xl border border-border bg-surface">
      <p className="border-b border-border px-4 py-3 text-sm font-medium">
        {titulo}
      </p>
      {categorias.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">Sin categorias de este tipo.</p>
      ) : (
        <ul className="divide-y divide-border">
          {categorias.map((categoria) => (
            <li key={categoria.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${categoria.color}1a`, color: categoria.color }}
              >
                <CategoryIcon name={categoria.icon} className="size-4" />
              </span>

              <span className="flex-1 truncate text-sm">{categoria.name}</span>

              <div className="flex shrink-0 items-center gap-0.5">
                <Link
                  href={`/categorias/${categoria.id}`}
                  title="Editar"
                  aria-label={`Editar ${categoria.name}`}
                  className="rounded-md p-1.5 text-muted transition hover:bg-background hover:text-foreground"
                >
                  <Pencil className="size-4" />
                </Link>
                <BorrarCategoria id={categoria.id} nombre={categoria.name} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
