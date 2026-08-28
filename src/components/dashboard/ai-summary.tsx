"use client";

import { Lightbulb, Loader, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { generarResumenMensual, type ResumenConTips } from "@/lib/actions/ai";

type Estado =
  | { tipo: "inicial" }
  | { tipo: "exito"; datos: ResumenConTips }
  | { tipo: "error"; mensaje: string };

export function AiSummary() {
  const [estado, setEstado] = useState<Estado>({ tipo: "inicial" });
  const [pending, startTransition] = useTransition();

  function generar() {
    startTransition(async () => {
      const resultado = await generarResumenMensual();
      setEstado(
        resultado.ok ? { tipo: "exito", datos: resultado.datos } : { tipo: "error", mensaje: resultado.error },
      );
    });
  }

  return (
    <CollapsibleCard icon={Sparkles} titulo="Resumen con IA" tono="brand">
      <div className="flex items-start justify-between gap-3 text-sm">
        <p className="text-muted">
          Un resumen del mes y un par de tips escritos por Gemini a partir de los mismos numeros que ves en el
          panel — la IA solo los redacta, no calcula nada por su cuenta.
        </p>

        <button
          type="button"
          onClick={generar}
          disabled={pending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand/40 px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-brand/10 disabled:opacity-60"
        >
          {pending && <Loader className="size-3.5 animate-spin" aria-hidden />}
          {estado.tipo === "inicial" ? "Generar" : "Generar de nuevo"}
        </button>
      </div>

      {pending && <p className="mt-3 text-sm text-muted">Pensando...</p>}
      {estado.tipo === "error" && <p className="mt-3 text-sm text-negative">{estado.mensaje}</p>}
      {estado.tipo === "exito" && (
        <div className="mt-3 space-y-3 text-sm">
          <p className="text-pretty">{estado.datos.resumen}</p>

          {estado.datos.tips.length > 0 && (
            <ul className="space-y-1.5">
              {estado.datos.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
                  <span className="text-pretty">{tip}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </CollapsibleCard>
  );
}
