import { ArrowLeftRight, Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BorrarMovimiento } from "@/components/transactions/borrar-movimiento";
import { requireUser } from "@/lib/auth";
import { formatDay } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Movimientos" };

export default async function MovimientosPage() {
  const user = await requireUser();

  const movimientos = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      description: true,
      amountCents: true,
      type: true,
      date: true,
      category: { select: { name: true, color: true } },
    },
  });

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Movimientos</h1>
          <p className="mt-1 text-sm text-muted">
            {movimientos.length === 0
              ? "Todavia no cargaste nada."
              : movimientos.length === 1
                ? "1 movimiento cargado."
                : `${movimientos.length} movimientos cargados.`}
          </p>
        </div>

        <Link
          href="/movimientos/nuevo"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-strong"
        >
          <Plus className="size-4" />
          Nuevo
        </Link>
      </div>

      {movimientos.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <ArrowLeftRight
            className="mx-auto size-8 text-muted"
            strokeWidth={1.5}
            aria-hidden
          />
          <p className="mt-4 font-medium">Cargá tu primer movimiento</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Con unas semanas de datos Balanz empieza a encontrar patrones y a
            avisarte lo que no ves.
          </p>
          <Link
            href="/movimientos/nuevo"
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-strong"
          >
            <Plus className="size-4" />
            Nuevo movimiento
          </Link>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {movimientos.map((movimiento) => {
            const esIngreso = movimiento.type === "INCOME";

            return (
              <li
                key={movimiento.id}
                className="flex items-center gap-4 px-4 py-3"
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: movimiento.category?.color ?? "#64748b" }}
                  aria-hidden
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{movimiento.description}</p>
                  <p className="text-sm text-muted">
                    {movimiento.category?.name ?? "Sin categoria"} ·{" "}
                    {formatDay(movimiento.date)}
                  </p>
                </div>

                <span
                  className={`shrink-0 font-medium tabular-nums ${
                    esIngreso ? "text-positive" : ""
                  }`}
                >
                  {esIngreso ? "+" : "−"}
                  {formatMoney(movimiento.amountCents)}
                </span>

                <div className="flex shrink-0 items-center gap-0.5">
                  <Link
                    href={`/movimientos/${movimiento.id}`}
                    title="Editar"
                    aria-label={`Editar ${movimiento.description}`}
                    className="rounded-md p-1.5 text-muted transition hover:bg-background hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </Link>
                  <BorrarMovimiento
                    id={movimiento.id}
                    descripcion={movimiento.description}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
