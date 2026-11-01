import { Card } from "@arca/ui";
import type { SalesTotalsDto } from "@/viewmodels/admin-types";
import { formatCount, formatCurrency } from "@/viewmodels/formatters";

/** Tarjetas de totales tal como los calcula la API (RN-04). */
export function SalesTotals({
  headingId,
  heading,
  totals,
}: {
  headingId: string;
  heading: string;
  totals: SalesTotalsDto;
}) {
  return (
    <section aria-labelledby={headingId} className="totals-section">
      <h2 id={headingId} className="totals-section__heading">
        {heading}
      </h2>
      <div className="report-metric-grid">
        <Card className="report-metric">
          <span>Boletos</span>
          <strong>{formatCount(totals.tickets)}</strong>
        </Card>
        <Card className="report-metric">
          <span>Adultos</span>
          <strong>{formatCount(totals.adults)}</strong>
        </Card>
        <Card className="report-metric">
          <span>Niños</span>
          <strong>{formatCount(totals.children)}</strong>
        </Card>
        <Card className="report-metric">
          <span>Ingresos</span>
          <strong>{formatCurrency(totals.revenue)}</strong>
        </Card>
      </div>
    </section>
  );
}
