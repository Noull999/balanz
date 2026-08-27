"use client";

import { useActionState } from "react";

import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { SubmitButton } from "@/components/ui/submit-button";
import { ingresar, type FormState } from "@/lib/actions/auth";

export function LoginForm() {
  const [state, formAction] = useActionState<FormState, FormData>(ingresar, null);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={errors.form} />

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
        autoComplete="current-password"
        error={errors.password}
      />

      <SubmitButton>Entrar</SubmitButton>
    </form>
  );
}
