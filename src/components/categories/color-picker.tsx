"use client";

import { CATEGORY_COLORS } from "@/lib/category-icons";

export function ColorPicker({
  name,
  value,
  onChange,
  error,
}: {
  name: string;
  value: string;
  onChange: (color: string) => void;
  error?: string;
}) {
  return (
    <div>
      <span className="block text-sm font-medium">Color</span>
      <input type="hidden" name={name} value={value} />
      <div role="radiogroup" aria-label="Color" className="mt-1.5 flex flex-wrap gap-2">
        {CATEGORY_COLORS.map((color) => {
          const seleccionado = color === value;

          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={seleccionado}
              aria-label={color}
              onClick={() => onChange(color)}
              className={`size-7 rounded-full ring-offset-2 ring-offset-surface transition ${
                seleccionado ? "ring-2" : ""
              }`}
              style={{ background: color, ["--tw-ring-color" as string]: color }}
            />
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-sm text-negative">{error}</p>}
    </div>
  );
}
