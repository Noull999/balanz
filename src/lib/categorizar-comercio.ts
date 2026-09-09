// Sugerencia de categoria por nombre de comercio: 100% matematica pura (busca
// texto conocido dentro de la descripcion), sin IA. Existia una version debil
// de esto (sugerirCategoria en cartola.ts) que solo comparaba la descripcion
// contra el NOMBRE de la categoria - inutil para algo como "COMPRA UNIMARC
// HIPERMERCADO", que no menciona "Supermercado" en ningun lado.
//
// El orden de PATRONES importa: los mas especificos van primero (Delivery
// antes que Transporte) para que "UBER EATS" no matchee "UBER" de Transporte
// antes de llegar al patron correcto - se corta en el primer match.

export type CategoriaDisponible = { id: string; name: string; kind: "INCOME" | "EXPENSE" };

const PATRONES: { categoria: string; patrones: string[] }[] = [
  {
    categoria: "Delivery",
    patrones: ["UBER EATS", "UBER  EATS", "PEDIDOSYA", "PEDIDOS YA", "RAPPI", "CORNERSHOP"],
  },
  {
    categoria: "Transporte",
    patrones: ["UBER", "CABIFY", "DIDI", "PAYU UBER", "RED MOVILIDAD", "METRO DE SANTIAGO", "REDBUS", "BIP!", " BIP "],
  },
  {
    categoria: "Supermercado",
    patrones: ["UNIMARC", "JUMBO", "LIDER", "SANTA ISABEL", "TOTTUS", "ACUENTA", "ALVI", "SUPERMERCADO", "OK MARKET"],
  },
  {
    categoria: "Comida",
    patrones: ["ALIMENTOS EXPRESS", "DOMINO", "MCDONALDS", "BURGER KING", "KFC", "TELEPIZZA"],
  },
  {
    categoria: "Suscripciones",
    patrones: [
      "NETFLIX",
      "SPOTIFY",
      "GOOGLE ONE",
      "GOOGLE PLAY",
      "ANTHROPIC",
      "CLAUDE",
      "DISNEY",
      "HBO",
      "YOUTUBE PREMIUM",
      "AMAZON PRIME",
      "SMART FIT",
      "GIMNASIO",
      "ICLOUD",
      "APPLE.COM",
      "OPENAI",
      "CHATGPT",
    ],
  },
  {
    categoria: "Salud",
    patrones: ["FARMACIA", "CRUZ VERDE", "SALCOBRAND", "AHUMADA", "CLINICA", "CONSULTA MEDICA"],
  },
  {
    categoria: "Alquiler",
    patrones: ["ARRIENDO", "ALQUILER"],
  },
  {
    categoria: "Servicios",
    patrones: ["MOVISTAR", "ENTEL", " WOM ", "WOM CHILE", "VTR", "CGE", "CHILQUINTA", "AGUAS ANDINAS", "ESSBIO", "GASCO", "METROGAS"],
  },
];

const MARCAS_DIACRITICAS = /[̀-ͯ]/g;

/** Mayusculas y sin tildes, para que "Optica" (con o sin tilde) matchee igual. */
function normalizar(texto: string): string {
  return texto.toUpperCase().normalize("NFD").replace(MARCAS_DIACRITICAS, "");
}

/**
 * Busca un comercio conocido en la descripcion. Solo devuelve una categoria
 * si el usuario la tiene creada (no inventa "Transporte" si borro esa
 * categoria); si no hay match conocido, devuelve null en vez de adivinar.
 */
export function sugerirCategoriaPorComercio(
  descripcion: string,
  categorias: CategoriaDisponible[],
): string | null {
  const texto = normalizar(descripcion);

  for (const { categoria, patrones } of PATRONES) {
    if (!patrones.some((p) => texto.includes(normalizar(p)))) continue;

    const match = categorias.find((c) => c.kind === "EXPENSE" && normalizar(c.name) === normalizar(categoria));
    if (match) return match.id;
  }

  return null;
}
