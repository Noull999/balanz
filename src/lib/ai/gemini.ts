/**
 * Capa aparte del motor de recomendaciones: esto SI llama a un modelo de IA
 * (Gemini, con la API key gratis de Google AI Studio). El motor de reglas en
 * recommendations.ts sigue siendo 100% matematica, sin este archivo de por
 * medio - esta capa solo redacta en lenguaje natural lo que las reglas ya
 * calcularon, no decide nada por su cuenta.
 */

const MODELO = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;

export type ResultadoIA = { ok: true; texto: string } | { ok: false; error: string };

export async function generarTexto(prompt: string): Promise<ResultadoIA> {
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
        generationConfig: { temperature: 0.7, maxOutputTokens: 260 },
      }),
      // El resumen es on-demand (el usuario aprieta un boton), no tiene sentido
      // dejarlo colgado si Gemini no contesta rapido.
      signal: AbortSignal.timeout(15_000),
    });

    if (!respuesta.ok) {
      const cuerpo = await respuesta.text();
      console.error("Gemini respondio con error:", respuesta.status, cuerpo);

      if (respuesta.status === 429) {
        return { ok: false, error: "Se llego al limite gratuito de pedidos por ahora. Proba de nuevo en un rato." };
      }
      return { ok: false, error: "No se pudo generar el resumen." };
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
