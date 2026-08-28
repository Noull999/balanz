import { AlertTriangle, Info, OctagonAlert } from "lucide-react";

import type { Insight } from "@/lib/recommendations";

const ESTILOS: Record<Insight["severidad"], { icono: typeof Info; clase: string }> = {
  danger: { icono: OctagonAlert, clase: "border-negative/30 bg-negative/5 text-negative" },
  warning: { icono: AlertTriangle, clase: "border-warning/30 bg-warning/5 text-warning" },
  info: { icono: Info, clase: "border-brand/30 bg-brand/5 text-brand" },
};

export function InsightCard({ insight }: { insight: Insight }) {
  const { icono: Icono, clase } = ESTILOS[insight.severidad];

  return (
    <li className={`flex gap-3 rounded-xl border p-4 ${clase}`}>
      <Icono className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="text-foreground">
        <p className="text-sm font-medium">{insight.titulo}</p>
        <p className="mt-0.5 text-sm text-muted">{insight.mensaje}</p>
      </div>
    </li>
  );
}
