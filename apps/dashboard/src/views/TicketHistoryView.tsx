import { useState, type FormEvent } from "react";
import { Badge, Button, Card, Field, SelectField } from "@arca/ui";
import { CancelTicketDialog } from "@/components/CancelTicketDialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { ListStatusMessage } from "@/components/ListStatusMessage";
import { NoticeBar } from "@/components/NoticeBar";
import { PaginationBar } from "@/components/PaginationBar";
import { SectionHeading } from "@/components/SectionHeading";
import { formatCount, formatCurrency } from "@/viewmodels/formatters";
import {
  formatTicketDateTime,
  type TicketHistoryViewModel,
  type TicketStatusFilter,
} from "@/viewmodels/ticket-history";
import type { TicketHistoryRowDto } from "@/viewmodels/ticket-types";

export function TicketHistoryView({ state, actions }: TicketHistoryViewModel) {
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
      render: (row) => formatTicketDateTime(row.purchased_at),
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
      render: (row) => (row.status === "cancelled" ? row.cancellation_reason ?? "—" : "—"),
    },
    { key: "cashier", header: "Cajero", render: (row) => row.cashier_name ?? "—" },
    {
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
    },
  ];

  return (
    <>
      <SectionHeading
        eyebrow="Taquilla / Historial"
        title="Historial de boletos"
        description="Consulta los boletos vendidos, filtra por folio, estado o fechas y cancela los del día cuando corresponda."
      />

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
          emptyText="No hay boletos que coincidan con los filtros."
          onRetry={actions.reload}
        />
        {state.status === "ready" && (
          <DataTable
            caption="Historial de boletos"
            columns={columns}
            rows={state.rows}
            rowKey={(row) => row.folio}
          />
        )}
        {state.meta && state.status !== "error" && (
          <PaginationBar
            page={state.meta.current_page}
            lastPage={state.meta.last_page}
            total={state.meta.total}
            busy={state.status === "loading"}
            onPageChange={actions.goToPage}
          />
        )}
      </Card>

      <CancelTicketDialog
        cancel={state.cancel}
        onReasonChange={actions.changeReason}
        onConfirm={actions.confirmCancel}
        onClose={actions.closeCancel}
      />
    </>
  );
}
