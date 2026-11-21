import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { Alert, Button } from "@arca/ui";
import { Icon } from "@/components/Icon";
import {
  initialNotifications,
  notificationsReducer,
  type DashboardNotification,
  type NotificationTone,
} from "@/viewmodels/dashboard-notifications";

type PublishNotification = (message: string, tone: NotificationTone) => void;

const PublishContext = createContext<PublishNotification | null>(null);

const notificationLabels: Record<NotificationTone, string> = {
  success: "Éxito",
  error: "Error",
};

function NotificationIcon({ tone }: { tone: NotificationTone }) {
  return (
    <span className="notification-icon" aria-hidden="true">
      <Icon name={tone === "error" ? "close" : "check"} />
    </span>
  );
}

export function usePublishNotification(message: string, tone: NotificationTone) {
  const publish = useContext(PublishContext);
  const lastMessage = useRef("");

  useEffect(() => {
    if (message && message !== lastMessage.current) publish?.(message, tone);
    lastMessage.current = message;
  }, [message, publish, tone]);

  return publish !== null;
}

export function ActionError({ message, inDialog = false }: { message: string; inDialog?: boolean }) {
  const hasNotifications = usePublishNotification(message, "error");
  if (!message) return null;

  return (
    <Alert
      className={inDialog ? "dialog-alert" : "inline-alert action-error"}
      role={hasNotifications && !inDialog ? "none" : "alert"}
    >
      {message}
    </Alert>
  );
}

export function NotificationAlert({
  item,
  onDismiss,
}: {
  item: DashboardNotification;
  onDismiss: () => void;
}) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!closing) {
      const timer = window.setTimeout(() => setClosing(true), 5000);
      return () => window.clearTimeout(timer);
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(onDismiss, reducedMotion ? 0 : 220);
    return () => window.clearTimeout(timer);
  }, [closing, onDismiss]);

  return (
    <div
      className="dashboard-notification"
      data-tone={item.tone}
      data-closing={closing || undefined}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget && event.animationName === "notification-exit") onDismiss();
      }}
    >
      <Alert className="dashboard-notification__message" role={item.tone === "error" ? "alert" : "status"}>
        <NotificationIcon tone={item.tone} />
        <div>
          <strong>{notificationLabels[item.tone]}</strong>
          <p>{item.message}</p>
        </div>
      </Alert>
      <Button className="dashboard-notification__close" variant="ghost" aria-label="Cerrar aviso" onClick={() => setClosing(true)}>
        <Icon name="close" />
      </Button>
    </div>
  );
}

export function DashboardNotifications({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(notificationsReducer, initialNotifications);
  const publish = useCallback<PublishNotification>((message, tone) => {
    dispatch({ type: "publish", message, tone });
  }, []);
  const visible = state.visible;
  const dismiss = useCallback(() => {
    if (visible) dispatch({ type: "dismiss", id: visible.id });
  }, [visible]);

  return (
    <PublishContext.Provider value={publish}>
      {children}
      {visible && (
        <NotificationAlert
          key={visible.id}
          item={visible}
          onDismiss={dismiss}
        />
      )}
    </PublishContext.Provider>
  );
}

