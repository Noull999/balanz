"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { ColorPicker } from "@/components/categories/color-picker";
import { IconPicker } from "@/components/categories/icon-picker";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/actions/auth";
import { CATEGORY_COLORS, type CategoryIconName } from "@/lib/category-icons";

type CategoriaFormProps = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  inicial?: {
    name: string;
    kind: "INCOME" | "EXPENSE";
    color: string;
    icon: CategoryIconName;
  };
  submitLabel: string;
};

export function CategoriaForm({ action, inicial, submitLabel }: CategoriaFormProps) {
  const [state, formAction] = useActionState<FormState, FormData>(action, null);
  const errors = state?.errors ?? {};
  const values = state?.values;

  const [kind, setKind] = useState<"INCOME" | "EXPENSE">(
    (values?.kind as "INCOME" | "EXPENSE") ?? inicial?.kind ?? "EXPENSE",
  );
  const [color, setColor] = useState(values?.color ?? inicial?.color ?? CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState<CategoryIconName>(
    (values?.icon as CategoryIconName) ?? inicial?.icon ?? "Wallet",
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="kind" value={kind} />
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
              onClick={() => setKind(opcion.valor)}
              aria-pressed={kind === opcion.valor}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                kind === opcion.valor
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
        label="Nombre"
        name="name"
        defaultValue={values?.name ?? inicial?.name}
        error={errors.name}
      />

      <ColorPicker name="color" value={color} onChange={setColor} error={errors.color} />
      <IconPicker name="icon" value={icon} onChange={setIcon} error={errors.icon} />

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link
          href="/categorias"
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-surface"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
