// Extraccion de un movimiento a partir del texto crudo de un aviso de compra
// del banco.
//
// Es el UNICO lugar de la app donde la IA produce un numero en vez de solo
// redactar numeros ya calculados (ver el comentario de ai/gemini.ts). Se
// permite aca porque el dato no existe en ninguna otra parte: hay que leerlo
// de un texto libre que cada banco escribe distinto. A cambio:
//
//   1. Todo lo que devuelve el modelo se valida de nuevo aca contra reglas
//      duras (monto positivo que entra en la columna, fecha con formato real,
//      categoria que exista de verdad en las del usuario). Si algo no pasa,
//      se descarta o se corrige, no se guarda a ciegas.
//   2. El resultado NO se convierte en un movimiento real: queda en
//      PendingTransaction hasta que el usuario lo confirma en pantalla,
//      con el texto original al lado para contrastar.

import { generarJSON } from "@/lib/ai/gemini";
import { toDateInput } from "@/lib/date";
import { inputToCents } from "@/lib/money";

/** Debajo de esto la pantalla de revision lo marca para mirarlo con mas atencion. */
export const UMBRAL_CONFIANZA_ALTA = 80;

const LARGO_MAXIMO_TEXTO = 4000;

export type CategoriaDisponible = { id: string; name: string; kind: "INCOME" | "EXPENSE" };

export type MovimientoExtraido = {
  amountCents: number;
  type: "INCOME" | "EXPENSE";
  description: string;
  /** "2026-09-03" */
  date: string;
  suggestedCategoryId: string | null;
  confidence: number;
};

export type ResultadoExtraccion =
  | { ok: true; movimiento: MovimientoExtraido }
  | { ok: false; error: string };

const ESQUEMA_EXTRACCION = {
  type: "OBJECT",
  properties: {
    esMovimiento: {
      type: "BOOLEAN",
      description: "true solo si el texto avisa de una transaccion real con un monto concreto",
    },
    tipo: {
      type: "STRING",
      enum: ["INCOME", "EXPENSE"],
      description: "EXPENSE si es una compra, giro o pago; INCOME si es un abono, deposito o sueldo",
    },
    montoPesos: {
      type: "NUMBER",
      description: "Monto en pesos chilenos, solo el numero, sin puntos de miles ni simbolo",
    },
    descripcion: {
      type: "STRING",
      description: "Nombre del comercio o concepto, corto y limpio",
    },
    fecha: {
      type: "STRING",
      description: "Fecha de la transaccion en formato YYYY-MM-DD",
    },
    categoriaSugerida: {
      type: "STRING",
      description: "Nombre EXACTO de una de las categorias disponibles, o cadena vacia si ninguna calza",
    },
    confianza: {
      type: "INTEGER",
      description: "0 a 100: que tan seguro estas de que todos los datos extraidos son correctos",
    },
  },
  required: ["esMovimiento", "tipo", "montoPesos", "descripcion", "fecha", "categoriaSugerida", "confianza"],
};

type RespuestaCruda = {
  esMovimiento: boolean;
  tipo: string;
  montoPesos: number;
  descripcion: string;
  fecha: string;
  categoriaSugerida: string;
  confianza: number;
};

export async function extraerMovimiento(
  textoCrudo: string,
  categorias: CategoriaDisponible[],
  hoy: Date,
): Promise<ResultadoExtraccion> {
  const texto = textoCrudo.trim().slice(0, LARGO_MAXIMO_TEXTO);
  if (!texto) {
    return { ok: false, error: "No hay texto para analizar." };
  }

  const listaCategorias =
    categorias.length > 0
      ? categorias.map((c) => `${c.name} (${c.kind === "INCOME" ? "ingreso" : "gasto"})`).join(", ")
      : "no hay categorias cargadas";

  const prompt = `Eres un extractor de datos de avisos bancarios chilenos. Te paso el texto de un correo
que envia un banco y tienes que sacar los datos de la transaccion, sin inventar nada.

Categorias disponibles del usuario: ${listaCategorias}.
Fecha de hoy: ${toDateInput(hoy)} (usala si el texto no dice una fecha).

Reglas:
- Los montos chilenos usan punto como separador de miles: "$45.990" son cuarenta y cinco mil novecientos noventa pesos, no 45,99.
- Si el texto no avisa de una transaccion concreta (publicidad, resumen de cuenta, aviso de seguridad), pon esMovimiento en false.
- En categoriaSugerida usa el nombre EXACTO de una categoria de la lista, o deja la cadena vacia si ninguna calza bien.
- Si algun dato no esta claro en el texto, baja la confianza en vez de adivinar.

Texto del correo:
"""
${texto}
"""`;

  const resultado = await generarJSON<RespuestaCruda>(prompt, ESQUEMA_EXTRACCION, { temperature: 0 });
  if (!resultado.ok) return resultado;

  const datos = resultado.datos;

  if (!datos.esMovimiento) {
    return { ok: false, error: "El texto no parece un aviso de movimiento." };
  }

  // Desde aca abajo no se confia en nada de lo que vino del modelo.
  const amountCents = inputToCents(String(datos.montoPesos));
  if (amountCents === null || amountCents <= 0) {
    return { ok: false, error: "No se pudo leer un monto valido." };
  }

  const type = datos.tipo === "INCOME" ? "INCOME" : "EXPENSE";

  const description = String(datos.descripcion ?? "").trim().slice(0, 120);
  if (!description) {
    return { ok: false, error: "No se pudo leer una descripcion." };
  }

  // Si el modelo devuelve cualquier cosa como fecha, se cae a hoy en vez de
  // guardar un movimiento con una fecha invalida.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(datos.fecha) ? datos.fecha : toDateInput(hoy);

  // La categoria tiene que existir de verdad y ser del mismo tipo (no tiene
  // sentido sugerir una categoria de ingreso para una compra).
  const sugerida = String(datos.categoriaSugerida ?? "").trim().toLowerCase();
  const categoria = categorias.find((c) => c.name.toLowerCase() === sugerida && c.kind === type);

  const confidence = Math.max(0, Math.min(100, Math.round(datos.confianza ?? 0)));

  return {
    ok: true,
    movimiento: {
      amountCents,
      type,
      description,
      date,
      suggestedCategoryId: categoria?.id ?? null,
      confidence,
    },
  };
}
