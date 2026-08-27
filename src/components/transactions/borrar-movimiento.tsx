"use client";

import { Trash2 } from "lucide-react";

import { borrarMovimiento } from "@/lib/actions/transactions";

export function BorrarMovimiento({
  id,
  descripcion,
}: {
  id: string;
  descripcion: string;
}) {
  return (
    <form
      action={borrarMovimiento}
      onSubmit={(event) => {
        if (!confirm(`Borrar "${descripcion}"?`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        title="Borrar"
        aria-label={`Borrar ${descripcion}`}
        className="rounded-md p-1.5 text-muted transition hover:bg-negative/10 hover:text-negative"
      >
        <Trash2 className="size-4" />
      </button>
    </form>
  );
}
