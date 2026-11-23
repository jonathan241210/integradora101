import { Alert } from "@arca/ui";
import type { ReviewHistoryState } from "@/viewmodels/cancellation-review";
import { formatTicketDateTime } from "@/viewmodels/ticket-history";

/**
 * Historial de revisiones de un cajero y día, de la más reciente a la más antigua (CA-09),
 * como tabla pequeña: fecha, estado, nota y quién la hizo (dashboard-021 CA-24).
 */
export function CancellationReviewHistory({
  history,
  timezone,
}: {
  history: ReviewHistoryState;
  timezone: string;
}) {
  if (history.status === "loading") return <p className="state-message">Cargando historial…</p>;
  if (history.status === "error") return <Alert role="alert">{history.error}</Alert>;
  if (history.items.length === 0) return <p className="state-message">Sin revisiones registradas.</p>;

  return (
    <div className="cancellation-review-history-scroll">
      <table className="cancellation-review-history" aria-label="Historial de revisiones">
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Estado</th>
            <th scope="col">Nota</th>
            <th scope="col">Quién</th>
          </tr>
        </thead>
        <tbody>
          {history.items.map((item) => (
            <tr key={item.id}>
              <td>{formatTicketDateTime(item.reviewed_at, timezone)}</td>
              <td>{item.status_label}</td>
              <td>{item.note}</td>
              <td>{item.reviewed_by_name ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
