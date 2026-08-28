"use client";

import { useActionState } from "react";

import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/actions/auth";
import { centsToInput } from "@/lib/money";

export function PresupuestoForm({
  action,
  limiteActualCents,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  limiteActualCents: number | null;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, null);
  const errors = state?.errors ?? {};
  const values = state?.values;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={errors.form} />

      <Field
        label="Limite mensual"
        name="monthlyLimit"
        defaultValue={
          values?.monthlyLimit ?? (limiteActualCents ? centsToInput(limiteActualCents) : undefined)
        }
        error={errors.monthlyLimit}
        hint="Por ejemplo 50000 o 50.000,00"
      />

      <SubmitButton>Guardar</SubmitButton>
    </form>
  );
}
