import { Card, Pagination } from "@arca/ui";
import { ActionError } from "@/components/DashboardNotifications";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { ReportExportButtons } from "@/components/ReportExportButtons";
import { ReportPeriodControls } from "@/components/ReportPeriodControls";
import { ReportTotals } from "@/components/ReportTotals";
import { TicketReportSkeleton } from "@/components/LoadingSkeletons";
import { ReportViewState } from "@/components/ReportViewState";
import { SectionHeading } from "@/components/SectionHeading";
import type { DailySalesDto, TicketRowDto } from "@/viewmodels/admin-types";
import { periodFieldErrors } from "@/viewmodels/report-period";
import {
  formatCount,
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/viewmodels/formatters";
import type { TicketReportViewModel } from "@/viewmodels/ticket-report";

export function TicketReportView({
  state,
  actions,
  heading = true,
}: TicketReportViewModel & { heading?: boolean }) {
  const { report, query } = state;
  const hasFieldErrors = Object.keys(state.fieldErrors).length > 0;
  const viewStatus = state.status === "error" && hasFieldErrors ? "ready" : state.status;

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
      {heading && (
        <SectionHeading
          eyebrow="Administración / Reporte"
          title="Reporte de boletos"
          description="Consulta las ventas de taquilla por semana o por mes y exporta el periodo."
        />
      )}

      <Card className="filter-card report-controls">
        <ReportPeriodControls
          period={query.period}
          from={query.from ?? ""}
          to={query.to ?? ""}
          periodLabel={report?.period.label}
          previousDate={report?.period.previous_date}
          nextDate={report?.period.next_date}
          busy={state.status === "loading"}
          errors={periodFieldErrors(state.fieldErrors)}
          onSelectPeriod={actions.selectPeriod}
          onApplyRange={actions.applyCustomRange}
          onGoToDate={actions.goToReferenceDate}
        />
      </Card>

      <ReportViewState
        key={state.status === "loading" ? JSON.stringify(query) : "state"}
        status={viewStatus}
        error={state.error}
        onRetry={actions.reload}
        skeleton={<TicketReportSkeleton />}
      />

      {report && (viewStatus === "ready") && (
        <>
          <ReportExportButtons
            exporting={state.exporting}
            fieldErrors={state.exportFieldErrors}
            onExport={actions.exportAs}
          />
          <ActionError message={state.exportError} />

          <ReportTotals
            headingId="report-totals-heading"
            heading="Totales del periodo"
            metrics={[
              { key: "tickets", label: "Boletos", value: formatCount(report.totals.tickets) },
              { key: "adults", label: "Adultos", value: formatCount(report.totals.adults) },
              { key: "children", label: "Niños", value: formatCount(report.totals.children) },
              { key: "revenue", label: "Ingresos", value: formatCurrency(report.totals.revenue) },
            ]}
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
                <p>
                  {formatCount(report.totals.tickets)} boletos ·{" "}
                  {formatCount(report.meta.total)} registros
                </p>
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
            <Pagination
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
