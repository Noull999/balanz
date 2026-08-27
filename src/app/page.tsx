import { ArrowUpRight, ScaleIcon } from "lucide-react";

const pasos = [
  { titulo: "Setup del proyecto", listo: true },
  { titulo: "Cuentas y login", listo: false },
  { titulo: "Carga de movimientos", listo: false },
  { titulo: "Categorias propias", listo: false },
  { titulo: "Dashboard del mes", listo: false },
  { titulo: "Motor de recomendaciones", listo: false },
  { titulo: "Presupuestos", listo: false },
];

export default function Home() {
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
          Tus gastos, con alguien que los mira por vos.
        </h1>

        <p className="mt-4 text-lg text-muted text-pretty">
          Registras lo que gastas y Balanz encuentra los patrones: en que se te fue
          mas plata este mes, que suscripciones pagas sin darte cuenta y cuando
          estas por pasarte del presupuesto.
        </p>

        <div className="mt-10 rounded-xl border border-border bg-surface p-5">
          <p className="text-sm font-medium">En construccion</p>
          <ul className="mt-4 space-y-2.5">
            {pasos.map((paso) => (
              <li key={paso.titulo} className="flex items-center gap-3 text-sm">
                <span
                  className={`size-1.5 shrink-0 rounded-full ${
                    paso.listo ? "bg-brand" : "bg-border"
                  }`}
                  aria-hidden
                />
                <span className={paso.listo ? "" : "text-muted"}>
                  {paso.titulo}
                </span>
                {paso.listo && (
                  <span className="ml-auto text-xs text-brand">listo</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <a
          href="https://github.com"
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-strong"
        >
          Ver el codigo
          <ArrowUpRight className="size-4" />
        </a>
      </div>
    </main>
  );
}
