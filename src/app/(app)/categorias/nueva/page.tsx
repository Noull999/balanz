import type { Metadata } from "next";

import { CategoriaForm } from "@/components/categories/categoria-form";
import { crearCategoria } from "@/lib/actions/categories";

export const metadata: Metadata = { title: "Nueva categoria" };

export default function NuevaCategoriaPage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">Nueva categoria</h1>
      <div className="mt-6 rounded-xl border border-border bg-surface p-6">
        <CategoriaForm action={crearCategoria} submitLabel="Guardar" />
      </div>
    </div>
  );
}
