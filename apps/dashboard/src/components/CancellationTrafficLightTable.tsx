import { useState } from "react";
import { Badge, Button } from "@arca/ui";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { CancellationReviewHistory } from "@/components/CancellationReviewHistory";
import { Icon } from "@/components/Icon";
import type {
  CancellationReviewDto,
  CancellationTrafficLightDto,
} from "@/viewmodels/admin-types";
import type { TicketFocusTarget } from "@/viewmodels/cancellation-ticket-focus";
import { trafficLightPresentation } from "@/viewmodels/cancellation-report";
import {
  canOfferReview,
  reviewKey,
  reviewTargetFor,
  type ReviewHistoryState,
  type ReviewTarget,
} from "@/viewmodels/cancellation-review";
import { arrangeTrafficLightRows } from "@/viewmodels/cancellation-traffic-light";
import { formatCount, formatDate } from "@/viewmodels/formatters";
import { formatTicketDateTime } from "@/viewmodels/ticket-history";

/** Nivel con texto de la API e icono; el color nunca va solo (dashboard-021 CA-01). */
function LevelBadge({ row }: { row: CancellationTrafficLightDto }) {
  if (row.traffic_light === null) return <span>—</span>;

  const { tone, icon } = trafficLightPresentation(row.traffic_light);

  return (
    <Badge tone={tone}>
      <span className="traffic-light-badge traffic-light-badge--level">
        <Icon name={icon} />
        <span>{row.traffic_light_label ?? row.traffic_light}</span>
      </span>
    </Badge>
  );
}

const rowKeyOf = (row: CancellationTrafficLightDto) =>
  `${row.cashier_id ?? `none:${row.cashier_name}`}:${row.date}`;

/** Revisión vigente en la celda: estado y fecha, o «Sin revisar» (CA-04). */
function ReviewCell({
  review,
  timezone,
}: {
  review: CancellationReviewDto | null;
  timezone: string;
}) {
  if (!review) return <span>Sin revisar</span>;

  return (
    <div className="cancellation-review-current">
      <strong>{review.status_label}</strong>
      <span className="cancellation-review-current__date">{formatTicketDateTime(review.reviewed_at, timezone)}</span>
    </div>
  );
}

/**
 * Semáforo por cajero y día como tabla (dashboard-021 CA-01, CA-02, CA-04, CA-18 a CA-22).
 * Solo presenta lo que devuelve la API: nivel, señales, porqué, qué hacer y revisión; el
 * orden y el filtro son de presentación y no comparan cifras.
 */
