import { Alert, Button } from "@arca/ui";

/** Estados de carga, error con reintento y vacío; no pinta nada si hay datos. */
export function ListStatusMessage({
  status,
  error,
  loadingText,
  emptyText,
  onRetry,
}: {
  status: "loading" | "ready" | "empty" | "error";
  error: string;
  loadingText: string;
  emptyText: string;
  onRetry: () => void;
}) {
  if (status === "loading") {
    return (
      <p className="state-message" role="status" aria-live="polite">
        {loadingText}
      </p>
    );
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
