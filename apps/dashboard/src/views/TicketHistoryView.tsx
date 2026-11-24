import { useState, type FormEvent } from "react";
import { Badge, Button, Card, Field, Pagination, SelectField } from "@arca/ui";
import { CancelTicketDialog } from "@/components/CancelTicketDialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { ListStatusMessage } from "@/components/ListStatusMessage";
import { TableSkeleton } from "@/components/LoadingSkeletons";
import { NoticeBar } from "@/components/NoticeBar";
import { SectionHeading } from "@/components/SectionHeading";
import { formatCount, formatCurrency } from "@/viewmodels/formatters";
import {
  formatTicketDateTime,
  type TicketHistoryViewModel,
  type TicketStatusFilter,
} from "@/viewmodels/ticket-history";
import type { TicketHistoryRowDto } from "@/viewmodels/ticket-types";

export function TicketHistoryView({
  state,
  actions,
  reasons,
  canCancel = true,
  heading = true,
}: TicketHistoryViewModel & {
  /**
   * Presentación de «Cancelar» por permiso `tickets.cancel`, no por `cancellable`
   * (dashboard-020 RN-04, CA-08). La taquilla lo deja activo; «Reportes» lo apaga.
   */
  canCancel?: boolean;
  /** Sin título cuando la vista va dentro de «Reportes» (que ya tiene el suyo). */
  heading?: boolean;
}) {
  const { query } = state;
  const [folio, setFolio] = useState(query.folio ?? "");
  const [status, setStatus] = useState<TicketStatusFilter>(query.status ?? "");
  const [from, setFrom] = useState(query.from ?? "");
  const [to, setTo] = useState(query.to ?? "");

  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    actions.applyFilters({ folio, status, from, to });
  };
  const clear = () => {
    setFolio("");
    setStatus("");
    setFrom("");
    setTo("");
    actions.applyFilters({ folio: "", status: "", from: "", to: "" });
  };

  const columns: DataTableColumn<TicketHistoryRowDto>[] = [
    { key: "folio", header: "Folio", render: (row) => row.folio },
    {
      key: "purchased",
      header: "Fecha y hora",
      render: (row) => formatTicketDateTime(row.purchased_at, state.timezone),
    },
    { key: "adults", header: "Adultos", render: (row) => formatCount(row.adult_quantity) },
    { key: "children", header: "Niños", render: (row) => formatCount(row.child_quantity) },
    { key: "total", header: "Total", render: (row) => formatCurrency(row.total_amount) },
    {
      key: "status",
      header: "Estado",
      render: (row) => (
        <Badge tone={row.status === "completed" ? "success" : "danger"}>
          {row.status === "completed" ? "Completado" : "Cancelado"}
        </Badge>
      ),
    },
    {
      key: "reason",
      header: "Motivo",
      // Etiqueta que deriva la API (dashboard-016 CA-26) y el comentario guardado.
      render: (row) =>
        row.status === "cancelled"
          ? [row.cancellation_reason_label, row.cancellation_reason].filter(Boolean).join(" · ") ||
            "—"
          : "—",
    },
    { key: "cashier", header: "Cajero", render: (row) => row.cashier_name ?? "—" },
  ];

  if (canCancel) columns.push({
      key: "actions",
      header: "Acciones",
      render: (row) =>
        row.cancellable ? (
          <div className="row-actions">
            <Button
              variant="danger"
              aria-label={`Cancelar boleto ${row.folio}`}
              onClick={() => actions.openCancel(row)}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          "—"
        ),
  });

  return (
    <>
      {heading && (
        <SectionHeading
          eyebrow={canCancel ? "Taquilla / Historial" : "Reportes / Historial"}
          title="Historial de boletos"
          description={
            canCancel
              ? "Consulta los boletos vendidos, filtra por folio, estado o fechas y cancela los del día cuando corresponda."
              : "Consulta los boletos vendidos, filtra por folio, estado o fechas."
          }
        />
      )}

      <NoticeBar message={state.notice} onDismiss={actions.dismissNotice} />

      <Card className="filter-card">
        <form className="filter-form ticket-history-filters" onSubmit={apply}>
          <Field
            id="history-folio"
            label="Folio"
            inputMode="numeric"
            autoComplete="off"
            value={folio}
            onChange={(event) => setFolio(event.target.value)}
          />
          <SelectField
            id="history-status"
            label="Estado"
            value={status}
            onChange={(event) => setStatus(event.target.value as TicketStatusFilter)}
          >
            <option value="">Todos los estados</option>
            <option value="completed">Completado</option>
            <option value="cancelled">Cancelado</option>
          </SelectField>
          <Field
            id="history-from"
            label="Fecha desde"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <Field
            id="history-to"
            label="Fecha hasta"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
          <div className="filter-actions">
            <Button type="submit">Aplicar filtros</Button>
            <Button type="button" variant="secondary" onClick={clear}>
              Limpiar
            </Button>
          </div>
        </form>
      </Card>

      <Card className="table-card">
        <div className="card-heading">
          <div>
            <h2>Boletos</h2>
            <p>
              {state.meta ? `${formatCount(state.meta.total)} registros` : "Consulta de la API"}
            </p>
          </div>
        </div>
        <ListStatusMessage
          status={state.status}
          error={state.error}
          loadingText="Cargando el historial…"
          skeleton={<TableSkeleton columns={columns} caption="Historial de boletos" label="Cargando el historial…" />}
          emptyText="No hay boletos que coincidan con los filtros."
          onRetry={actions.reload}
        />
        {state.status === "ready" && (
          <DataTable
            caption="Historial de boletos"
            columns={columns}
            rows={state.rows}
            rowKey={(row) => row.folio}
            rowSearchId={(row) => `ticket-history:${row.folio}`}
          />
        )}
        {state.meta && state.status !== "error" && (
          <Pagination
            page={state.meta.current_page}
            lastPage={state.meta.last_page}
            total={state.meta.total}
            busy={state.status === "loading"}
            onPageChange={actions.goToPage}
          />
        )}
      </Card>

      {canCancel && (
        <CancelTicketDialog
          cancel={state.cancel}
          reasons={reasons}
          onReasonCodeChange={actions.changeReasonCode}
          onReasonChange={actions.changeReason}
          onConfirm={actions.confirmCancel}
          onClose={actions.closeCancel}
        />
      )}
    </>
  );
}
