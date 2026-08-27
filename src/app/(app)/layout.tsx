import { LayoutDashboard, LogOut, ScaleIcon } from "lucide-react";
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
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-6 px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <ScaleIcon className="size-5 text-brand" strokeWidth={1.75} />
            Balanz
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-muted transition hover:bg-background hover:text-foreground"
            >
              <LayoutDashboard className="size-4" />
              Panel
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:block">{user.email}</span>
            <form action={salir}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted transition hover:bg-background hover:text-foreground"
              >
                <LogOut className="size-4" />
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
