// Importador de cartola bancaria: la red de seguridad de la carga automatica.
// El correo (extraccion.ts) capta la mayoria de las compras casi al toque,
// pero no todo pasa por mail (compras chicas, cuotas, algunos bancos avisan
// solo por push). Una vez al mes el usuario baja el Excel/CSV que exporta
// cualquier banco chileno y lo sube aca: agarra todo lo que el correo no vio.
//
// Cada banco nombra las columnas distinto (Fecha/Descripcion/Cargo/Abono,
// o Fecha/Detalle/Monto con signo, etc.) y algunos meten filas de
// encabezado/leyenda antes de la tabla real. Por eso se usa UNA sola llamada
// a Gemini por archivo (no por fila: seria carisimo) para que identifique la
// estructura, y despues TODO el parseo de las filas es matematica pura,
// reusando inputToCents (mismo parser de montos chilenos que ya usa el resto
// de la app) - la IA nunca toca un monto, solo dice en que columna esta.

import * as XLSX from "xlsx";

import { generarJSON } from "@/lib/ai/gemini";
import { inputToCents } from "@/lib/money";

const MAX_FILAS = 1000;
const MAX_FILAS_MUESTRA = 15;

export type CategoriaDisponible = { id: string; name: string; kind: "INCOME" | "EXPENSE" };

export type MovimientoCartola = {
  amountCents: number;
  type: "INCOME" | "EXPENSE";
  description: string;
  /** "2026-09-03" */
  date: string;
  suggestedCategoryId: string | null;
  confidence: number;
  /** Fila original (para el "ver texto original" de la bandeja de revision). */
  filaOriginal: string;
};

export type ResultadoCartola =
  | { ok: true; movimientos: MovimientoCartola[]; filasLeidas: number; filasDescartadas: number }
  | { ok: false; error: string };

const ESQUEMA_ESTRUCTURA = {
  type: "OBJECT",
  properties: {
    esCartolaValida: {
      type: "BOOLEAN",
      description: "true si esto parece una cartola o historial de movimientos bancarios",
    },
    filaInicioDatos: {
      type: "INTEGER",
      description: "Indice (0 = primera fila) de la primera fila que es un movimiento real, despues del encabezado",
    },
    columnaFecha: { type: "STRING", description: "Texto exacto del encabezado de la columna de fecha" },
    columnaDescripcion: {
      type: "STRING",
      description: "Texto exacto del encabezado de la columna de descripcion o detalle",
    },
    columnaMontoUnico: {
      type: "STRING",
      description:
        "Texto exacto del encabezado de la columna de monto, SOLO si hay una sola columna con signo (positivo/negativo) para todos los montos. Cadena vacia si no aplica.",
    },
    columnaCargo: {
      type: "STRING",
      description: "Texto exacto del encabezado de la columna de cargos/gastos/debe. Cadena vacia si no aplica.",
    },
    columnaAbono: {
      type: "STRING",
      description: "Texto exacto del encabezado de la columna de abonos/depositos/haber. Cadena vacia si no aplica.",
    },
  },
  required: ["esCartolaValida", "filaInicioDatos", "columnaFecha", "columnaDescripcion", "columnaMontoUnico", "columnaCargo", "columnaAbono"],
};

type Estructura = {
  esCartolaValida: boolean;
  filaInicioDatos: number;
  columnaFecha: string;
  columnaDescripcion: string;
  columnaMontoUnico: string;
  columnaCargo: string;
  columnaAbono: string;
};

/**
 * "02/09/2026", "02-09-2026" (formato chileno DD/MM/AAAA) o "2026-09-02" (ISO,
 * lo que devuelve XLSX para celdas de fecha reales) -> "2026-09-02".
 * null si no matchea ninguno de los dos.
 */
