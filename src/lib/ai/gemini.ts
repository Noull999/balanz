/**
 * Capa aparte del motor de recomendaciones: esto SI llama a un modelo de IA
 * (Gemini, con la API key gratis de Google AI Studio). El motor de reglas en
 * recommendations.ts sigue siendo 100% matematica, sin este archivo de por
 * medio - esta capa solo redacta en lenguaje natural lo que las reglas ya
 * calcularon, no decide nada por su cuenta.
 */

const MODELO = "gemini-3.6-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;

// "minimal" evita que el modelo gaste la mayoria de los tokens razonando
// puertas adentro antes de escribir la respuesta (con el nivel por defecto,
// un resumen de 4 frases se cortaba a mitad de camino porque el presupuesto
// de tokens se iba en el "pensamiento").
const THINKING_MINIMO = { thinkingLevel: "minimal" as const };

type ResultadoCrudo = { ok: true; texto: string } | { ok: false; error: string };

async function llamarGemini(
  prompt: string,
  generationConfig: Record<string, unknown>,
): Promise<ResultadoCrudo> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return { ok: false, error: "Falta configurar GEMINI_API_KEY." };
  }

  try {
    const respuesta = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
      }),
      // Todo lo que llama a esta funcion es on-demand (el usuario aprieta un
      // boton o manda una pregunta), no tiene sentido dejarlo colgado.
      signal: AbortSignal.timeout(15_000),
    });

    if (!respuesta.ok) {
      const cuerpo = await respuesta.text();
      console.error("Gemini respondio con error:", respuesta.status, cuerpo);

      if (respuesta.status === 429) {
        return { ok: false, error: "Se llego al limite gratuito de pedidos por ahora. Proba de nuevo en un rato." };
      }
      return { ok: false, error: "No se pudo conectar con Gemini." };
    }

    const datos = await respuesta.json();
    const texto: string | undefined = datos.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!texto) {
      return { ok: false, error: "Gemini no devolvio texto." };
    }

    return { ok: true, texto: texto.trim() };
  } catch (error) {
    console.error("Error llamando a Gemini:", error);
    return { ok: false, error: "No se pudo conectar con Gemini." };
  }
}

export type ResultadoIA = { ok: true; texto: string } | { ok: false; error: string };

/** Respuesta en texto libre (para el resumen simple o para responder una pregunta). */
export async function generarTexto(prompt: string): Promise<ResultadoIA> {
  return llamarGemini(prompt, { temperature: 0.7, maxOutputTokens: 400, thinkingConfig: THINKING_MINIMO });
}

export type ResultadoJSON<T> = { ok: true; datos: T } | { ok: false; error: string };

/**
 * Respuesta forzada a un JSON con esta forma exacta (responseSchema usa el
 * formato tipo-OpenAPI de Gemini: "OBJECT" | "STRING" | "ARRAY" | etc, no los
 * tipos de TypeScript). Evita parsear markdown a mano.
 */
export async function generarJSON<T>(
  prompt: string,
  schema: Record<string, unknown>,
): Promise<ResultadoJSON<T>> {
  const resultado = await llamarGemini(prompt, {
    temperature: 0.6,
    maxOutputTokens: 500,
    thinkingConfig: THINKING_MINIMO,
    responseMimeType: "application/json",
    responseSchema: schema,
  });

  if (!resultado.ok) return resultado;

  try {
    return { ok: true, datos: JSON.parse(resultado.texto) as T };
  } catch (error) {
    console.error("Gemini devolvio un JSON invalido:", resultado.texto, error);
    return { ok: false, error: "Gemini devolvio un formato invalido." };
  }
}
