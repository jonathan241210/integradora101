import { useEffect, useState, type FormEvent } from "react";
import { Alert, Badge, Button, Card, Pagination, SelectField } from "@arca/ui";
import { CancellationLegend } from "@/components/CancellationLegend";
import { CancellationReviewDialog } from "@/components/CancellationReviewDialog";
import { CancellationTrafficLightTable } from "@/components/CancellationTrafficLightTable";
import { ActionError } from "@/components/DashboardNotifications";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { FieldErrors, fieldErrorProps } from "@/components/FieldErrors";
import { Icon } from "@/components/Icon";
import { ReportExportButtons } from "@/components/ReportExportButtons";
import { ReportPeriodControls } from "@/components/ReportPeriodControls";
import { ReportTotals } from "@/components/ReportTotals";
import { CancellationReportSkeleton } from "@/components/LoadingSkeletons";
import { ReportViewState } from "@/components/ReportViewState";
import { SectionHeading } from "@/components/SectionHeading";
import type {
  CancellationLegendDto,
  CancellationReconciliationCashierDto,
  CancellationReconciliationDayDto,
  CancellationReportDto,
  CancellationRowDto,
} from "@/viewmodels/admin-types";
import type { CancellationReviewViewModel } from "@/viewmodels/cancellation-review";
import {
  emptyCancellationFilters,
  filtersFromQuery,
  type CancellationFilters,
  type CancellationReportViewModel,
} from "@/viewmodels/cancellation-report";
import {
  describeExportFilters,
  formatDaysToReview,
  hasSignals,
  isFolioOnPage,
  nextFolioScanStep,
  signalLabel,
  ticketFocusBannerText,
  ticketRowAnchorId,
  type TicketFocus,
  type TicketFocusTarget,
} from "@/viewmodels/cancellation-ticket-focus";
import { periodFieldErrors } from "@/viewmodels/report-period";
import {
  BUSINESS_TIMEZONE_FALLBACK,
  formatCount,
  formatCurrency,
  formatDate,
} from "@/viewmodels/formatters";
import { formatTicketDateTime } from "@/viewmodels/ticket-history";

const unbalancedDayMessage =
  "Error de datos en este día: el bruto no coincide con neto + cancelado. Repórtalo a sistemas.";
const unbalancedCashierMessage =
  "Error de datos para este cajero: el bruto no coincide con neto + cancelado. Repórtalo a sistemas.";
const unbalancedDaysSummary =
  "Error de datos: en uno o más días el bruto no coincide con neto + cancelado. Repórtalo a sistemas.";
const unbalancedCashiersSummary =
  "Error de datos: para uno o más cajeros el bruto no coincide con neto + cancelado. Repórtalo a sistemas.";
const reconciliationHelp =
  "Neto a entregar = vendido bruto − cancelado. Compáralo con el dinero que entregó el cajero.";

function Totals({ report }: { report: CancellationReportDto }) {
  const { totals } = report;

  return (
    <ReportTotals
      headingId="cancellation-totals-heading"
      heading="Totales del periodo"
      metrics={[
        { key: "tickets", label: "Boletos cancelados", value: formatCount(totals.cancelled_tickets) },
        { key: "amount", label: "Importe cancelado", value: formatCurrency(totals.cancelled_amount) },
      ]}
    >
      <div className="cancellation-breakdowns">
        <Card className="table-card cancellation-card">
          <div className="card-heading">
            <h3>Por cajero</h3>
          </div>
          {totals.by_cashier.length === 0 ? (
            <p className="state-message">Sin cancelaciones en el periodo.</p>
          ) : (
            <DataTable
              caption="Cancelaciones por cajero"
              columns={[
                { key: "cashier", header: "Cajero", render: (item) => item.cashier_name },
                {
                  key: "tickets",
                  header: "Boletos",
                  render: (item) => formatCount(item.cancelled_tickets),
                },
                {
                  key: "amount",
                  header: "Importe",
                  render: (item) => formatCurrency(item.cancelled_amount),
                },
              ]}
              rows={totals.by_cashier}
              rowKey={(item) => item.cashier_id ?? `none:${item.cashier_name}`}
            />
          )}
        </Card>
        <Card className="table-card cancellation-card">
          <div className="card-heading">
            <h3>Por motivo</h3>
          </div>
          {totals.by_reason.length === 0 ? (
            <p className="state-message">Sin cancelaciones en el periodo.</p>
          ) : (
            <DataTable
              caption="Cancelaciones por motivo"
              columns={[
                { key: "reason", header: "Motivo", render: (item) => item.reason_label },
                {
                  key: "tickets",
                  header: "Boletos",
                  render: (item) => formatCount(item.cancelled_tickets),
                },
                {
                  key: "amount",
                  header: "Importe",
                  render: (item) => formatCurrency(item.cancelled_amount),
                },
              ]}
              rows={totals.by_reason}
              rowKey={(item) => item.reason_code ?? "unclassified"}
            />
          )}
        </Card>
      </div>
    </ReportTotals>
  );
}

