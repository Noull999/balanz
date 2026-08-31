import { Target } from "lucide-react";
import Link from "next/link";

import { formatMoney } from "@/lib/money";

type Fila = { label: string; gastadoCents: number; targetCents: number; tono: "default" | "positive" };

export function PlanSummaryCard({
  esencialTargetCents,
  ocioTargetCents,
  ahorroTargetCents,
  esencialGastadoCents,
  ocioGastadoCents,
  balanceRealCents,
}: {
  esencialTargetCents: number;
  ocioTargetCents: number;
  ahorroTargetCents: number;
  esencialGastadoCents: number;
  ocioGastadoCents: number;
  balanceRealCents: number;
}) {
  const sinPlan = esencialTargetCents + ocioTargetCents + ahorroTargetCents === 0;

  if (sinPlan) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <Target className="mx-auto size-6 text-muted" strokeWidth={1.5} aria-hidden />
        <p className="mt-3 text-sm text-muted">
          Todavia no armaste tu plan de distribucion de ingresos.
        </p>
        <Link href="/plan" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
          Armar mi plan
        </Link>
      </div>
    );
  }

  const filas: Fila[] = [
    { label: "Esencial", gastadoCents: esencialGastadoCents, targetCents: esencialTargetCents, tono: "default" },
    { label: "Ocio", gastadoCents: ocioGastadoCents, targetCents: ocioTargetCents, tono: "default" },
    { label: "Ahorro", gastadoCents: balanceRealCents, targetCents: ahorroTargetCents, tono: "positive" },
  ];

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-medium">
          <Target className="size-4 text-brand" aria-hidden />
          Tu plan de distribucion
        </h2>
        <Link href="/plan" className="text-sm text-brand hover:underline">
          Editar
        </Link>
      </div>

      <div className="mt-4 space-y-4">
        {filas.map((fila) => (
          <FilaPlan key={fila.label} {...fila} />
        ))}
      </div>
    </div>
  );
}

function FilaPlan({ label, gastadoCents, targetCents, tono }: Fila) {
  const ratio = targetCents > 0 ? gastadoCents / targetCents : 0;
  const color = tono === "positive" ? "bg-positive" : ratio >= 1 ? "bg-negative" : ratio >= 0.8 ? "bg-warning" : "bg-brand";

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted">
          {formatMoney(gastadoCents)} <span className="text-xs">/ {formatMoney(targetCents)}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-background">
        <div className={`h-full rounded-full transition-[width] ${color}`} style={{ width: `${Math.min(Math.max(ratio, 0), 1) * 100}%` }} />
      </div>
    </div>
  );
}
