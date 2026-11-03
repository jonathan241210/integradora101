import type { ReactNode } from "react";
import { FieldErrors, type FieldErrorMap } from "./FieldErrors";

/** Celda del formulario fijo: el control y sus mensajes 422 (CA-07). */
export function FormField({
  id,
  name,
  errors,
  span = "single",
  children,
}: {
  id: string;
  name: string;
  errors: FieldErrorMap;
  span?: "single" | "half" | "wide";
  children: ReactNode;
}) {
  return (
    <div className={`form-field form-field--${span}`}>
      {children}
      <FieldErrors id={id} errors={errors} name={name} />
    </div>
  );
}
