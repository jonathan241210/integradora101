import { Button } from "@arca/ui";

/**
 * Aviso de solicitud pendiente en «Publicadas» (CA-64). Solo presenta: el
 * indicador `has_pending_request` llega de la API y quien lo usa decide si
 * mostrarlo.
 */
export function PendingRequestNotice({
  message,
  onOpenRequests,
}: {
  message: string;
  onOpenRequests?: () => void;
}) {
  return (
    <p className="species-detail__hint" role="status">
      {message}{" "}
      {onOpenRequests && (
        <Button variant="ghost" onClick={onOpenRequests}>
          Ver la solicitud
        </Button>
      )}
    </p>
  );
}
