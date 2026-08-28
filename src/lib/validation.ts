import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Escribe tu email")
  .email("Ese email no parece valido")
  .toLowerCase();

export const registroSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Escribe tu nombre")
    .max(60, "Ese nombre es demasiado largo"),
  email: emailSchema,
  password: z
    .string()
    .min(8, "La contrasena tiene que tener al menos 8 caracteres")
    .max(200, "Esa contrasena es demasiado larga"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Escribe tu contrasena"),
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

export const movimientoSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"], { message: "Elige si es ingreso o gasto" }),
  description: z
    .string()
    .trim()
    .min(1, "Escribe una descripcion")
    .max(120, "Esa descripcion es demasiado larga"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha"),
  // Llega como texto del input y se valida en centavos en la action, que es
  // donde vive la conversion (inputToCents).
  amount: z.string().min(1, "Escribe un monto"),
  categoryId: z.string().trim().min(1, "Elige una categoria"),
});

export const categoriaSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Escribe un nombre")
    .max(40, "Ese nombre es demasiado largo"),
  kind: z.enum(["INCOME", "EXPENSE"], { message: "Elige ingreso o gasto" }),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Elige un color"),
  icon: z.string().min(1, "Elige un icono"),
});

export const presupuestoSchema = z.object({
  monthlyLimit: z.string().min(1, "Escribe un monto"),
});
