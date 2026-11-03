import { Button } from "@arca/ui";

/**
 * Botón mostrar/ocultar de un campo de contraseña. El texto cambia según el
 * estado (no se usa `aria-pressed` además, para no anunciarlo dos veces).
 */
export function PasswordVisibilityToggle({
  controls,
  visible,
  onToggle,
}: {
  controls: string;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      className="password-visibility-toggle"
      type="button"
      variant="ghost"
      aria-controls={controls}
      onClick={onToggle}
    >
      {visible ? "Ocultar contraseña" : "Mostrar contraseña"}
    </Button>
  );
}
