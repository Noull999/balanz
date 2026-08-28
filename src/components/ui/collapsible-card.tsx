"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import { useState } from "react";

/**
 * Tarjeta que arranca cerrada (solo el titulo) y se abre con un click - para
 * que el contenido no ocupe espacio hasta que alguien lo quiera usar.
 */
export function CollapsibleCard({
  icon: Icon,
  titulo,
  tono = "default",
  defaultAbierto = false,
  children,
}: {
  icon: LucideIcon;
  titulo: string;
  tono?: "default" | "brand";
  defaultAbierto?: boolean;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(defaultAbierto);

  return (
    <div
      className={`rounded-xl border p-5 ${
        tono === "brand" ? "border-brand/30 bg-brand/5" : "border-border bg-surface"
      }`}
    >
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        className={`flex w-full items-center gap-1.5 text-left text-sm font-medium ${
          tono === "brand" ? "text-brand" : ""
        }`}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="flex-1">{titulo}</span>
        <ChevronDown className={`size-4 shrink-0 transition-transform ${abierto ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {abierto && <div className="mt-3">{children}</div>}
    </div>
  );
}
