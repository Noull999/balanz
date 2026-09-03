import type { SaludFinanciera } from "@/lib/salud-financiera";

const ESTILOS: Record<SaludFinanciera["nivel"], { texto: string; clase: string; punto: string }> = {
  bien: { texto: "Salud financiera: bien", clase: "border-positive/30 bg-positive/5 text-positive", punto: "bg-positive" },
  regular: { texto: "Salud financiera: regular", clase: "border-warning/30 bg-warning/5 text-warning", punto: "bg-warning" },
  mal: { texto: "Salud financiera: atencion", clase: "border-negative/30 bg-negative/5 text-negative", punto: "bg-negative" },
};

export function SaludBadge({ salud }: { salud: SaludFinanciera }) {
  const { texto, clase, punto } = ESTILOS[salud.nivel];
  const title = salud.factores.length > 0 ? salud.factores.join(" ") : undefined;

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${clase}`}
    >
      <span className={`size-1.5 rounded-full ${punto}`} aria-hidden />
      {texto} · {salud.puntaje}/100
    </span>
  );
}
