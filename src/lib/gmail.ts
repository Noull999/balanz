// Cliente minimo de la API de Gmail: solo lo necesario para buscar los avisos
// de compra que manda el banco y leer su texto. Se pide un unico scope, de
// solo lectura - Balanz no puede escribir, responder ni borrar nada.
//
// No se usa la libreria oficial de Google a proposito: son 3 llamadas HTTP
// contra endpoints estables, y evitar la dependencia mantiene el bundle
// chico (mismo criterio que con Gemini en ai/gemini.ts).

export const SCOPE_GMAIL = "https://www.googleapis.com/auth/gmail.readonly";

const OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

/**
 * Remitentes de los que se leen avisos. Se puede sobrescribir con
 * GMAIL_SEARCH_QUERY si hace falta afinar la busqueda sin tocar el codigo.
 */
const REMITENTES_BANCOS = [
  "bancoestado.cl",
  "bancofalabella.cl",
  "santander.cl",
  "bancochile.cl",
  "bci.cl",
  "itau.cl",
  "scotiabank.cl",
  "mercadopago.com",
];

export function credencialesGoogle(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/** La URL publica de la app, para armar el redirect_uri que espera Google. */
export function urlBase(): string {
  const explicita = process.env.APP_URL;
  if (explicita) return explicita.replace(/\/$/, "");
  // En Vercel la variable la inyecta la plataforma sola.
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

export function redirectUri(): string {
  return `${urlBase()}/api/gmail/callback`;
}

/** URL de la pantalla de consentimiento de Google. El usuario aprueba ahi, no en Balanz. */
export function urlAutorizacion(clientId: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPE_GMAIL,
    // offline + consent son los que hacen que Google devuelva un refresh
    // token; sin ellos solo llega un access token que muere en una hora y la
    // sincronizacion automatica no podria correr sola.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });

  return `${OAUTH_AUTH_URL}?${params.toString()}`;
}

type RespuestaToken = {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

async function pedirToken(cuerpo: Record<string, string>): Promise<RespuestaToken> {
  const respuesta = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(cuerpo).toString(),
    signal: AbortSignal.timeout(15_000),
  });

  return (await respuesta.json()) as RespuestaToken;
}

/** Canjea el `code` que devuelve Google por un refresh token de larga duracion. */
export async function canjearCodigo(
  code: string,
): Promise<{ ok: true; refreshToken: string; accessToken: string } | { ok: false; error: string }> {
  const credenciales = credencialesGoogle();
  if (!credenciales) return { ok: false, error: "Faltan las credenciales de Google." };

  const datos = await pedirToken({
    code,
    client_id: credenciales.clientId,
    client_secret: credenciales.clientSecret,
    redirect_uri: redirectUri(),
    grant_type: "authorization_code",
  });

  if (!datos.refresh_token || !datos.access_token) {
    console.error("Google no devolvio refresh token:", datos.error, datos.error_description);
    return { ok: false, error: datos.error_description ?? "Google no devolvio un token." };
  }

  return { ok: true, refreshToken: datos.refresh_token, accessToken: datos.access_token };
}

/** Un refresh token no expira, pero el access token dura ~1h: se pide uno nuevo en cada sync. */
export async function obtenerAccessToken(
  refreshToken: string,
): Promise<{ ok: true; accessToken: string } | { ok: false; error: string }> {
  const credenciales = credencialesGoogle();
  if (!credenciales) return { ok: false, error: "Faltan las credenciales de Google." };

  const datos = await pedirToken({
    refresh_token: refreshToken,
    client_id: credenciales.clientId,
    client_secret: credenciales.clientSecret,
    grant_type: "refresh_token",
  });

  if (!datos.access_token) {
    console.error("No se pudo refrescar el token:", datos.error, datos.error_description);
    return { ok: false, error: "Se perdio el permiso sobre la casilla. Volve a conectarla." };
  }

  return { ok: true, accessToken: datos.access_token };
}

async function apiGmail<T>(accessToken: string, ruta: string): Promise<T | null> {
  const respuesta = await fetch(`${GMAIL_API}${ruta}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!respuesta.ok) {
    console.error("Gmail respondio con error:", respuesta.status, await respuesta.text());
    return null;
  }

  return (await respuesta.json()) as T;
}

export async function emailDeLaCuenta(accessToken: string): Promise<string | null> {
  const perfil = await apiGmail<{ emailAddress?: string }>(accessToken, "/profile");
  return perfil?.emailAddress ?? null;
}

/** Arma la query de busqueda de Gmail: avisos de bancos posteriores a `desde`. */
export function armarQuery(desde: Date | null): string {
  const base = process.env.GMAIL_SEARCH_QUERY ?? `from:(${REMITENTES_BANCOS.join(" OR ")})`;

  // Gmail solo filtra por dia (after:YYYY/MM/DD), no por hora. Se resta un dia
  // para no perder mensajes por el corte, y la deduplicacion por externalId se
  // encarga de que los repetidos no entren dos veces.
  if (!desde) return `${base} newer_than:7d`;

  const dia = new Date(desde.getTime() - 86_400_000);
  const after = `${dia.getUTCFullYear()}/${dia.getUTCMonth() + 1}/${dia.getUTCDate()}`;
  return `${base} after:${after}`;
}

export type MensajeGmail = { id: string; texto: string };

function decodificarBase64Url(dato: string): string {
  return Buffer.from(dato.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

type Parte = { mimeType?: string; body?: { data?: string }; parts?: Parte[] };

/**
 * Saca el texto de un mensaje. Prefiere text/plain; si el banco manda solo
 * HTML, le quita las etiquetas (basta para que el extractor lea el monto y el
 * comercio, no hace falta renderizar nada).
 */
function extraerTexto(parte: Parte): string {
  if (parte.mimeType === "text/plain" && parte.body?.data) {
    return decodificarBase64Url(parte.body.data);
  }

  if (parte.parts) {
    const plano = parte.parts.map(extraerTexto).find((t) => t.trim());
    if (plano) return plano;
  }

  if (parte.mimeType === "text/html" && parte.body?.data) {
    return decodificarBase64Url(parte.body.data)
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ");
  }

  return "";
}

/** Busca mensajes que matcheen la query y devuelve su texto ya limpio. */
export async function buscarMensajes(
  accessToken: string,
  query: string,
  maximo = 20,
): Promise<MensajeGmail[]> {
  const lista = await apiGmail<{ messages?: { id: string }[] }>(
    accessToken,
    `/messages?q=${encodeURIComponent(query)}&maxResults=${maximo}`,
  );

  if (!lista?.messages?.length) return [];

  const mensajes: MensajeGmail[] = [];

  for (const { id } of lista.messages) {
    const completo = await apiGmail<{ payload?: Parte; snippet?: string }>(
      accessToken,
      `/messages/${id}?format=full`,
    );
    if (!completo) continue;

    const texto = (completo.payload ? extraerTexto(completo.payload) : "") || completo.snippet || "";
    if (texto.trim()) {
      mensajes.push({ id, texto: texto.trim() });
    }
  }

  return mensajes;
}
