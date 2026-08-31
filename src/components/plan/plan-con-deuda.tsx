"use client";

import { useState } from "react";

import { DebtCard } from "@/components/plan/debt-card";
import { PlanDistribucionForm } from "@/components/plan/plan-distribucion-form";
import { guardarConfiguracionPlan } from "@/lib/actions/plan";
import { centsToInput, inputToCents } from "@/lib/money";
import type { Porcentajes } from "@/lib/plan-distribucion";
import type { CategoriaPlan } from "@/lib/plan-distribucion";

type CategoriaInicial = CategoriaPlan & { color: string; icon: string };
type DeudaActual = { name: string; originalCents: number; remainingCents: number } | null;
type CategoriaGasto = { id: string; name: string };

/**
 * Conecta DebtCard y PlanDistribucionForm: lo que se planea pagar de deuda
 * este mes vive aca (no en ninguno de los dos hijos) para que el reparto
 * esencial/ocio/ahorro lo descuente del ingreso antes de calcularse. Tambien
 * es quien persiste esa parte en PlanSettings (el ingreso y los porcentajes
 * los persiste PlanDistribucionForm, que es donde viven esos inputs).
 */
export function PlanConDeuda({
  deuda,
  categoriasGasto,
  categoriasPlan,
  ingresoInicialCents,
  ingresoEsManual,
  porcentajesIniciales,
  montoDeudaInicialCents,
}: {
  deuda: DeudaActual;
  categoriasGasto: CategoriaGasto[];
  categoriasPlan: CategoriaInicial[];
  ingresoInicialCents: number;
  ingresoEsManual: boolean;
  porcentajesIniciales?: Porcentajes;
  montoDeudaInicialCents: number;
}) {
  const [montoDeuda, setMontoDeuda] = useState(
    montoDeudaInicialCents > 0 ? centsToInput(montoDeudaInicialCents) : "",
  );
  const descuentoDeudaCents = deuda ? (inputToCents(montoDeuda) ?? 0) : 0;

  function guardarMontoDeuda() {
    void guardarConfiguracionPlan({ deudaPagoPlaneadoCents: inputToCents(montoDeuda) ?? 0 });
  }

  return (
    <div className="space-y-6">
      <DebtCard
        deuda={deuda}
        categorias={categoriasGasto}
        montoDestinado={montoDeuda}
        onMontoDestinadoChange={setMontoDeuda}
        onMontoDestinadoBlur={guardarMontoDeuda}
      />
      <PlanDistribucionForm
        categoriasIniciales={categoriasPlan}
        ingresoInicialCents={ingresoInicialCents}
        ingresoEsManual={ingresoEsManual}
        porcentajesIniciales={porcentajesIniciales}
        descuentoDeudaCents={descuentoDeudaCents}
      />
    </div>
  );
}
