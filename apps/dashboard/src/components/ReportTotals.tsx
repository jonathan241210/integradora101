import type { ReactNode } from "react";
import { Card } from "@arca/ui";

export type ReportMetric = { key: string; label: string; value: string };

/**
 * Totales compartidos de los reportes (dashboard-020 CA-16). Los valores vienen de la API ya
 * calculados; este componente solo los presenta y no suma ni compara nada.
 */
export function ReportTotals({
  headingId,
  heading,
  metrics,
  children,
}: {
  headingId: string;
  heading: string;
  metrics: ReportMetric[];
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby={headingId} className="totals-section">
      <h2 id={headingId} className="totals-section__heading">
        {heading}
      </h2>
      <div className="report-metric-grid">
        {metrics.map((metric) => (
          <Card className="report-metric" key={metric.key}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </Card>
        ))}
      </div>
      {children}
    </section>
  );
}
