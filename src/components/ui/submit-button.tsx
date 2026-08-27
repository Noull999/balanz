"use client";

import { Loader } from "lucide-react";
import { useFormStatus } from "react-dom";

/**
 * Va dentro de un <form>: useFormStatus lee el estado del form que lo contiene,
 * asi que el boton sabe solo cuando esta pendiente sin que le pasen props.
 */
export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-strong disabled:opacity-60"
    >
      {pending && <Loader className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
