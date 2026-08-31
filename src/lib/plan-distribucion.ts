// Motor de calculo del plan de distribucion de ingresos: 100% matematica pura,
// sin llamar a la IA ni a la base. La IA (ver actions/ai.ts) solo redacta en
// palabras lo que esta funcion ya calculo, igual que con recommendations.ts.

export type Bucket = "ESENCIAL" | "OCIO";

export type Porcentajes = { esencial: number; ocio: number; ahorro: number };

export const PORCENTAJES_DEFECTO: Porcentajes = { esencial: 50, ocio: 30, ahorro: 20 };

/** Palabras que sugieren que una categoria es "para disfrutar" y no una necesidad fija. */
const PALABRAS_OCIO = [
  "ocio",
  "delivery",
  "suscripcion",
  "entreten",
  "salida",
  "bar",
  "restaurant",
  "cine",
  "streaming",
  "viaje",
  "gusto",
  "hobby",
  "juego",
];

/** Heuristica inicial por nombre de categoria. El usuario la puede cambiar a mano en la pantalla. */
export function bucketSugerido(nombreCategoria: string): Bucket {
  const nombre = nombreCategoria.toLowerCase();
  return PALABRAS_OCIO.some((palabra) => nombre.includes(palabra)) ? "OCIO" : "ESENCIAL";
}

export type CategoriaPlan = {
  categoryId: string;
  name: string;
  bucket: Bucket;
  /** Promedio de gasto real de los ultimos meses, para repartir el balde proporcional al habito. */
  promedioCents: number;
};

export type AsignacionCategoria = {
  categoryId: string;
  name: string;
  bucket: Bucket;
  monthlyLimitCents: number;
};

export type PlanDistribucion = {
  incomeCents: number;
  esencialCents: number;
  ocioCents: number;
  ahorroCents: number;
  asignaciones: AsignacionCategoria[];
};

function repartirBalde(categorias: CategoriaPlan[], totalBucketCents: number): AsignacionCategoria[] {
  if (categorias.length === 0) return [];

  const sumaHistorial = categorias.reduce((total, c) => total + c.promedioCents, 0);

  return categorias.map((c) => {
    const proporcion = sumaHistorial > 0 ? c.promedioCents / sumaHistorial : 1 / categorias.length;
    return {
      categoryId: c.categoryId,
      name: c.name,
      bucket: c.bucket,
      monthlyLimitCents: Math.round(totalBucketCents * proporcion),
    };
  });
}

/**
 * Reparte el ingreso en esencial / ocio / ahorro segun `porcentajes`, y dentro
 * de esencial y ocio distribuye entre las categorias de ese balde
 * proporcional a lo que cada una gasto en promedio (o parejo si no hay
 * historial). El ahorro no se asigna a ninguna categoria: es lo que sobra.
 */
export function calcularPlan(
  incomeCents: number,
  categorias: CategoriaPlan[],
  porcentajes: Porcentajes,
): PlanDistribucion {
  const esencialCents = Math.round((incomeCents * porcentajes.esencial) / 100);
  const ocioCents = Math.round((incomeCents * porcentajes.ocio) / 100);
  const ahorroCents = incomeCents - esencialCents - ocioCents;

  const asignaciones = [
    ...repartirBalde(
      categorias.filter((c) => c.bucket === "ESENCIAL"),
      esencialCents,
    ),
    ...repartirBalde(
      categorias.filter((c) => c.bucket === "OCIO"),
      ocioCents,
    ),
  ];

  return { incomeCents, esencialCents, ocioCents, ahorroCents, asignaciones };
}
