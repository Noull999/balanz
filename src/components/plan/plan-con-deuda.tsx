"use client";

import { useState } from "react";

import { DebtCard } from "@/components/plan/debt-card";
import { PlanDistribucionForm } from "@/components/plan/plan-distribucion-form";
import { inputToCents } from "@/lib/money";
import type { CategoriaPlan } from "@/lib/plan-distribucion";

type CategoriaInicial = CategoriaPlan & { color: string; icon: string };
type DeudaActual = { name: string; originalCents: number; remainingCents: number } | null;
type CategoriaGasto = { id: string; name: string };

/**
 * Conecta DebtCard y PlanDistribucionForm: lo que se planea pagar de deuda
 * este mes vive aca (no en ninguno de los dos hijos) para que el reparto
 * esencial/ocio/ahorro lo descuente del ingreso antes de calcularse.
 */
export function PlanConDeuda({
  deuda,
  categoriasGasto,
  categoriasPlan,
  ingresoInicialCents,
}: {
  deuda: DeudaActual;
  categoriasGasto: CategoriaGasto[];
  categoriasPlan: CategoriaInicial[];
  ingresoInicialCents: number;
}) {
  const [montoDeuda, setMontoDeuda] = useState("");
  const descuentoDeudaCents = deuda ? (inputToCents(montoDeuda) ?? 0) : 0;

  return (
    <div className="space-y-6">
      <DebtCard
        deuda={deuda}
        categorias={categoriasGasto}
        montoDestinado={montoDeuda}
        onMontoDestinadoChange={setMontoDeuda}
      />
      <PlanDistribucionForm
        categoriasIniciales={categoriasPlan}
        ingresoInicialCents={ingresoInicialCents}
        descuentoDeudaCents={descuentoDeudaCents}
      />
    </div>
  );
}
