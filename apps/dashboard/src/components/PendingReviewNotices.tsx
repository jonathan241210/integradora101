import { useEffect, useRef } from "react";
import { usePublishNotice } from "@/components/DashboardNotifications";
import type { PendingAnnouncement } from "@/viewmodels/pending-review";

/**
 * Publica los avisos de pendientes una vez por inicio (dashboard-018 RN-03,
 * CA-04). Solo muestra textos fijos con cifras (CA-12); la cola de
 * `DashboardNotifications` los espera detrás de otros avisos (CA-15).
 */
export function PendingReviewNotices({ announcement }: { announcement: PendingAnnouncement | null }) {
  const publish = usePublishNotice();
  const published = useRef(0);

  useEffect(() => {
    if (!announcement || !publish || published.current === announcement.nonce) return;
    published.current = announcement.nonce;
    announcement.messages.forEach((message) => publish(message, "info"));
  }, [announcement, publish]);

  return null;
}
