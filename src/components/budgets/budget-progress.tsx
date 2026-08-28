import { UMBRAL_ALERTA_PRESUPUESTO } from "@/lib/recommendations";

export function BudgetProgress({
  spentCents,
  limitCents,
}: {
  spentCents: number;
  limitCents: number;
}) {
  const ratio = limitCents > 0 ? spentCents / limitCents : 0;
  const ancho = Math.min(ratio, 1) * 100;

  const color =
    ratio >= 1 ? "bg-negative" : ratio >= UMBRAL_ALERTA_PRESUPUESTO ? "bg-warning" : "bg-brand";

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-background"
    >
      <div
        className={`h-full rounded-full transition-[width] ${color}`}
        style={{ width: `${ancho}%` }}
      />
    </div>
  );
}
