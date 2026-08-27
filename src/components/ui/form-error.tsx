import { TriangleAlert } from "lucide-react";

/** Error que no pertenece a ningun campo puntual (por ejemplo credenciales invalidas). */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-negative/30 bg-negative/5 px-3 py-2.5 text-sm text-negative"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}
