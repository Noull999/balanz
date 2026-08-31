"use client";

import { CircleCheck, CreditCard, Loader, Pencil } from "lucide-react";
import { useActionState, useState } from "react";

import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/actions/auth";
import { guardarDeuda, registrarPagoDeuda } from "@/lib/actions/debt";
import { centsToInput, formatMoney, inputToCents } from "@/lib/money";

type DeudaActual = { name: string; originalCents: number; remainingCents: number } | null;
type CategoriaGasto = { id: string; name: string };

export function DebtCard({
  deuda,
  categorias,
  montoDestinado,
  onMontoDestinadoChange,
  onMontoDestinadoBlur,
  onPagoRegistrado,
}: {
  deuda: DeudaActual;
  categorias: CategoriaGasto[];
  /** Lo que se piensa pagar este mes, en texto de input - lo usa /plan para descontarlo del reparto. */
  montoDestinado: string;
  onMontoDestinadoChange: (valor: string) => void;
  /** Se dispara al salir del input (o al click de un chip de sugerencia) - ahi se persiste. */
  onMontoDestinadoBlur: () => void;
  /** Se dispara cuando un pago se registra de verdad, para limpiar y persistir el monto planeado en 0. */
  onPagoRegistrado: () => void;
}) {
  const [editando, setEditando] = useState(deuda === null);

  if (editando) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="flex items-center gap-1.5 text-sm font-medium">
          <CreditCard className="size-4 text-brand" aria-hidden />
          {deuda ? "Editar deuda" : "Cargar una deuda"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Cargala una vez con el monto total. Cada pago que registres despues va bajando el saldo.
        </p>
        <div className="mt-4">
          <FormularioDeuda deuda={deuda} onGuardado={() => setEditando(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-medium">
            <CreditCard className="size-4 text-brand" aria-hidden />
            {deuda!.name}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {deuda!.remainingCents === 0
              ? "Ya la pagaste por completo."
              : `Te queda ${formatMoney(deuda!.remainingCents)} de ${formatMoney(deuda!.originalCents)}.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditando(true)}
          title="Editar deuda"
          className="rounded-md p-1.5 text-muted transition hover:bg-background hover:text-foreground"
        >
          <Pencil className="size-4" />
        </button>
      </div>

      <ProgresoDeuda deuda={deuda!} />

      {deuda!.remainingCents > 0 && (
        <div className="mt-5">
          <FormularioPago
            categorias={categorias}
            remainingCents={deuda!.remainingCents}
            monto={montoDestinado}
            onMontoChange={onMontoDestinadoChange}
            onMontoBlur={onMontoDestinadoBlur}
            onPagoRegistrado={onPagoRegistrado}
          />
        </div>
      )}
    </div>
  );
}

function ProgresoDeuda({ deuda }: { deuda: NonNullable<DeudaActual> }) {
  const pagadoCents = deuda.originalCents - deuda.remainingCents;
  const ratio = deuda.originalCents > 0 ? pagadoCents / deuda.originalCents : 0;
  const porcentaje = Math.round(ratio * 100);

  return (
    <div className="mt-4">
      <div
        role="progressbar"
        aria-valuenow={porcentaje}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-background"
      >
        <div
          className="h-full rounded-full bg-positive transition-[width]"
          style={{ width: `${Math.min(ratio, 1) * 100}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted">{porcentaje}% pagado</p>
    </div>
  );
}

function FormularioDeuda({ deuda, onGuardado }: { deuda: DeudaActual; onGuardado?: () => void }) {
  const [state, formAction] = useActionState<FormState, FormData>(async (prev, formData) => {
    const resultado = await guardarDeuda(prev, formData);
    if (resultado === null) onGuardado?.();
    return resultado;
  }, null);
  const errors = state?.errors ?? {};
  const values = state?.values;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={errors.form} />

      <Field
        label="Nombre (opcional)"
        name="name"
        defaultValue={values?.name ?? deuda?.name}
        error={errors.name}
        required={false}
        hint="Por ejemplo Tarjeta de credito o Prestamo"
      />

      <Field
        label="Monto total"
        name="originalAmount"
        defaultValue={values?.originalAmount ?? (deuda ? centsToInput(deuda.originalCents) : undefined)}
        error={errors.originalAmount}
        hint="Por ejemplo 600000"
      />

      <SubmitButton>Guardar</SubmitButton>
    </form>
  );
}

/** Plazos rapidos para sugerir un monto mensual: matematica pura (saldo / meses), no IA. */
const PLAZOS_SUGERIDOS = [2, 4, 6];

function FormularioPago({
  categorias,
  remainingCents,
  monto,
  onMontoChange,
  onMontoBlur,
  onPagoRegistrado,
}: {
  categorias: CategoriaGasto[];
  remainingCents: number;
  monto: string;
  onMontoChange: (valor: string) => void;
  onMontoBlur: () => void;
  onPagoRegistrado: () => void;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [pending, setPending] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null);

  const opciones = categorias.map((c) => ({ value: c.id, label: c.name }));

  function elegirSugerido(sugeridoCents: number) {
    onMontoChange(centsToInput(sugeridoCents));
    onMontoBlur();
  }

  async function enviar(formData: FormData) {
    setPending(true);
    setResultado(null);
    const r = await registrarPagoDeuda(formData);
    if (r.ok) {
      setResultado({ ok: true, mensaje: "Pago registrado." });
      onPagoRegistrado(); // ya se pago, deja de descontarse del reparto
    } else {
      setResultado({ ok: false, mensaje: r.error });
    }
    setPending(false);
  }

  return (
    <form action={enviar} className="space-y-3 border-t border-border pt-4">
      <p className="text-sm font-medium">Cuanto vas a destinar este mes</p>
      <p className="text-xs text-muted">
        Este monto se descuenta de tu ingreso antes de repartir esencial/ocio/ahorro mas abajo.
      </p>

      <div className="flex flex-wrap gap-2">
        {PLAZOS_SUGERIDOS.map((meses) => {
          const sugerido = Math.ceil(remainingCents / meses / 100) * 100;
          return (
            <button
              key={meses}
              type="button"
              onClick={() => elegirSugerido(sugerido)}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition hover:bg-background"
            >
              Pagarla en {meses} meses ({formatMoney(sugerido)}/mes)
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium">
            Monto
          </label>
          <input
            id="amount"
            name="amount"
            value={monto}
            onChange={(e) => onMontoChange(e.target.value)}
            onBlur={onMontoBlur}
            className="mt-1.5 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/40"
            placeholder="Por ejemplo 300000"
          />
        </div>

        <SelectField
          label="Categoria"
          name="categoryId"
          options={opciones}
          value={categoryId}
          onChange={setCategoryId}
          placeholder="Elige una categoria"
        />
      </div>

      {resultado && (
        <p className={`flex items-center gap-1.5 text-sm ${resultado.ok ? "text-positive" : "text-negative"}`}>
          {resultado.ok && <CircleCheck className="size-4" aria-hidden />}
          {resultado.mensaje}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || inputToCents(monto) === null}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-strong disabled:opacity-60"
      >
        {pending && <Loader className="size-4 animate-spin" aria-hidden />}
        Registrar pago
      </button>
    </form>
  );
}
