"use client";

import { MessageCircleQuestion, Send } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { preguntarIA } from "@/lib/actions/ai";

type Intercambio = { pregunta: string; respuesta: string; esError: boolean };

const EJEMPLOS = ["Cuanto gaste en Ocio este mes?", "Voy bien con el presupuesto?", "Que me recomendas ajustar?"];

export function AiAsk() {
  const [historial, setHistorial] = useState<Intercambio[]>([]);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function enviar(pregunta: string) {
    const texto = pregunta.trim();
    if (!texto || pending) return;

    startTransition(async () => {
      const resultado = await preguntarIA(texto);
      setHistorial((prev) => [
        ...prev,
        {
          pregunta: texto,
          respuesta: resultado.ok ? resultado.texto : resultado.error,
          esError: !resultado.ok,
        },
      ]);
    });

    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h2 className="flex items-center gap-1.5 text-sm font-medium">
        <MessageCircleQuestion className="size-4 text-brand" />
        Preguntale a tus finanzas
      </h2>
      <p className="mt-1 text-sm text-muted">
        Le pregunta a Gemini, pero solo puede contestar con los datos que ya ves en este panel.
      </p>

      {historial.length === 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {EJEMPLOS.map((ejemplo) => (
            <button
              key={ejemplo}
              type="button"
              onClick={() => enviar(ejemplo)}
              disabled={pending}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition hover:bg-background disabled:opacity-60"
            >
              {ejemplo}
            </button>
          ))}
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {historial.map((item, i) => (
            <li key={i} className="space-y-1.5">
              <p className="text-sm font-medium">{item.pregunta}</p>
              <p className={`text-sm text-pretty ${item.esError ? "text-negative" : "text-muted"}`}>
                {item.respuesta}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(inputRef.current?.value ?? "");
        }}
      >
        <input
          ref={inputRef}
          type="text"
          disabled={pending}
          placeholder="Escribe tu pregunta..."
          className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/40 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-strong disabled:opacity-60"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