export function CancellationTrafficLightTable({
  rows,
  timezone,
  canReview,
  history,
  onReview,
  onToggleHistory,
  onViewTickets,
  onFocusFolio,
  defaultExpandedKey = null,
  defaultOnlyToReview = false,
}: {
  rows: CancellationTrafficLightDto[];
  timezone: string;
  canReview: boolean;
  history: ReviewHistoryState;
  onReview: (target: ReviewTarget) => void;
  onToggleHistory: (target: ReviewTarget) => void;
  /** «Ver boletos»: filtra la tabla de boletos por día y cajero (CA-29). */
  onViewTickets?: (target: TicketFocusTarget) => void;
  /** Chip de folio: lleva a su fila; con el día y cajero para filtrar si no está en pantalla (CA-33). */
  onFocusFolio?: (folio: string, target: TicketFocusTarget) => void;
  /** Estado inicial de la presentación (la vista usa los valores por omisión). */
  defaultExpandedKey?: string | null;
  defaultOnlyToReview?: boolean;
}) {
  const [expandedKey, setExpandedKey] = useState<string | null>(defaultExpandedKey);
  const [onlyToReview, setOnlyToReview] = useState(defaultOnlyToReview);
  const visibleRows = arrangeTrafficLightRows(rows, { onlyToReview });

  const toggleDetail = (row: CancellationTrafficLightDto) => {
    const key = rowKeyOf(row);
    const target = reviewTargetFor(row);
    const opening = expandedKey !== key;

    setExpandedKey(opening ? key : null);

    // El historial se pide al abrir el detalle y se cierra al plegarlo (CA-09).
    if (canReview && target && row.review) {
      const loaded = history.key === reviewKey(target);

      if (opening !== loaded) onToggleHistory(target);
    }
  };

  const columns: DataTableColumn<CancellationTrafficLightDto>[] = [
    { key: "date", header: "Fecha", className: "traffic-col traffic-col--date", render: (row) => formatDate(row.date) },
    { key: "cashier", header: "Cajero", className: "traffic-col traffic-col--cashier", render: (row) => row.cashier_name },
    { key: "level", header: "Nivel", className: "traffic-col traffic-col--level", render: (row) => <LevelBadge row={row} /> },
    {
      key: "sold",
      header: "Vendidos",
      className: "traffic-col traffic-col--num",
      render: (row) => (row.sold_tickets === undefined ? "—" : formatCount(row.sold_tickets)),
    },
    {
      key: "cancelled",
      header: "Cancelados",
      className: "traffic-col traffic-col--num",
      render: (row) => (row.cancelled_tickets === undefined ? "—" : formatCount(row.cancelled_tickets)),
    },
    {
      key: "percent",
      header: "% cancelado",
      className: "traffic-col traffic-col--num",
      render: (row) => (row.cancel_percent === undefined ? "—" : `${row.cancel_percent} %`),
    },
    {
      key: "signals",
      header: "Señales",
      className: "traffic-col traffic-col--signals",
      render: (row) =>
        row.traffic_light === null ? (
          <span>—</span>
        ) : (
          <div className="cancellation-signals">
            <strong>{row.signals_count}</strong>
            {row.reason_sentence && <span className="cancellation-signals__reason">{row.reason_sentence}</span>}
          </div>
        ),
    },
    {
      key: "review",
      header: "Revisión vigente",
      className: "traffic-col traffic-col--review",
      render: (row) =>
        row.cashier_id === null ? (
          <span>No aplica</span>
        ) : (
          <ReviewCell review={row.review} timezone={timezone} />
        ),
    },
    {
      key: "actions",
      header: "Acción",
      className: "traffic-col traffic-col--actions",
      render: (row) => {
        const target = reviewTargetFor(row);
        const key = rowKeyOf(row);

        return (
          <span className="cancellation-review-actions">
            {canReview && canOfferReview(row) && target && (
              <Button
                type="button"
                variant="secondary"
                aria-label={`Registrar revisión de ${row.cashier_name} del ${formatDate(row.date)}`}
                onClick={() => onReview(target)}
              >
                Registrar revisión
              </Button>
            )}
            {canReview && !target && <span>No aplica</span>}
            {onViewTickets && row.cashier_id !== null && (
              <Button
                type="button"
                variant="secondary"
                aria-label={`Ver boletos de ${row.cashier_name} del ${formatDate(row.date)}`}
                onClick={() =>
                  onViewTickets({ cashierId: row.cashier_id as number, cashierName: row.cashier_name, date: row.date })
                }
              >
                Ver boletos
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              aria-expanded={expandedKey === key}
              aria-label={`Ver detalle de ${row.cashier_name} del ${formatDate(row.date)}`}
              onClick={() => toggleDetail(row)}
            >
              Ver detalle
            </Button>
          </span>
        );
      },
    },
  ];

  return (
    <>
      <div className="cancellation-review-filter">
        <label>
          <input
            type="checkbox"
            checked={onlyToReview}
            onChange={(event) => setOnlyToReview(event.target.checked)}
          />
          Mostrar solo días por revisar
        </label>
      </div>
      {visibleRows.length === 0 ? (
        <p className="state-message">No hay días por revisar en el periodo.</p>
      ) : (
        <DataTable
          caption="Semáforo por cajero y día"
          columns={columns}
          rows={visibleRows}
          rowKey={rowKeyOf}
          rowDetail={(row) => {
            if (expandedKey !== rowKeyOf(row)) return null;

            const target = reviewTargetFor(row);

            return (
              <div className="cancellation-review-detail">
                <section aria-label="Qué hacer" className="cancellation-review-detail__block">
                  <h4>Qué hacer</h4>
                  <p>{row.action}</p>
                </section>
                {row.reasons.length > 0 && (
                  <section aria-label="Señales y folios" className="cancellation-review-detail__block">
                    <h4>Señales y folios</h4>
                    <ul className="cancellation-signal-list">
                      {row.reasons.map((reason) => (
                        <li key={reason.code} className="cancellation-signal-list__item">
                          <span>
                            <strong>{reason.label}</strong>
                            {` · ${formatCount(reason.count)} ${reason.count === 1 ? "boleto" : "boletos"}`}
                          </span>
                          {reason.detail && (
                            <span className="cancellation-signals__reason">{reason.detail}</span>
                          )}
                          {reason.folios.length > 0 && (
                            <span className="cancellation-folio-chips" role="group" aria-label={`Folios de ${reason.label}`}>
                              {reason.folios.map((folio) => (
                                <button
                                  type="button"
                                  key={folio}
                                  className="cancellation-folio-chip"
                                  aria-label={`Ir al folio ${folio}`}
                                  disabled={!onFocusFolio || row.cashier_id === null}
                                  onClick={() =>
                                    onFocusFolio?.(folio, {
                                      cashierId: row.cashier_id as number,
                                      cashierName: row.cashier_name,
                                      date: row.date,
                                    })
                                  }
                                >
                                  {folio}
                                </button>
                              ))}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {canReview && target && row.review && history.key === reviewKey(target) && (
                  <section
                    aria-label="Historial de revisiones del día"
                    className="cancellation-review-detail__block"
                  >
                    <h4>Historial de revisiones</h4>
                    <CancellationReviewHistory history={history} timezone={timezone} />
                  </section>
                )}
              </div>
            );
          }}
        />
      )}
    </>
  );
}
