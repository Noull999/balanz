import { CategoryKind } from "@/generated/prisma/enums";

/**
 * Con que arranca una cuenta nueva. Sin esto la primera pantalla pide categorias
 * antes de dejar cargar el primer gasto, que es la peor forma de empezar.
 * El usuario despues las edita o borra desde Categorias.
 */
export const DEFAULT_CATEGORIES = [
  { name: "Sueldo", kind: CategoryKind.INCOME, color: "#0d9488", icon: "Banknote" },
  { name: "Freelance", kind: CategoryKind.INCOME, color: "#0891b2", icon: "Laptop" },
  { name: "Otros ingresos", kind: CategoryKind.INCOME, color: "#65a30d", icon: "CirclePlus" },

  { name: "Supermercado", kind: CategoryKind.EXPENSE, color: "#ea580c", icon: "ShoppingCart" },
  { name: "Delivery", kind: CategoryKind.EXPENSE, color: "#e11d48", icon: "Bike" },
  { name: "Transporte", kind: CategoryKind.EXPENSE, color: "#7c3aed", icon: "Bus" },
  { name: "Alquiler", kind: CategoryKind.EXPENSE, color: "#0284c7", icon: "House" },
  { name: "Servicios", kind: CategoryKind.EXPENSE, color: "#ca8a04", icon: "Zap" },
  { name: "Ocio", kind: CategoryKind.EXPENSE, color: "#db2777", icon: "Clapperboard" },
  { name: "Salud", kind: CategoryKind.EXPENSE, color: "#16a34a", icon: "HeartPulse" },
  { name: "Suscripciones", kind: CategoryKind.EXPENSE, color: "#6366f1", icon: "Repeat" },
  { name: "Otros gastos", kind: CategoryKind.EXPENSE, color: "#64748b", icon: "Ellipsis" },
] as const;