/** Con filtro de motivo el bruto solo cuenta ese motivo: neto, cuadre y % no aplican (`api-022`). */
const reasonFilterNote =
  "Con filtro de motivo la conciliación no aplica; quita el filtro para ver bruto, cancelado y neto.";

function Reconciliation({
  report,
  reasonFiltered,
}: {
  report: CancellationReportDto;
  reasonFiltered: boolean;
}) {
  const allDayColumns: DataTableColumn<CancellationReconciliationDayDto>[] = [
    { key: "date", header: "Día", render: (day) => formatDate(day.date) },
    { key: "gross", header: "Vendido bruto", render: (day) => formatCurrency(day.gross) },
    { key: "cancelled", header: "Cancelado", render: (day) => formatCurrency(day.cancelled) },
    { key: "net", header: "Neto", render: (day) => formatCurrency(day.net) },
  ];
  const dayColumns = allDayColumns.filter(
    (column) => !reasonFiltered || !["net", "balanced"].includes(column.key),
  );
  const allCashierColumns: DataTableColumn<CancellationReconciliationCashierDto>[] = [
    {
      key: "cashier",
      header: "Cajero",
      render: (cashier) => cashier.cashier_name,
    },
    { key: "gross", header: "Vendido bruto", render: (cashier) => formatCurrency(cashier.gross) },
    { key: "cancelled", header: "Cancelado", render: (cashier) => formatCurrency(cashier.cancelled) },
    { key: "net", header: "Neto", render: (cashier) => formatCurrency(cashier.net) },
    {
      key: "sold",
      header: "Boletos vendidos",
      render: (cashier) => formatCount(cashier.sold_tickets),
    },
    {
      key: "percent",
      header: "% cancelación",
      render: (cashier) => `${cashier.cancel_percent} %`,
    },
    {
      key: "to-review",
      header: "Días por revisar",
      render: (cashier) => formatDaysToReview(cashier.days_to_review),
    },
    {
      key: "days",
      header: "Días con actividad",
      render: (cashier) => cashier.active_days.map((day) => formatDate(day)).join(", ") || "—",
    },
  ];

  const cashierColumns = allCashierColumns.filter(
    (column) => !reasonFiltered || !["net", "percent"].includes(column.key),
  );

  // `balanced` lo calcula la API (api-022 RN-06); aquí solo se avisa si llega en false.
  const unbalancedDays = !reasonFiltered && report.reconciliation.days.some((day) => !day.balanced);
  const unbalancedCashiers =
    !reasonFiltered && report.reconciliation.cashiers.some((cashier) => !cashier.balanced);

  return (
    <section aria-labelledby="cancellation-reconciliation-heading" className="totals-section">
      <h2 id="cancellation-reconciliation-heading" className="totals-section__heading">
        Conciliación
      </h2>
      {reasonFiltered && (
        <p className="state-message" role="note">
          {reasonFilterNote}
        </p>
      )}
      {!reasonFiltered && (
        <p className="cancellation-reconciliation-help" role="note">
          {reconciliationHelp}
        </p>
      )}
      <Card className="table-card cancellation-card">
        <div className="card-heading">
          <h3>Por día</h3>
        </div>
        {unbalancedDays && <Alert role="alert">{unbalancedDaysSummary}</Alert>}
        {report.reconciliation.days.length === 0 ? (
          <p className="state-message">Sin actividad en el periodo.</p>
        ) : (
          <DataTable
            caption="Conciliación por día"
            columns={dayColumns}
            rows={report.reconciliation.days}
            rowKey={(day) => day.date}
            rowDetail={(day) =>
              !reasonFiltered && !day.balanced ? <Alert role="alert">{unbalancedDayMessage}</Alert> : null
            }
          />
        )}
      </Card>
      <Card className="table-card cancellation-card">
        <div className="card-heading">
          <h3>Por cajero</h3>
        </div>
        {unbalancedCashiers && <Alert role="alert">{unbalancedCashiersSummary}</Alert>}
        {report.reconciliation.cashiers.length === 0 ? (
          <p className="state-message">Sin actividad en el periodo.</p>
        ) : (
          <DataTable
            caption="Conciliación por cajero"
            columns={cashierColumns}
            rows={report.reconciliation.cashiers}
            rowKey={(cashier) => cashier.cashier_id ?? `none:${cashier.cashier_name}`}
            rowDetail={(cashier) =>
              !reasonFiltered && !cashier.balanced ? (
                <Alert role="alert">{unbalancedCashierMessage}</Alert>
              ) : null
            }
          />
        )}
      </Card>
    </section>
  );
}

