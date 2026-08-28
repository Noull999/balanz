"use client";

import { CATEGORY_ICONS, ICON_NAMES, type CategoryIconName } from "@/lib/category-icons";

export function IconPicker({
  name,
  value,
  onChange,
  error,
}: {
  name: string;
  value: CategoryIconName;
  onChange: (icon: CategoryIconName) => void;
  error?: string;
}) {
  return (
    <div>
      <span className="block text-sm font-medium">Icono</span>
      <input type="hidden" name={name} value={value} />
      <div
        role="radiogroup"
        aria-label="Icono"
        className="mt-1.5 grid grid-cols-8 gap-1.5 sm:grid-cols-10"
      >
        {ICON_NAMES.map((icono) => {
          const Icono = CATEGORY_ICONS[icono];
          const seleccionado = icono === value;

          return (
            <button
              key={icono}
              type="button"
              role="radio"
              aria-checked={seleccionado}
              aria-label={icono}
              onClick={() => onChange(icono)}
              className={`flex aspect-square items-center justify-center rounded-lg border transition ${
                seleccionado
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border text-muted hover:bg-surface"
              }`}
            >
              <Icono className="size-4" />
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-sm text-negative">{error}</p>}
    </div>
  );
}
