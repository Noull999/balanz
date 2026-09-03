"use client";

import { Pencil, PiggyBank, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/actions/auth";
import { eliminarMeta, guardarMeta } from "@/lib/actions/savings-goals";
import { toDateInput } from "@/lib/date";
import type { TransaccionInsight } from "@/lib/insights";
import { calcularProgresoMeta, type MetaAhorro, type ProgresoMeta } from "@/lib/metas-ahorro";
import { centsToInput, formatMoney } from "@/lib/money";

export function SavingsGoalsCard({
  metas,
  transacciones,
  hoy,
}: {
  metas: MetaAhorro[];
  transacciones: TransaccionInsight[];
  hoy: Date;
}) {
  const [creando, setCreando] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-medium">
          <PiggyBank className="size-4 text-brand" aria-hidden />
          Metas de ahorro
        </h2>
        {!creando && (
          <button type="button" onClick={() => setCreando(true)} className="text-sm text-brand hover:underline">
            + Nueva meta
          </button>
        )}
      </div>

      {metas.length === 0 && !creando && (
        <p className="mt-3 text-sm text-muted">Todavia no armaste ninguna meta de ahorro.</p>
      )}

      <div className="mt-4 space-y-4">
        {metas.map((meta) => (
          <MetaItem key={meta.id} meta={meta} progreso={calcularProgresoMeta(meta, transacciones, hoy)} />
        ))}
      </div>

      {creando && (
        <div className={metas.length > 0 ? "mt-4 border-t border-border pt-4" : "mt-4"}>
          <FormularioMeta onGuardado={() => setCreando(false)} onCancelar={() => setCreando(false)} />
        </div>
      )}
    </div>
  );
}

function MetaItem({ meta, progreso }: { meta: MetaAhorro; progreso: ProgresoMeta }) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return <FormularioMeta meta={meta} onGuardado={() => setEditando(false)} onCancelar={() => setEditando(false)} />;
  }

  const ratio = meta.targetCents > 0 ? progreso.ahorradoCents / meta.targetCents : 0;
  const cumplida = progreso.mesesRestantesEstimados === 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{meta.name}</p>
          <p className="text-xs text-muted">
            {formatMoney(Math.max(0, progreso.ahorradoCents))} de {formatMoney(meta.targetCents)}
            {cumplida
              ? " - cumplida"
              : progreso.mesesRestantesEstimados !== null
                ? ` - a este ritmo, ${progreso.mesesRestantesEstimados} ${progreso.mesesRestantesEstimados === 1 ? "mes" : "meses"} mas`
                : " - todavia no estas ahorrando para esta meta"}
            {progreso.vaATiempo === false && " (mas lento que tu fecha objetivo)"}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setEditando(true)}
            title="Editar meta"
            className="rounded-md p-1.5 text-muted transition hover:bg-background hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
          <form action={eliminarMeta}>
            <input type="hidden" name="goalId" value={meta.id} />
            <button
              type="submit"
              title="Eliminar meta"
              className="rounded-md p-1.5 text-muted transition hover:bg-background hover:text-negative"
            >
              <Trash2 className="size-3.5" />
            </button>
          </form>
        </div>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-background">
        <div
          className={`h-full rounded-full transition-[width] ${cumplida ? "bg-positive" : "bg-brand"}`}
          style={{ width: `${Math.min(Math.max(ratio, 0), 1) * 100}%` }}
        />
      </div>
    </div>
  );
}

function FormularioMeta({
  meta,
  onGuardado,
  onCancelar,
}: {
  meta?: MetaAhorro;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(async (prev, formData) => {
    const resultado = await guardarMeta(prev, formData);
    if (resultado === null) onGuardado();
    return resultado;
  }, null);
  const errors = state?.errors ?? {};
  const values = state?.values;

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <FormError message={errors.form} />
      {meta && <input type="hidden" name="goalId" value={meta.id} />}

      <Field label="Nombre" name="name" defaultValue={values?.name ?? meta?.name} error={errors.name} hint="Por ejemplo Vacaciones o Fondo de emergencia" />

      <Field
        label="Monto objetivo"
        name="targetAmount"
        defaultValue={values?.targetAmount ?? (meta ? centsToInput(meta.targetCents) : undefined)}
        error={errors.targetAmount}
        hint="Por ejemplo 500000"
      />

      <Field
        label="Fecha objetivo (opcional)"
        name="targetDate"
        type="date"
        defaultValue={values?.targetDate ?? (meta?.targetDate ? toDateInput(meta.targetDate) : undefined)}
        error={errors.targetDate}
        required={false}
      />

      <div className="flex gap-2">
        <div className="flex-1">
          <SubmitButton>Guardar</SubmitButton>
        </div>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-lg border border-border px-4 text-sm font-medium transition hover:bg-background"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
