"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/actions/auth";
import { todayInput } from "@/lib/date";

type Categoria = { id: string; name: string; kind: "INCOME" | "EXPENSE" };

type MovimientoFormProps = {
  categorias: Categoria[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  /** Valores iniciales cuando se esta editando un movimiento existente. */
  inicial?: {
    type: "INCOME" | "EXPENSE";
    description: string;
    date: string;
    amount: string;
    categoryId: string;
  };
  submitLabel: string;
};

export function MovimientoForm({
  categorias,
  action,
  inicial,
  submitLabel,
}: MovimientoFormProps) {
  const [state, formAction] = useActionState<FormState, FormData>(action, null);
  const errors = state?.errors ?? {};
  const values = state?.values;

  // Tipo y categoria son controlados porque estan atados entre si: al cambiar de
  // gasto a ingreso, la categoria elegida deja de tener sentido y hay que limpiarla.
  const [tipo, setTipo] = useState<"INCOME" | "EXPENSE">(
    (values?.type as "INCOME" | "EXPENSE") ?? inicial?.type ?? "EXPENSE",
  );
  const [categoriaId, setCategoriaId] = useState(
    values?.categoryId ?? inicial?.categoryId ?? "",
  );

  const opciones = categorias
    .filter((categoria) => categoria.kind === tipo)
    .map((categoria) => ({ value: categoria.id, label: categoria.name }));

  function cambiarTipo(nuevo: "INCOME" | "EXPENSE") {
    setTipo(nuevo);
    setCategoriaId("");
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="type" value={tipo} />
      <FormError message={errors.form} />

      <div>
        <span className="block text-sm font-medium">Tipo</span>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {(
            [
              { valor: "EXPENSE", etiqueta: "Gasto" },
              { valor: "INCOME", etiqueta: "Ingreso" },
            ] as const
          ).map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => cambiarTipo(opcion.valor)}
              aria-pressed={tipo === opcion.valor}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                tipo === opcion.valor
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border text-muted hover:bg-surface"
              }`}
            >
              {opcion.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <Field
        label="Descripcion"
        name="description"
        defaultValue={values?.description ?? inicial?.description}
        error={errors.description}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Monto"
          name="amount"
          defaultValue={values?.amount ?? inicial?.amount}
          error={errors.amount}
          hint="Por ejemplo 12500 o 12.500,50"
        />

        <Field
          label="Fecha"
          name="date"
          type="date"
          defaultValue={values?.date ?? inicial?.date ?? todayInput()}
          error={errors.date}
        />
      </div>

      <SelectField
        label="Categoria"
        name="categoryId"
        options={opciones}
        value={categoriaId}
        onChange={setCategoriaId}
        error={errors.categoryId}
        placeholder={tipo === "EXPENSE" ? "Elegi un gasto" : "Elegi un ingreso"}
      />

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link
          href="/movimientos"
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-surface"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
