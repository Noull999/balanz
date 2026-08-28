import type { GastoDiario } from "@/lib/insights";
import { formatMoney } from "@/lib/money";

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

export function SpendingCalendar({
  dias,
  presupuestoDiarioCents,
  hoy,
}: {
  dias: GastoDiario[];
  presupuestoDiarioCents: number;
  hoy: Date;
}) {
  if (dias.length === 0) return null;

  const primerDiaSemana = dias[0].date.getUTCDay(); // 0 = domingo
  const blancosIniciales = (primerDiaSemana + 6) % 7; // lunes primero

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {DIAS_SEMANA.map((letra, i) => (
          <span key={i}>{letra}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: blancosIniciales }).map((_, i) => (
          <div key={`blanco-${i}`} />
        ))}

        {dias.map((dia) => {
          const esFuturo = dia.date > hoy;
          const sinPresupuesto = presupuestoDiarioCents <= 0;
          const ratio = sinPresupuesto ? 0 : dia.amountCents / presupuestoDiarioCents;

          let clase = "";
          if (!esFuturo && !sinPresupuesto && dia.amountCents > 0) {
            if (ratio <= 1) clase = "bg-positive/15 text-positive";
            else if (ratio <= 1.5) clase = "bg-warning/15 text-warning";
            else clase = "bg-negative/15 text-negative";
          }

          return (
            <div
              key={dia.day}
              title={
                esFuturo
                  ? undefined
                  : `Dia ${dia.day}: ${formatMoney(dia.amountCents)}${
                      sinPresupuesto ? "" : ` de ${formatMoney(presupuestoDiarioCents)} de ritmo diario`
                    }`
              }
              className={`flex aspect-square items-center justify-center rounded-md text-xs tabular-nums ${
                esFuturo ? "text-muted/50" : clase
              }`}
            >
              {dia.day}
            </div>
          );
        })}
      </div>

      {presupuestoDiarioCents > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
          <Leyenda clase="bg-positive" texto="Dentro del ritmo" />
          <Leyenda clase="bg-warning" texto="Un poco arriba" />
          <Leyenda clase="bg-negative" texto="Bastante arriba" />
        </div>
      )}
    </div>
  );
}

function Leyenda({ clase, texto }: { clase: string; texto: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${clase}`} />
      {texto}
    </span>
  );
}
