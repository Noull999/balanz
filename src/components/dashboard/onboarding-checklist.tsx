import { Check, Circle } from "lucide-react";
import Link from "next/link";

export type PasoOnboarding = { label: string; done: boolean; href: string; cta: string };

/**
 * Guia de primeros pasos para una cuenta nueva - pensada para alguien cercano
 * que recien arranca, sin conocimiento previo de la app. Se desaparece sola
 * cuando ya completo todo: no tiene sentido para una cuenta en uso.
 */
export function OnboardingChecklist({ pasos }: { pasos: PasoOnboarding[] }) {
  const completados = pasos.filter((p) => p.done).length;
  if (completados === pasos.length) return null;

  return (
    <div className="rounded-xl border border-brand/30 bg-brand/5 p-5">
      <h2 className="text-sm font-medium">
        Primeros pasos <span className="text-muted">({completados}/{pasos.length})</span>
      </h2>
      <ul className="mt-3 space-y-2.5">
        {pasos.map((paso) => (
          <li key={paso.label} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className={`flex items-center gap-2 text-sm ${paso.done ? "text-muted line-through" : ""}`}>
              {paso.done ? (
                <Check className="size-4 shrink-0 text-positive" aria-hidden />
              ) : (
                <Circle className="size-4 shrink-0 text-muted" aria-hidden />
              )}
              {paso.label}
            </span>
            {!paso.done && (
              <Link href={paso.href} className="shrink-0 text-sm font-medium text-brand hover:underline">
                {paso.cta}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