/**
 * Semáforo por cajero y día con su leyenda (dashboard-021). Nivel, porqué, qué hacer,
 * leyenda y revisión vienen de la API (RN-01); la página no los calcula.
 */
function TrafficLight({
  report,
  canReview,
  review,
  onViewTickets,
  onFocusFolio,
}: {
  report: CancellationReportDto;
  canReview: boolean;
  review?: CancellationReviewViewModel;
  onViewTickets: (target: TicketFocusTarget) => void;
  onFocusFolio: (folio: string, target: TicketFocusTarget) => void;
}) {
  const days = report.reconciliation.cashier_days;

  if (!days) return null;

  const timezone = report.period.timezone ?? BUSINESS_TIMEZONE_FALLBACK;

  return (
    <section aria-labelledby="cancellation-traffic-light-heading" className="totals-section">
      <h2 id="cancellation-traffic-light-heading" className="totals-section__heading">
        Semáforo por cajero y día
      </h2>
      <CancellationLegend legend={report.legend ?? []} levels={report.levels} disclaimer={report.disclaimer} />
      <Card className="table-card cancellation-card">
        {days.length === 0 ? (
          <p className="state-message">Sin actividad en el periodo.</p>
        ) : (
          <CancellationTrafficLightTable
            rows={days}
            timezone={timezone}
            canReview={canReview && review !== undefined}
            history={review?.history ?? { key: null, status: "idle", items: [], error: "" }}
            onReview={(target) => review?.actions.open(target)}
            onToggleHistory={(target) => review?.actions.toggleHistory(target)}
            onViewTickets={onViewTickets}
            onFocusFolio={onFocusFolio}
          />
        )}
      </Card>
      {canReview && review && <CancellationReviewDialog review={review} />}
    </section>
  );
}

function Rows({
  report,
  busy,
  focus,
  flashFolio,
  onPageChange,
  onClearFocus,
}: {
  report: CancellationReportDto;
  busy: boolean;
  focus: TicketFocus | null;
  flashFolio: string | null;
  onPageChange: (page: number) => void;
  onClearFocus: () => void;
}) {
  const timezone = report.period.timezone ?? BUSINESS_TIMEZONE_FALLBACK;
  const legend: CancellationLegendDto[] | undefined = report.legend;
  // El resaltado no depende solo del color: lleva icono, texto «Con señales» y borde (CA-31).
  const isHighlighted = (row: CancellationRowDto) =>
    (focus !== null && hasSignals(row)) || String(row.folio) === flashFolio;
  const columns: DataTableColumn<CancellationRowDto>[] = [
    {
      key: "folio",
      header: "Folio",
      render: (row) => (
        <span className="cancellation-cashier">
          {row.folio}
          {isHighlighted(row) && (
            <span className="cancellation-ticket-mark">
              <Icon name="alert" />
              <span>Con señales</span>
            </span>
          )}
        </span>
      ),
    },
    { key: "adults", header: "Adultos", render: (row) => formatCount(row.adult_quantity) },
    { key: "children", header: "Niños", render: (row) => formatCount(row.child_quantity) },
    { key: "amount", header: "Importe", render: (row) => formatCurrency(row.total_amount) },
    {
      key: "purchased",
      header: "Venta",
      render: (row) => formatTicketDateTime(row.purchased_at, timezone),
    },
    {
      key: "cancelled",
      header: "Cancelación",
      render: (row) => formatTicketDateTime(row.cancelled_at, timezone),
    },
    { key: "seller", header: "Vendió", render: (row) => row.cashier_name ?? "—" },
    { key: "canceller", header: "Canceló", render: (row) => row.cancelled_by_name ?? "—" },
    { key: "reason", header: "Motivo", render: (row) => row.reason_label },
    { key: "comment", header: "Comentario", render: (row) => row.comment ?? "—" },
    { key: "minutes", header: "Minutos", render: (row) => row.minutes_to_cancel === null ? "—" : formatCount(row.minutes_to_cancel) },
    { key: "late", header: "Tardía", render: (row) => (row.late_cancellation ? "Sí" : "No") },
    {
      key: "signals",
      header: "Señales",
      render: (row) =>
        row.signal_codes.length === 0 ? (
          <span>—</span>
        ) : (
          <span className="cancellation-folio-chips">
            {row.signal_codes.map((code) => (
              <Badge key={code} tone="warning">
                {signalLabel(code, legend)}
              </Badge>
            ))}
          </span>
        ),
    },
  ];

  return (
    <Card className="table-card cancellation-card">
      <div className="card-heading">
        <div>
          <h2 id="cancellation-tickets-heading" tabIndex={-1}>
            Boletos cancelados
          </h2>
          <p>{formatCount(report.meta?.total ?? report.rows.length)} registros</p>
        </div>
      </div>
      {focus && (
        <div className="cancellation-focus-banner" role="status">
          <span>{ticketFocusBannerText(focus)}</span>
          <Button type="button" variant="secondary" disabled={busy} onClick={onClearFocus}>
            Quitar filtro
          </Button>
        </div>
      )}
      {report.rows.length === 0 ? (
        <p className="state-message">No hay cancelaciones en este periodo.</p>
      ) : (
        <DataTable
          caption="Boletos cancelados en el periodo"
          columns={columns}
          rows={report.rows}
          rowKey={(row) => row.folio}
          rowProps={(row) => ({
            id: ticketRowAnchorId(row.folio),
            className: isHighlighted(row) ? "cancellation-ticket-row--highlight" : undefined,
          })}
        />
      )}
      {report.meta && (
        <Pagination
          page={report.meta.current_page}
          lastPage={report.meta.last_page}
          total={report.meta.total}
          busy={busy}
          onPageChange={onPageChange}
        />
      )}
    </Card>
  );
}

