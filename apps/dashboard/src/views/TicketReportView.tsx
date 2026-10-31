import { useState, type FormEvent } from "react";
import { Alert, Button, Card, Field } from "@arca/ui";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { ListStatusMessage } from "@/components/ListStatusMessage";
import { PaginationBar } from "@/components/PaginationBar";
import { SalesTotals } from "@/components/SalesTotals";
import { SectionHeading } from "@/components/SectionHeading";
import type {
  DailySalesDto,
  ReportExportFormat,
  TicketRowDto,
} from "@/viewmodels/admin-types";
import {
  formatCount,
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/viewmodels/formatters";
import type { TicketReportViewModel } from "@/viewmodels/ticket-report";

const exportOptions: { format: ReportExportFormat; label: string }[] = [
  { format: "csv", label: "Exportar CSV" },
  { format: "xlsx", label: "Exportar Excel" },
  { format: "pdf", label: "Exportar PDF" },
];

export function TicketReportView({ state, actions }: TicketReportViewModel) {
  const { report, query } = state;
  const [customOpen, setCustomOpen] = useState(query.period === "custom");
  const [from, setFrom] = useState(query.from ?? "");
  const [to, setTo] = useState(query.to ?? "");

  const applyCustom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    actions.applyCustomRange(from, to);
  };

  const dailyColumns: DataTableColumn<DailySalesDto>[] = [
    { key: "date", header: "Fecha", render: (day) => formatDate(day.date) },
    { key: "tickets", header: "Boletos", render: (day) => formatCount(day.tickets) },
    { key: "adults", header: "Adultos", render: (day) => formatCount(day.adults) },
    { key: "children", header: "Niños", render: (day) => formatCount(day.children) },
    { key: "revenue", header: "Ingresos", render: (day) => formatCurrency(day.revenue) },
  ];
  const ticketColumns: DataTableColumn<TicketRowDto>[] = [
    { key: "folio", header: "Folio", render: (ticket) => ticket.folio },
    { key: "purchased", header: "Fecha y hora", render: (ticket) => formatDateTime(ticket.purchased_at) },
    { key: "adults", header: "Adultos", render: (ticket) => formatCount(ticket.adults) },
    { key: "children", header: "Niños", render: (ticket) => formatCount(ticket.children) },
    { key: "total", header: "Total", render: (ticket) => formatCurrency(ticket.total) },
  ];

  return (
    <>
      <SectionHeading
        eyebrow="Administración / Reporte"
        title="Reporte de boletos"
        description="Consulta las ventas de taquilla por semana o por mes y exporta el periodo."
      />

      <Card className="filter-card report-controls">
        <div className="report-controls__row">
          <div className="report-controls__group" role="group" aria-label="Tipo de periodo">
            <Button
              variant={query.period === "week" ? "primary" : "secondary"}
              aria-pressed={query.period === "week"}
              onClick={() => {
                setCustomOpen(false);
                actions.selectPeriod("week");
              }}
            >
              Semanal
            </Button>
            <Button
              variant={query.period === "month" ? "primary" : "secondary"}
              aria-pressed={query.period === "month"}
              onClick={() => {
                setCustomOpen(false);
                actions.selectPeriod("month");
              }}
            >
              Mensual
            </Button>
            <Button
              variant="ghost"
              aria-expanded={customOpen}
              aria-controls="report-custom-range"
              onClick={() => setCustomOpen((open) => !open)}
            >
              Rango personalizado
            </Button>
          </div>
          <div className="report-controls__group" role="group" aria-label="Navegación entre periodos">
            <Button
              variant="secondary"
              disabled={!report?.period.previous_date || state.status === "loading"}
              onClick={() =>
                report?.period.previous_date &&
                actions.goToReferenceDate(report.period.previous_date)
              }
            >
              Periodo anterior
            </Button>
            <Button
              variant="secondary"
              disabled={!report?.period.next_date || state.status === "loading"}
              onClick={() =>
                report?.period.next_date &&
                actions.goToReferenceDate(report.period.next_date)
              }
            >
              Periodo siguiente
            </Button>
          </div>
        </div>
        {customOpen && (
          <form
            id="report-custom-range"
            className="filter-form filter-form--range"
            onSubmit={applyCustom}
          >
            <Field
              id="report-from"
              label="Fecha desde"
              type="date"
              required
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
            <Field
              id="report-to"
              label="Fecha hasta"
              type="date"
              required
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
            <div className="filter-actions">
              <Button type="submit" disabled={!from || !to}>
                Aplicar rango
              </Button>
            </div>
          </form>
        )}
        {report && (
          <p className="report-period-label" aria-live="polite">
            <strong>{report.period.label}</strong>
          </p>
        )}
      </Card>

      <ListStatusMessage
        status={state.status}
        error={state.error}
        loadingText="Cargando el reporte…"
        emptyText=""
        onRetry={actions.reload}
      />

      {report && state.status === "ready" && (
        <>
          <div className="report-export" role="group" aria-label="Exportar reporte">
            {exportOptions.map(({ format, label }) => (
              <Button
                variant="secondary"
                key={format}
                disabled={state.exporting !== null}
                onClick={() => actions.exportAs(format)}
              >
                {state.exporting === format ? "Descargando…" : label}
              </Button>
            ))}
          </div>
          {state.exportError && (
            <Alert className="inline-alert" role="alert" aria-live="assertive">
              {state.exportError}
            </Alert>
          )}

          <SalesTotals
            headingId="report-totals-heading"
            heading="Totales del periodo"
            totals={report.totals}
          />

          <Card className="table-card">
            <div className="card-heading">
              <div>
                <h2>Desglose diario</h2>
                <p>Todos los días del periodo</p>
              </div>
            </div>
            <DataTable
              caption="Desglose diario de ventas"
              columns={dailyColumns}
              rows={report.daily}
              rowKey={(day) => day.date}
            />
          </Card>

          <Card className="table-card">
            <div className="card-heading">
              <div>
                <h2>Boletos del periodo</h2>
                <p>{formatCount(report.meta.total)} boletos</p>
              </div>
            </div>
            {report.tickets.length === 0 ? (
              <p className="state-message">No hay boletos vendidos en este periodo.</p>
            ) : (
              <DataTable
                caption="Boletos vendidos en el periodo"
                columns={ticketColumns}
                rows={report.tickets}
                rowKey={(ticket) => ticket.folio}
              />
            )}
            <PaginationBar
              page={report.meta.current_page}
              lastPage={report.meta.last_page}
              total={report.meta.total}
              onPageChange={actions.goToPage}
            />
          </Card>
        </>
      )}
    </>
  );
}
