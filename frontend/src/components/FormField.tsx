import { cloneElement, type ReactElement } from "react";

export function FormField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactElement<{
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }>;
}) {
  const descriptions = [
    hint ? `${id}-hint` : null,
    error ? `${id}-error` : null,
  ].filter((description): description is string => description !== null);
  const control = cloneElement(children, {
    id,
    "aria-describedby": descriptions.length > 0 ? descriptions.join(" ") : undefined,
    "aria-invalid": error ? true : undefined,
  });

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      {control}
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
