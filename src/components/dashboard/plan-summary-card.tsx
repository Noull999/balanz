import { Target } from "lucide-react";
import Link from "next/link";

import { formatMoney } from "@/lib/money";

type Columna = { label: string; gastadoCents: number; targetCents: number; tono: "default" | "positive" };

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
      <div className="rounded-xl border border-dashed border-border p-4 text-center">
        <p className="text-sm text-muted">
          Todavia no armaste tu plan de distribucion.{" "}
          <Link href="/plan" className="font-medium text-brand hover:underline">
            Armarlo
          </Link>
        </p>
      </div>
    );
  }

  const columnas: Columna[] = [
    { label: "Esencial", gastadoCents: esencialGastadoCents, targetCents: esencialTargetCents, tono: "default" },
    { label: "Ocio", gastadoCents: ocioGastadoCents, targetCents: ocioTargetCents, tono: "default" },
    { label: "Ahorro", gastadoCents: balanceRealCents, targetCents: ahorroTargetCents, tono: "positive" },
  ];

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <Target className="size-3.5 text-brand" aria-hidden />
          Tu plan de distribucion
        </h2>
        <Link href="/plan" className="text-xs text-brand hover:underline">
          Editar
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        {columnas.map((columna) => (
          <ColumnaPlan key={columna.label} {...columna} />
        ))}
      </div>
    </div>
  );
}

function ColumnaPlan({ label, gastadoCents, targetCents, tono }: Columna) {
  const ratio = targetCents > 0 ? gastadoCents / targetCents : 0;
  const color = tono === "positive" ? "bg-positive" : ratio >= 1 ? "bg-negative" : ratio >= 0.8 ? "bg-warning" : "bg-brand";

  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-muted">{label}</p>
      <p className="truncate text-sm font-medium tabular-nums">
        {formatMoney(gastadoCents)} <span className="text-xs font-normal text-muted">/ {formatMoney(targetCents)}</span>
      </p>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-background">
        <div className={`h-full rounded-full transition-[width] ${color}`} style={{ width: `${Math.min(Math.max(ratio, 0), 1) * 100}%` }} />
      </div>
    </div>
  );
}
