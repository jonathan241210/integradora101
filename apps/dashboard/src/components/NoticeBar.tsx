import type { Ref } from "react";
import { Alert, Button } from "@arca/ui";
import { Icon } from "./Icon";

/** Aviso de éxito accesible (`role="status"`) con botón de cierre. */
export function NoticeBar({
  message,
  onDismiss,
  focusRef,
}: {
  message: string;
  onDismiss: () => void;
  /** Si se entrega, el aviso puede recibir el foco (p. ej. tras eliminar, CA-12). */
  focusRef?: Ref<HTMLDivElement>;
}) {
  if (!message) return null;

  const alert = (
    <Alert className="global-feedback" role="status" aria-live="polite">
      {message}
      <Button
        className="feedback-close"
        variant="ghost"
        aria-label="Cerrar aviso"
        onClick={onDismiss}
      >
        <Icon name="close" />
      </Button>
    </Alert>
  );

  return focusRef ? (
    <div ref={focusRef} tabIndex={-1} className="notice-focus">
      {alert}
    </div>
  ) : (
    alert
  );
}
