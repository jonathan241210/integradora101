import type { ReactNode } from "react";
import { Alert, Button } from "@arca/ui";
import { LoadingIndicator } from "./LoadingIndicator";

/**
 * Estados de carga, error con reintento y vacío; no pinta nada si hay datos. Con `skeleton`, la
 * carga muestra ese esqueleto (dashboard-020 CA-56) en lugar del indicador con texto.
 */
export function ListStatusMessage({
  status,
  error,
  loadingText,
  emptyText,
  onRetry,
  skeleton,
}: {
  status: "loading" | "ready" | "empty" | "error";
  error: string;
  loadingText: string;
  emptyText: string;
  onRetry: () => void;
  skeleton?: ReactNode;
}) {
  if (status === "loading") {
    if (skeleton) return <>{skeleton}</>;

    return <LoadingIndicator message={loadingText} />;
  }

  if (status === "error") {
    return (
      <div className="state-message state-message--error">
        <Alert role="alert" aria-live="assertive">
          {error}
        </Alert>
        <Button variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (status === "empty") {
    return <p className="state-message">{emptyText}</p>;
  }

  return null;
}
