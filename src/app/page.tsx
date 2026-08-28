import { ArrowRight, ScaleIcon } from "lucide-react";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <ScaleIcon className="size-6" strokeWidth={1.75} />
          </span>
          <span className="text-2xl font-semibold tracking-tight">Balanz</span>
        </div>

        <h1 className="mt-8 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Tus gastos, con alguien que los mira por ti.
        </h1>

        <p className="mt-4 text-lg text-muted text-pretty">
          Registras lo que gastas y Balanz encuentra los patrones: en que se te fue
          mas plata este mes, que suscripciones pagas sin darte cuenta y cuando
          estas por pasarte del presupuesto.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-strong"
            >
              Ir a mi panel
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/registro"
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-strong"
              >
                Crear cuenta
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-surface"
              >
                Ya tengo cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
