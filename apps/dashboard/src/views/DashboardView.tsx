import { Button, Card } from "@arca/ui";
import { ListStatusMessage } from "@/components/ListStatusMessage";
import { SalesTotals } from "@/components/SalesTotals";
import { SectionHeading } from "@/components/SectionHeading";
import {
  toRevenueBars,
  type DashboardSummaryViewModel,
} from "@/viewmodels/dashboard-summary";
import { formatCurrency, formatWeekday } from "@/viewmodels/formatters";

export function DashboardView({
  state,
  actions,
  onOpenReport,
}: DashboardSummaryViewModel & {
  /** Solo se entrega a quien puede ver el reporte. */
  onOpenReport?: () => void;
}) {
  const { summary } = state;

  return (
    <>
      <SectionHeading
        title="Panel principal"
        description="Resumen de la venta de boletos del zoológico"
      />
      {onOpenReport && (
        <div className="list-toolbar">
          <Button variant="secondary" onClick={onOpenReport}>
            Ver reporte
          </Button>
        </div>
      )}
      <ListStatusMessage
        status={state.status === "empty" ? "ready" : state.status}
        error={state.error}
        loadingText="Cargando el resumen…"
        emptyText=""
        onRetry={actions.reload}
      />
      {state.status === "empty" && (
        <p className="state-message">
          Aún no hay ventas registradas en los últimos 7 días.
        </p>
      )}
      {summary && (state.status === "ready" || state.status === "empty") && (
        <>
          <SalesTotals headingId="today-heading" heading="Hoy" totals={summary.today} />
          <SalesTotals
            headingId="week-heading"
            heading="Últimos 7 días"
            totals={summary.last_7_days}
          />
          {state.status === "ready" && (
            <Card className="chart-card">
              <div className="card-heading">
                <div>
                  <h2>Ingresos por día</h2>
                  <p>Últimos 7 días</p>
                </div>
              </div>
              <div
                className="bar-chart"
                role="img"
                aria-label={`Ingresos por día: ${summary.series
                  .map((point) => `${formatWeekday(point.date)} ${formatCurrency(point.revenue)}`)
                  .join(", ")}`}
              >
                {toRevenueBars(summary.series).map((bar) => (
                  <div className="bar-chart__item" key={bar.date}>
                    <span className="bar-chart__amount">{formatCurrency(bar.revenue)}</span>
                    <div
                      className="bar-chart__bar"
                      style={{ height: `${bar.height}%` }}
                      aria-hidden="true"
                    />
                    <span className="bar-chart__day">{formatWeekday(bar.date)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </>
  );
}
