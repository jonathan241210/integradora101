import { Alert, Button } from "@arca/ui";
import { Icon } from "./Icon";

/** Aviso de éxito accesible (`role="status"`) con botón de cierre. */
export function NoticeBar({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  if (!message) return null;

  return (
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
}
