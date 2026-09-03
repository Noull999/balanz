"use client";

import { Check, Loader, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { analizarTexto, confirmarPendiente, descartarPendiente } from "@/lib/actions/pending";
import { formatDay } from "@/lib/date";
import { UMBRAL_CONFIANZA_ALTA } from "@/lib/extraccion";
import { formatMoney } from "@/lib/money";

type Pendiente = {
  id: string;
  description: string;
  amountCents: number;
  type: "INCOME" | "EXPENSE";
  date: Date;
  suggestedCategoryId: string | null;
  confidence: number;
  rawSource: string;
};

type Categoria = { id: string; name: string; kind: "INCOME" | "EXPENSE" };

export function BandejaPendientes({
  pendientes,
  categorias,
}: {
  pendientes: Pendiente[];
  categorias: Categoria[];
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-medium">
        <Sparkles className="size-4 text-brand" aria-hidden />
        Detectados automaticamente
      </h2>
      <p className="mt-1 text-sm text-muted">
        Balanz lee el aviso de compra que manda el banco y arma el movimiento. Nada entra a tus numeros
        hasta que lo confirmas aca.
      </p>

      {pendientes.length > 0 && (
        <ul className="mt-4 space-y-3">
          {pendientes.map((pendiente) => (
            <ItemPendiente key={pendiente.id} pendiente={pendiente} categorias={categorias} />
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-border pt-4">
        <FormularioTexto />
      </div>
    </div>
  );
}

function ItemPendiente({ pendiente, categorias }: { pendiente: Pendiente; categorias: Categoria[] }) {
  const [categoryId, setCategoryId] = useState(pendiente.suggestedCategoryId ?? "");
  const [verOriginal, setVerOriginal] = useState(false);

  const dudoso = pendiente.confidence < UMBRAL_CONFIANZA_ALTA;
  const esIngreso = pendiente.type === "INCOME";
  const opciones = categorias.filter((c) => c.kind === pendiente.type);

  return (
    <li className={`rounded-lg border p-3 ${dudoso ? "border-warning/40 bg-warning/5" : "border-border"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{pendiente.description}</p>
          <p className="text-sm text-muted">{formatDay(pendiente.date)}</p>
        </div>
        <span className={`shrink-0 font-medium tabular-nums ${esIngreso ? "text-positive" : ""}`}>
          {esIngreso ? "+" : "−"}
          {formatMoney(pendiente.amountCents)}
        </span>
      </div>

      {dudoso && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-warning">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
          Confianza {pendiente.confidence}% - revisa los datos antes de confirmar.
        </p>
      )}

      <button
        type="button"
        onClick={() => setVerOriginal((v) => !v)}
        className="mt-2 text-xs text-brand hover:underline"
      >
        {verOriginal ? "Ocultar" : "Ver"} texto original
      </button>
      {verOriginal && (
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-background p-2 text-xs text-muted">
          {pendiente.rawSource}
        </pre>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={`categoria-${pendiente.id}`} className="block text-xs text-muted">
            Categoria
          </label>
          <select
            id={`categoria-${pendiente.id}`}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/40"
          >
            <option value="">Sin categoria</option>
            {opciones.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.name}
              </option>
            ))}
          </select>
        </div>

        <form action={confirmarPendiente}>
          <input type="hidden" name="pendingId" value={pendiente.id} />
          <input type="hidden" name="categoryId" value={categoryId} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-strong"
          >
            <Check className="size-4" aria-hidden />
            Confirmar
          </button>
        </form>

        <form action={descartarPendiente}>
          <input type="hidden" name="pendingId" value={pendiente.id} />
          <button
            type="submit"
            title="Descartar"
            className="rounded-lg border border-border p-2 text-muted transition hover:bg-background hover:text-negative"
          >
            <Trash2 className="size-4" />
          </button>
        </form>
      </div>
    </li>
  );
}

/**
 * Pegar el texto de un aviso a mano. Sirve para probar la extraccion sin
 * depender del cron de Gmail, y como salida de emergencia cuando un banco
 * manda un aviso que el filtro automatico no toma.
 */
function FormularioTexto() {
  const [texto, setTexto] = useState("");
  const [pending, setPending] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null);

  async function enviar() {
    if (!texto.trim()) return;
    setPending(true);
    setResultado(null);

    const r = await analizarTexto(texto);
    if (r.ok) {
      setTexto("");
      setResultado({ ok: true, mensaje: `Listo, lo agregue aca arriba (confianza ${r.confidence}%).` });
    } else {
      setResultado({ ok: false, mensaje: r.error });
    }
    setPending(false);
  }

  return (
    <form action={enviar} className="space-y-2">
      <label htmlFor="texto-aviso" className="block text-sm font-medium">
        Pegar el aviso de una compra
      </label>
      <textarea
        id="texto-aviso"
        value={texto}
        onChange={(event) => setTexto(event.target.value)}
        rows={3}
        placeholder="Pega aca el correo que te mando el banco"
        className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/40"
      />

      {resultado && (
        <p className={`text-sm ${resultado.ok ? "text-positive" : "text-negative"}`}>{resultado.mensaje}</p>
      )}

      <button
        type="submit"
        disabled={pending || !texto.trim()}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-strong disabled:opacity-60"
      >
        {pending && <Loader className="size-4 animate-spin" aria-hidden />}
        Analizar
      </button>
    </form>
  );
}
