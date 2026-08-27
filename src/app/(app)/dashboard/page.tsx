import type { Metadata } from "next";

import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Panel" };

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">
        Hola{user.name ? `, ${user.name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-1 text-muted">
        Tu cuenta esta lista. El proximo paso es cargar movimientos.
      </p>

      <div className="mt-8 rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted">
          Aca van a estar el resumen del mes, los graficos y las
          recomendaciones.
        </p>
      </div>
    </>
  );
}
