import type { ReactNode } from "react";
import { ListStatusMessage } from "@/components/ListStatusMessage";
import { TicketReportSkeleton } from "@/components/LoadingSkeletons";

/**
 * Estados de carga, vacío y error de una pestaña de reportes (dashboard-020 CA-17). La carga
 * muestra el esqueleto de la pestaña (CA-57); el error es estado de la vista y ofrece
 * reintentar (RN-07 categoría 4).
 */
export function ReportViewState({
  status,
  error,
  onRetry,
  loadingText = "Cargando el reporte…",
  emptyText = "",
  skeleton,
}: {
  status: "loading" | "ready" | "empty" | "error";
  error: string;
  onRetry: () => void;
  loadingText?: string;
  emptyText?: string;
  /** Esqueleto propio de la pestaña; por defecto el del reporte de boletos. */
  skeleton?: ReactNode;
}) {
  return (
    <ListStatusMessage
      status={status}
      error={error}
      loadingText={loadingText}
      emptyText={emptyText}
      onRetry={onRetry}
      skeleton={skeleton ?? <TicketReportSkeleton label={loadingText} />}
    />
  );
}
