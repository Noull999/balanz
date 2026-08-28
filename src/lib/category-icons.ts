import {
  Baby,
  Banknote,
  Bike,
  Book,
  Bus,
  Car,
  CirclePlus,
  Clapperboard,
  Coffee,
  CreditCard,
  Dumbbell,
  Ellipsis,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  Music,
  PawPrint,
  PiggyBank,
  Pill,
  Plane,
  Repeat,
  Shirt,
  ShoppingCart,
  Smartphone,
  TrendingUp,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";

/**
 * Set acotado a proposito. Se importan por nombre, no dinamicamente: asi el
 * bundle lleva solo estos 34 iconos y no los ~1500 de lucide.
 */
export const CATEGORY_ICONS = {
  Wallet,
  Banknote,
  PiggyBank,
  CreditCard,
  TrendingUp,
  CirclePlus,
  Laptop,
  ShoppingCart,
  Utensils,
  Coffee,
  Bike,
  Bus,
  Car,
  Fuel,
  Plane,
  House,
  Zap,
  Wifi,
  Smartphone,
  Shirt,
  Clapperboard,
  Music,
  Gamepad2,
  Book,
  GraduationCap,
  Dumbbell,
  HeartPulse,
  Pill,
  Baby,
  PawPrint,
  Gift,
  Wrench,
  Repeat,
  Ellipsis,
} as const;

export type CategoryIconName = keyof typeof CATEGORY_ICONS;

export const ICON_NAMES = Object.keys(CATEGORY_ICONS) as CategoryIconName[];

export function esIconoValido(name: string): name is CategoryIconName {
  return name in CATEGORY_ICONS;
}

/** Paleta fija: colores que se distinguen entre si en los graficos del panel. */
export const CATEGORY_COLORS = [
  "#0d9488",
  "#0891b2",
  "#0284c7",
  "#6366f1",
  "#7c3aed",
  "#db2777",
  "#e11d48",
  "#ea580c",
  "#ca8a04",
  "#65a30d",
  "#16a34a",
  "#64748b",
] as const;
