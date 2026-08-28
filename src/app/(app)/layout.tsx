import { ArrowLeftRight, LayoutDashboard, LogOut, PiggyBank, ScaleIcon, Tags } from "lucide-react";
import Link from "next/link";

import { salir } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Toda pantalla dentro de este layout exige sesion. Al hacerlo aca y no en cada
  // page, no hay forma de agregar una pantalla y olvidarse de protegerla.
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-2 px-3 sm:gap-6 sm:px-6">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2 font-semibold">
            <ScaleIcon className="size-5 text-brand" strokeWidth={1.75} />
            <span className="hidden sm:inline">Balanz</span>
          </Link>

          <nav className="flex min-w-0 items-center gap-0.5 text-sm sm:gap-1">
            <Link
              href="/dashboard"
              title="Panel"
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted transition hover:bg-background hover:text-foreground sm:px-2.5"
            >
              <LayoutDashboard className="size-4" />
              <span className="hidden sm:inline">Panel</span>
            </Link>
            <Link
              href="/movimientos"
              title="Movimientos"
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted transition hover:bg-background hover:text-foreground sm:px-2.5"
            >
              <ArrowLeftRight className="size-4" />
              <span className="hidden sm:inline">Movimientos</span>
            </Link>
            <Link
              href="/categorias"
              title="Categorias"
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted transition hover:bg-background hover:text-foreground sm:px-2.5"
            >
              <Tags className="size-4" />
              <span className="hidden sm:inline">Categorias</span>
            </Link>
            <Link
              href="/presupuestos"
              title="Presupuestos"
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted transition hover:bg-background hover:text-foreground sm:px-2.5"
            >
              <PiggyBank className="size-4" />
              <span className="hidden sm:inline">Presupuestos</span>
            </Link>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <span className="hidden text-sm text-muted lg:block">{user.email}</span>
            <form action={salir}>
              <button
                type="submit"
                title="Salir"
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted transition hover:bg-background hover:text-foreground sm:px-2.5"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
