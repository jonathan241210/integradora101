import type { Ref } from "react";
import { Alert, Button } from "@arca/ui";
import { usePublishNotification } from "./DashboardNotifications";
import { Icon } from "./Icon";
import type { NotificationTone } from "@/viewmodels/dashboard-notifications";

/** Aviso de éxito accesible (`role="status"`) con botón de cierre. */
export function NoticeBar({
  message,
  onDismiss,
  focusRef,
  tone = "success",
}: {
  message: string;
  onDismiss: () => void;
  /** Si se entrega, el aviso puede recibir el foco (p. ej. tras eliminar, CA-12). */
  focusRef?: Ref<HTMLDivElement>;
  tone?: NotificationTone;
}) {
  const hasNotifications = usePublishNotification(message, tone);
  if (!message) return null;

  if (hasNotifications) {
    return focusRef ? <div ref={focusRef} tabIndex={-1} className="notice-focus-anchor">{message}</div> : null;
  }

  const alert = (
    <Alert className="global-feedback" role={tone === "error" ? "alert" : "status"}>
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
