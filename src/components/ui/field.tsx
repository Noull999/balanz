type FieldProps = {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
  required?: boolean;
};

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  defaultValue,
  error,
  hint,
  required = true,
}: FieldProps) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`mt-1.5 block w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-brand/40 ${
          error ? "border-negative" : "border-border focus:border-brand"
        }`}
      />
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-negative">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
