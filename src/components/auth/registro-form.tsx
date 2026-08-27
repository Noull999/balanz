"use client";

import { useActionState } from "react";

import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { SubmitButton } from "@/components/ui/submit-button";
import { registrar, type FormState } from "@/lib/actions/auth";

export function RegistroForm() {
  const [state, formAction] = useActionState<FormState, FormData>(registrar, null);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={errors.form} />

      <Field
        label="Nombre"
        name="name"
        autoComplete="name"
        error={errors.name}
      />

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        error={errors.email}
      />

      <Field
        label="Contrasena"
        name="password"
        type="password"
        autoComplete="new-password"
        error={errors.password}
        hint="Minimo 8 caracteres"
      />

      <SubmitButton>Crear cuenta</SubmitButton>
    </form>
  );
}
