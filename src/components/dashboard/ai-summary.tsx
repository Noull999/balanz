"use client";

import { Loader, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import { generarResumenMensual } from "@/lib/actions/ai";

type Estado =
  | { tipo: "inicial" }
  | { tipo: "exito"; texto: string }
  | { tipo: "error"; mensaje: string };

export function AiSummary() {
  const [estado, setEstado] = useState<Estado>({ tipo: "inicial" });
  const [pending, startTransition] = useTransition();

  function generar() {
    startTransition(async () => {
      const resultado = await generarResumenMensual();
      setEstado(
        resultado.ok ? { tipo: "exito", texto: resultado.texto } : { tipo: "error", mensaje: resultado.error },
      );
    });
  }

  return (
    <div className="rounded-xl border border-brand/30 bg-brand/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-brand">
          <Sparkles className="size-4" />
          Resumen con IA
        </h2>

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

      <div className="mt-3 text-sm">
        {estado.tipo === "inicial" && !pending && (
          <p className="text-muted">
            Un resumen del mes escrito por Gemini a partir de los mismos numeros que ves abajo — la IA solo lo
            redacta, no calcula nada por su cuenta.
          </p>
        )}
        {pending && <p className="text-muted">Pensando...</p>}
        {estado.tipo === "exito" && <p className="text-pretty">{estado.texto}</p>}
        {estado.tipo === "error" && <p className="text-negative">{estado.mensaje}</p>}
      </div>
    </div>
  );
}
