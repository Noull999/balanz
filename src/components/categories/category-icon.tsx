import { CATEGORY_ICONS, esIconoValido } from "@/lib/category-icons";

export function CategoryIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  // Si una categoria vieja quedo con un icono que ya no esta en el set, cae al
  // generico en vez de romper la pantalla.
  const Icono = esIconoValido(name) ? CATEGORY_ICONS[name] : CATEGORY_ICONS.Wallet;
  return <Icono className={className} aria-hidden />;
}
