import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Escribi tu email")
  .email("Ese email no parece valido")
  .toLowerCase();

export const registroSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Escribi tu nombre")
    .max(60, "Ese nombre es demasiado largo"),
  email: emailSchema,
  password: z
    .string()
    .min(8, "La contrasena tiene que tener al menos 8 caracteres")
    .max(200, "Esa contrasena es demasiado larga"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Escribi tu contrasena"),
});

/** Aplana los errores de zod a { campo: "primer mensaje" }, que es lo que muestra el form. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const salida: Record<string, string> = {};

  for (const issue of error.issues) {
    const campo = String(issue.path[0] ?? "form");
    salida[campo] ??= issue.message;
  }

  return salida;
}
