import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-lg font-semibold">Entrar</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        Sigue donde dejaste tus cuentas.
      </p>

      <LoginForm />

      <p className="mt-6 text-center text-sm text-muted">
        No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-brand hover:underline">
          Crear una
        </Link>
      </p>
    </>
  );
}
