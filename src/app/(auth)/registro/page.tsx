import type { Metadata } from "next";
import Link from "next/link";

import { RegistroForm } from "@/components/auth/registro-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return (
    <>
      <h1 className="text-lg font-semibold">Crear cuenta</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        Arranca con las categorias basicas ya cargadas.
      </p>

      <RegistroForm />

      <p className="mt-6 text-center text-sm text-muted">
        Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Entrar
        </Link>
      </p>
    </>
  );
}