function parsearFechaChilena(valor: string): string | null {
  const texto = valor.trim();

  const iso = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const [, anio, m, d] = iso;
    const mes = Number(m);
    const dia = Number(d);
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
    return `${anio}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const match = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return null;

  const [, d, m, anioCrudo] = match;
  const anio = anioCrudo.length === 2 ? `20${anioCrudo}` : anioCrudo;
  const mes = Number(m);
  const dia = Number(d);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;

  return `${anio}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/**
 * Parser de CSV a mano, sin pasar por XLSX: SheetJS intenta adivinar el tipo
 * de cada celda de un CSV (numero, fecha...) y para fechas ambiguas tipo
 * "01/09/2026" el redondeo de ida y vuelta por su formateador interno las
 * corrompe (confirmado: "01/09/2026" volvia como "1/8/26", un mes atras).
 * Un CSV no tiene tipos reales — es texto separado por comas — asi que no
 * hace falta ninguna libreria para leerlo bien, solo separar comillas.
 */
function parsearCsv(texto: string): string[][] {
  // La mayoria de los bancos chilenos usa coma; algunos usan punto y coma
  // porque los montos ya llevan coma decimal. Se detecta por cual aparece
  // mas seguido en la primera linea no vacia.
  const primeraLinea = texto.split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
  const delimitador = (primeraLinea.match(/;/g)?.length ?? 0) > (primeraLinea.match(/,/g)?.length ?? 0) ? ";" : ",";

  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let dentroDeComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const char = texto[i];

    if (dentroDeComillas) {
      if (char === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (char === '"') {
        dentroDeComillas = false;
      } else {
        campo += char;
      }
      continue;
    }

    if (char === '"') {
      dentroDeComillas = true;
    } else if (char === delimitador) {
      fila.push(campo);
      campo = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else {
      campo += char;
    }
  }
  if (campo !== "" || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }

  return filas;
}

/**
 * Excel real (.xlsx/.xls): las celdas de fecha tienen un TIPO explicito, sin
 * la ambiguedad de un CSV, asi que XLSX las convierte bien pidiendole
 * `cellDates` + un formato ISO fijo (`dateNF`) en vez de dejarle adivinar el
 * formato de salida por su cuenta.
 */
function leerFilasExcel(buffer: ArrayBuffer): string[][] {
  const libro = XLSX.read(buffer, { type: "array", cellDates: true });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json<string[]>(hoja, {
    header: 1,
    raw: false,
    defval: "",
    dateNF: "yyyy-mm-dd",
  });
  return filas;
}

function leerFilas(buffer: ArrayBuffer, nombreArchivo: string): string[][] {
  const esCsv = nombreArchivo.toLowerCase().endsWith(".csv");
  const filas = esCsv ? parsearCsv(new TextDecoder("utf-8").decode(buffer)) : leerFilasExcel(buffer);

  // Filas completamente vacias (comunes al final de un export) no aportan nada.
  return filas
    .map((fila) => fila.map((celda) => String(celda ?? "").trim()))
    .filter((fila) => fila.some((celda) => celda !== ""));
}

function indiceColumna(encabezado: string[], nombreColumna: string): number {
  if (!nombreColumna) return -1;
  return encabezado.findIndex((h) => h.trim().toLowerCase() === nombreColumna.trim().toLowerCase());
}

/** Heuristica liviana: no llama a la IA por fila, solo busca coincidencias de texto contra las categorias del usuario. */
function sugerirCategoria(descripcion: string, categorias: CategoriaDisponible[], type: "INCOME" | "EXPENSE"): string | null {
  const texto = descripcion.toLowerCase();
  const candidata = categorias.find(
    (c) => c.kind === type && (texto.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(texto)),
  );
  return candidata?.id ?? null;
}

export async function parsearCartola(
  buffer: ArrayBuffer,
  categorias: CategoriaDisponible[],
  nombreArchivo: string,
): Promise<ResultadoCartola> {
  let filas: string[][];
  try {
    filas = leerFilas(buffer, nombreArchivo);
  } catch (error) {
    console.error("No se pudo leer el archivo de cartola:", error);
    return { ok: false, error: "No se pudo leer el archivo. Tiene que ser un Excel (.xlsx) o CSV." };
  }

  if (filas.length === 0) {
    return { ok: false, error: "El archivo esta vacio." };
  }

  const muestra = filas
    .slice(0, MAX_FILAS_MUESTRA)
    .map((fila, i) => `Fila ${i}: ${fila.join(" | ")}`)
    .join("\n");

  const prompt = `Eres un analista que identifica la estructura de cartolas bancarias chilenas exportadas a Excel/CSV.
Te paso las primeras filas del archivo (cada columna separada por " | "). Los bancos chilenos suelen tener algunas
filas de titulo o leyenda antes de la tabla real, y nombran las columnas distinto: a veces "Fecha/Descripcion/Cargo/Abono",
a veces "Fecha/Detalle/Monto" con un monto que ya trae el signo.

${muestra}

Identifica la fila donde empiezan los datos reales (no el encabezado) y el nombre EXACTO de las columnas relevantes.`;

  const resultado = await generarJSON<Estructura>(prompt, ESQUEMA_ESTRUCTURA, { temperature: 0 });
  if (!resultado.ok) return resultado;

  const estructura = resultado.datos;
  if (!estructura.esCartolaValida) {
    return { ok: false, error: "El archivo no parece una cartola de movimientos." };
  }

  const filaEncabezado = filas[Math.max(0, estructura.filaInicioDatos - 1)];
  const idxFecha = indiceColumna(filaEncabezado, estructura.columnaFecha);
  const idxDescripcion = indiceColumna(filaEncabezado, estructura.columnaDescripcion);
  const idxMontoUnico = indiceColumna(filaEncabezado, estructura.columnaMontoUnico);
  const idxCargo = indiceColumna(filaEncabezado, estructura.columnaCargo);
  const idxAbono = indiceColumna(filaEncabezado, estructura.columnaAbono);

  if (idxFecha === -1 || idxDescripcion === -1 || (idxMontoUnico === -1 && idxCargo === -1 && idxAbono === -1)) {
    return { ok: false, error: "No se pudo identificar las columnas de fecha, descripcion y monto." };
  }

  const filasDatos = filas.slice(estructura.filaInicioDatos, estructura.filaInicioDatos + MAX_FILAS);
  const movimientos: MovimientoCartola[] = [];
  let descartadas = 0;

  for (const fila of filasDatos) {
    const fecha = parsearFechaChilena(fila[idxFecha] ?? "");
    const descripcion = (fila[idxDescripcion] ?? "").trim().slice(0, 120);

    let amountCents: number | null = null;
    let type: "INCOME" | "EXPENSE" = "EXPENSE";

    if (idxMontoUnico !== -1) {
      const crudo = inputToCents(fila[idxMontoUnico] ?? "");
      if (crudo !== null && crudo !== 0) {
        amountCents = Math.abs(crudo);
        type = crudo < 0 ? "EXPENSE" : "INCOME";
      }
    } else {
      const cargo = idxCargo !== -1 ? inputToCents(fila[idxCargo] ?? "") : null;
      const abono = idxAbono !== -1 ? inputToCents(fila[idxAbono] ?? "") : null;

      if (cargo !== null && cargo !== 0) {
        amountCents = Math.abs(cargo);
        type = "EXPENSE";
      } else if (abono !== null && abono !== 0) {
        amountCents = Math.abs(abono);
        type = "INCOME";
      }
    }

    // Filas de saldo, totales o vacias: no tienen fecha valida, descripcion, o
    // ningun monto en ninguna de las columnas de plata. Se descartan en vez
    // de guardar un movimiento a medias.
    if (!fecha || !descripcion || amountCents === null) {
      descartadas++;
      continue;
    }

    movimientos.push({
      amountCents,
      type,
      description: descripcion,
      date: fecha,
      suggestedCategoryId: sugerirCategoria(descripcion, categorias, type),
      // Estructural, no interpretado de lenguaje libre: mucha mas confianza
      // por default que un aviso de correo (ver UMBRAL_CONFIANZA_ALTA).
      confidence: 92,
      filaOriginal: fila.join(" | "),
    });
  }

  return { ok: true, movimientos, filasLeidas: filasDatos.length, filasDescartadas: descartadas };
}
