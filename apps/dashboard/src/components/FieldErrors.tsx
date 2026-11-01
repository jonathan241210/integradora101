export type FieldErrorMap = Record<string, string[]>;

/** Atributos de accesibilidad de un campo con errores 422. */
export function fieldErrorProps(id: string, errors: FieldErrorMap, name: string) {
  const messages = errors[name];

  return messages && messages.length > 0
    ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` }
    : {};
}

/** Mensajes 422 junto a su campo. */
export function FieldErrors({
  id,
  errors,
  name,
}: {
  id: string;
  errors: FieldErrorMap;
  name: string;
}) {
  const messages = errors[name];

  if (!messages || messages.length === 0) return null;

  return (
    <p className="field-error" id={`${id}-error`}>
      {messages.join(" ")}
    </p>
  );
}
