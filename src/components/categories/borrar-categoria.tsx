"use client";

import { Trash2 } from "lucide-react";

import { borrarCategoria } from "@/lib/actions/categories";

export function BorrarCategoria({ id, nombre }: { id: string; nombre: string }) {
  return (
    <form
      action={borrarCategoria}
      onSubmit={(event) => {
        if (
          !confirm(
            `Borrar "${nombre}"? Los movimientos que ya la usan quedan sin categoria.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        title="Borrar"
        aria-label={`Borrar ${nombre}`}
        className="rounded-md p-1.5 text-muted transition hover:bg-negative/10 hover:text-negative"
      >
        <Trash2 className="size-4" />
      </button>
    </form>
  );
}
