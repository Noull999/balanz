import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Si ya hay sesion, login y registro no tienen sentido.
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="block text-center text-xl font-semibold tracking-tight"
        >
          Balanz
        </Link>
        <div className="mt-6 rounded-xl border border-border bg-surface p-6">
          {children}
        </div>
      </div>
    </main>
  );
}