export function CancellationReportView({
  state,
  reasonOptions,
  actions,
  heading = true,
  canReview = false,
  review,
}: CancellationReportViewModel & {
  heading?: boolean;
  /** `reports.cancellations.view` del perfil; la API autoriza (RN-02). */
  canReview?: boolean;
  review?: CancellationReviewViewModel;
}) {
  const { report, query, fieldErrors, ticketFocus } = state;
  // Folio al que llevar el foco y folio marcado; son estado de presentación (CA-31, CA-33).
  const [scrollRequest, setScrollRequest] = useState<{ folio: string | null } | null>(null);
  const [flashFolio, setFlashFolio] = useState<string | null>(null);
  // Folio que se busca página por página tras aplicar el filtro de día y cajero (CA-33).
  const [folioSearch, setFolioSearch] = useState<{ folio: string; visited: number[] } | null>(null);
  const [filters, setFilters] = useState<CancellationFilters>(() => ({
    ...emptyCancellationFilters,
    ...filtersFromQuery(query),
  }));
  const change = (changes: Partial<CancellationFilters>) =>
    setFilters((current) => ({ ...current, ...changes }));
  // Cajero y motivo se aplican con el periodo vigente; el periodo lo cambian los controles compartidos.
  const applyWith = (changes: Partial<CancellationFilters>) =>
    actions.applyFilters({
      ...filtersFromQuery(query),
      cashierId: filters.cashierId,
      reasonCode: filters.reasonCode,
      ...changes,
    });
  // «Ver boletos»: el filtro lo aplica el ViewModel; la vista pide mover el foco a la tabla (CA-29, CA-31).
  const viewTickets = (target: TicketFocusTarget) => {
    setFlashFolio(null);
    setFolioSearch(null);
    setScrollRequest({ folio: null });
    actions.viewTickets(target);
  };
  const clearFocus = () => {
    setFlashFolio(null);
    setFolioSearch(null);
    actions.clearTicketFocus();
  };
  const goToFolio = (folio: string, target: TicketFocusTarget) => {
    setFlashFolio(folio);

    if (report && isFolioOnPage(report.rows, folio)) {
      setFolioSearch(null);
      setScrollRequest({ folio });

      return;
    }

    // Fuera de la página: filtra por día y cajero y, al cargar, busca la página del folio.
    setFolioSearch({ folio, visited: [] });
    actions.viewTickets(target);
  };

  // El formulario refleja la consulta vigente (también la que pone «Ver boletos» o «Quitar filtro»).
  useEffect(() => {
    setFilters({ ...emptyCancellationFilters, ...filtersFromQuery(query) });
  }, [query]);

  // Con el filtro ya cargado, recorre las páginas hasta hallar el folio y entonces lo enfoca (CA-33).
  useEffect(() => {
    if (!folioSearch || state.status !== "ready" || !report) return;

    // Ignora el reporte anterior mientras llega la página pedida.
    if ((report.meta?.current_page ?? 1) !== (query.page ?? 1)) return;

    const step = nextFolioScanStep({
      rows: report.rows,
      meta: report.meta,
      folio: folioSearch.folio,
      visited: folioSearch.visited,
    });

    if (step.status === "scan") {
      setFolioSearch({
        folio: folioSearch.folio,
        visited: [...folioSearch.visited, report.meta?.current_page ?? 1],
      });
      actions.goToPage(step.page);

      return;
    }

    // Hallado, enfoca su fila; si no se encontró, lleva al encabezado de la tabla de boletos.
    setFolioSearch(null);
    setScrollRequest({ folio: folioSearch.folio });
  }, [folioSearch, state.status, report, query.page]);

  // Con el reporte cargado, desplaza a la tabla de boletos (o a la fila) y mueve el foco (CA-31, CA-33).
  useEffect(() => {
    if (!scrollRequest || state.status !== "ready" || !report) return;

    const row =
      scrollRequest.folio && isFolioOnPage(report.rows, scrollRequest.folio)
        ? document.getElementById(ticketRowAnchorId(scrollRequest.folio))
        : null;
    const target = row ?? document.getElementById("cancellation-tickets-heading");

    target?.scrollIntoView?.({ block: "start", behavior: "smooth" });
    target?.focus({ preventScroll: true });
    setScrollRequest(null);
  }, [scrollRequest, state.status, report]);

  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyWith({});
  };
  const loading = state.status === "loading";
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const viewStatus = loading
    ? "loading"
    : state.status === "error" && !hasFieldErrors
      ? "error"
      : "ready";

  return (
    <>
      {heading && (
        <SectionHeading
          eyebrow="Administración / Reporte"
          title="Cancelaciones"
          description="Revisa los boletos cancelados, su motivo, quién los vendió y canceló, y el neto a entregar de cada día."
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
          busy={loading}
          errors={periodFieldErrors(fieldErrors)}
          onSelectPeriod={(period) => applyWith({ period, date: "", from: "", to: "" })}
          onApplyRange={(from, to) => applyWith({ period: "custom", date: "", from, to })}
          onGoToDate={actions.goToReferenceDate}
        />
        <form className="filter-form cancellation-filters" onSubmit={apply}>
          <SelectField
            id="cancellation-cashier"
            label="Cajero"
            value={filters.cashierId}
            onChange={(event) => change({ cashierId: event.target.value })}
            {...fieldErrorProps("cancellation-cashier", fieldErrors, "cashier_id")}
          >
            <option value="">Todos los cajeros</option>
            {state.cashiers.map((cashier) => (
              <option key={cashier.id} value={String(cashier.id)}>
                {cashier.name}
              </option>
            ))}
          </SelectField>
          <FieldErrors id="cancellation-cashier" errors={fieldErrors} name="cashier_id" />
          <SelectField
            id="cancellation-reason"
            label="Motivo"
            value={filters.reasonCode}
            onChange={(event) => change({ reasonCode: event.target.value })}
            {...fieldErrorProps("cancellation-reason", fieldErrors, "reason_code")}
          >
            <option value="">Todos los motivos</option>
            {reasonOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <FieldErrors id="cancellation-reason" errors={fieldErrors} name="reason_code" />
          <div className="filter-actions">
            <Button type="submit" disabled={loading}>
              Aplicar
            </Button>
          </div>
        </form>
      </Card>

      {state.status === "forbidden" ? (
        <Alert role="alert">{state.error}</Alert>
      ) : (
        <ReportViewState
          status={viewStatus}
          error={state.error}
          onRetry={actions.reload}
          skeleton={<CancellationReportSkeleton />}
        />
      )}

      {report && state.status !== "forbidden" && (
        <>
          <ReportExportButtons
            exporting={state.exporting}
            fieldErrors={state.exportFieldErrors}
            disabled={state.status !== "ready"}
            note={`Se exportará con los filtros aplicados: ${describeExportFilters(
              query,
              report.period.label,
              state.cashiers,
              reasonOptions,
            )}.`}
            onExport={actions.exportAs}
          />
          <ActionError message={state.exportError} />

          <Totals report={report} />
          <Reconciliation report={report} reasonFiltered={query.reason_code !== undefined} />
          <TrafficLight
            report={report}
            canReview={canReview}
            review={review}
            onViewTickets={viewTickets}
            onFocusFolio={goToFolio}
          />
          <Rows
            report={report}
            busy={loading}
            focus={ticketFocus}
            flashFolio={flashFolio}
            onPageChange={actions.goToPage}
            onClearFocus={clearFocus}
          />
        </>
      )}
    </>
  );
}
