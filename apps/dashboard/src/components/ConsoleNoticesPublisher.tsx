import { useEffect, useRef } from "react";
import { usePublishNotice } from "@/components/DashboardNotifications";
import type { ConsoleNoticesViewModel } from "@/viewmodels/console-notices";

/**
 * Publica los avisos de consola en la cola de `DashboardNotifications`
 * (dashboard-017 CA-19 a CA-25) y los marca como leídos al mostrarse. Una sola
 * vez por inicio de sesión: el `nonce` evita duplicados al cambiar de sección.
 */
export function ConsoleNoticesPublisher({ state, actions }: ConsoleNoticesViewModel) {
  const publish = usePublishNotice();
  const handled = useRef(0);
  const failed = useRef("");

  useEffect(() => {
    const announcement = state.announcement;

    if (!announcement || !publish || handled.current === announcement.nonce) return;
    handled.current = announcement.nonce;
    announcement.messages.forEach((message) => publish(message, "info"));
    actions.markRead(announcement.readIds);
  }, [state.announcement, publish, actions]);

  useEffect(() => {
    if (state.status !== "error" || !publish || failed.current === state.error) return;
    failed.current = state.error;
    publish(state.error, "error");
  }, [state.status, state.error, publish]);

  return null;
}
