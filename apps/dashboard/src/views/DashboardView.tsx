import { Badge, Button, Card } from "@arca/ui";
import { demoMetrics, demoNews, demoRevenue } from "../data/demo-data";
import { Icon, type IconName } from "../components/Icon";
import { SectionHeading } from "../components/SectionHeading";
import type { DashboardSection } from "../viewmodels/dashboard-demo";

const metricIcons: Record<string, IconName> = {
  paw: "animals",
  ticket: "ticket",
  coins: "trend",
};

export function DashboardView({
  onNavigate,
}: {
  onNavigate: (section: DashboardSection) => void;
}) {
  return (
    <>
      <SectionHeading
        title="Panel principal"
        description="Resumen general del zoológico"
      />
      <div className="metric-grid">
        {demoMetrics.map((metric) => (
          <Card className="metric-card" key={metric.label}>
            <div className="metric-card__top">
              <span className="metric-icon">
                <Icon name={metricIcons[metric.icon]} />
              </span>
              {metric.label === "Ingresos" && <Badge tone="warning">Muestra</Badge>}
            </div>
            <strong className="metric-value">{metric.value}</strong>
            <span className="metric-label">{metric.label}</span>
            <span className="metric-detail">{metric.detail}</span>
          </Card>
        ))}
      </div>

      <Card className="chart-card">
        <div className="card-heading">
          <div>
            <h2>Ingresos de los últimos días</h2>
            <p>Importes ficticios · últimos 7 días</p>
          </div>
          <Button variant="secondary" onClick={() => onNavigate("reports")}>
            Ver reporte
          </Button>
        </div>
        <div
          className="bar-chart"
          role="img"
          aria-label="Gráfica demostrativa de importes por día; no corresponde a ventas reales"
        >
          {demoRevenue.map((item) => (
            <div className="bar-chart__item" key={item.day}>
              <span className="bar-chart__amount">{item.amount}</span>
              <div
                className="bar-chart__bar"
                style={{ height: `${item.height}%` }}
                aria-hidden="true"
              />
              <span className="bar-chart__day">{item.day}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="summary-grid">
        <Card className="summary-card">
          <div className="summary-card__icon">
            <Icon name="news" />
          </div>
          <div>
            <h2>Noticias <span>18</span></h2>
            <p>Publicadas y en borrador · datos de muestra</p>
          </div>
          <Button variant="secondary" onClick={() => onNavigate("news")}>
            Ir al módulo
          </Button>
        </Card>
        <Card className="summary-card summary-card--green">
          <div className="summary-card__icon">
            <Icon name="calendar" />
          </div>
          <div>
            <h2>Eventos <span>7</span></h2>
            <p>Programación demostrativa del mes</p>
          </div>
          <Button variant="secondary" onClick={() => onNavigate("events")}>
            Ir al módulo
          </Button>
        </Card>
      </div>

      <Card className="recent-card">
        <div className="card-heading">
          <div>
            <h2>Actividad reciente</h2>
            <p>Contenido de ejemplo del panel</p>
          </div>
          <Badge tone="info">Demostración</Badge>
        </div>
        <ul className="recent-list">
          {demoNews.slice(0, 2).map((item) => (
            <li key={item.title}>
              <span className="recent-list__dot" aria-hidden="true" />
              <span>{item.title}</span>
              <time>{item.date}</time>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
