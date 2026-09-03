// Puntaje resumen de "como viene el mes", combinando 3 senales que ya se
// calculan por separado en el resto de la app (ahorro real vs. meta del plan,
// presupuestos superados, carga de la deuda sobre el ingreso). 100% matematica
// pura, sin IA - se muestra como un badge chico al lado del saludo del
// dashboard, no como una card nueva.

export type NivelSalud = "bien" | "regular" | "mal";

export type SaludFinanciera = {
  puntaje: number;
  nivel: NivelSalud;
  factores: string[];
};

const PUNTOS_AHORRO = 40;
const PUNTOS_PRESUPUESTOS = 35;
const PUNTOS_DEUDA = 25;

function clamp(valor: number, min: number, max: number): number {
  return Math.min(Math.max(valor, min), max);
}

export function calcularSaludFinanciera(params: {
  balanceCents: number;
  ahorroMetaCents: number;
  presupuestosSuperados: number;
  presupuestosTotal: number;
  deudaRemainingCents: number;
  ingresoMensualCents: number;
}): SaludFinanciera {
  const {
    balanceCents,
    ahorroMetaCents,
    presupuestosSuperados,
    presupuestosTotal,
    deudaRemainingCents,
    ingresoMensualCents,
  } = params;

  const factores: string[] = [];

  // Ahorro: cuanto del balance real llega a la meta del plan (0 si esta en rojo).
  const ratioAhorro = ahorroMetaCents > 0 ? balanceCents / ahorroMetaCents : balanceCents >= 0 ? 1 : 0;
  const puntosAhorro = clamp(ratioAhorro, 0, 1) * PUNTOS_AHORRO;
  if (balanceCents < 0) {
    factores.push("Este mes vas en rojo.");
  } else if (ahorroMetaCents > 0) {
    factores.push(`Llevas ahorrado ${Math.round(clamp(ratioAhorro, 0, 1) * 100)}% de tu meta del mes.`);
  }

  // Presupuestos: proporcion de categorias que se mantuvieron dentro del limite.
  const ratioPresupuestos = presupuestosTotal > 0 ? (presupuestosTotal - presupuestosSuperados) / presupuestosTotal : 1;
  const puntosPresupuestos = ratioPresupuestos * PUNTOS_PRESUPUESTOS;
  if (presupuestosTotal > 0 && presupuestosSuperados > 0) {
    factores.push(`Superaste ${presupuestosSuperados} de ${presupuestosTotal} presupuestos.`);
  }

  // Deuda: cuantos meses de ingreso representa el saldo pendiente.
  const mesesDeIngresoEnDeuda = ingresoMensualCents > 0 ? deudaRemainingCents / ingresoMensualCents : 0;
  const puntosDeuda = deudaRemainingCents > 0 ? clamp(PUNTOS_DEUDA - mesesDeIngresoEnDeuda * 4, 0, PUNTOS_DEUDA) : PUNTOS_DEUDA;
  if (deudaRemainingCents > 0 && mesesDeIngresoEnDeuda >= 1) {
    factores.push(`Tu deuda equivale a ${mesesDeIngresoEnDeuda.toFixed(1)} meses de ingreso.`);
  }

  const puntaje = Math.round(puntosAhorro + puntosPresupuestos + puntosDeuda);
  const nivel: NivelSalud = puntaje >= 70 ? "bien" : puntaje >= 40 ? "regular" : "mal";

  return { puntaje, nivel, factores };
}
