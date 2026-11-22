import type { ReactNode } from "react";
import {
  Card,
  Skeleton,
  SkeletonCards,
  SkeletonForm,
  SkeletonRegion,
  SkeletonTable,
  SKELETON_DELAY_MS,
  useDelayedFlag,
  type SkeletonTableColumn,
} from "@arca/ui";

/**
 * Esqueletos de carga con la forma de cada pantalla (dashboard-020 rev. (e), CA-56 a CA-66).
 * Solo presentan: no deciden cuándo se carga (eso lo dice el estado del ViewModel) ni cambian
 * la lógica de carga. Antes de `delayMs` (150 ms) solo hay el aviso oculto «Cargando…», así
 * una carga rápida no parpadea.
 */

type Delayable = { label?: string; delayMs?: number };

/** Muestra `children` solo cuando la carga ya tardó; antes, el aviso accesible vacío. */
export function Delayed({
  label = "Cargando…",
  delayMs = SKELETON_DELAY_MS,
  children,
}: Delayable & { children: ReactNode }) {
  const show = useDelayedFlag(true, delayMs);

  if (!show) return <SkeletonRegion label={label} className="loading-skeleton" />;

  return (
    <SkeletonRegion label={label} className="loading-skeleton">
      {children}
    </SkeletonRegion>
  );
}

const TABLE_CLASSES = { className: "table-scroll data-table-scroll", tableClassName: "data-table" };

/** Tabla con las columnas reales; `columns` puede ser la lista de la vista (`DataTableColumn`). */
export function TableSkeleton({
  columns,
  rows = 5,
  caption,
  label,
  delayMs,
}: Delayable & {
  columns: ReadonlyArray<string | { header: string; className?: string }>;
  rows?: number;
  caption?: string;
}) {
  return (
    <Delayed label={label} delayMs={delayMs}>
      <SkeletonTable
        region={false}
        columns={columns as ReadonlyArray<SkeletonTableColumn>}
        rows={rows}
        caption={caption}
        {...TABLE_CLASSES}
      />
    </Delayed>
  );
}

export type CardGridKind = "news" | "events" | "enclosures" | "species";

/** Rejilla de tarjetas con las clases de la rejilla real de cada sección. */
export function CardGridSkeleton({
  kind,
  count,
  label,
  delayMs,
}: Delayable & { kind: CardGridKind; count?: number }) {
  return (
    <Delayed label={label} delayMs={delayMs}>
      {kind === "species" ? (
        // Foto 4:3 como la tarjeta real (dashboard-010 CA-75).
        <SkeletonCards
          region={false}
          className="species-grid"
          cardClassName="species-card"
          count={count ?? 6}
          imageRatio="4 / 3"
          lines={3}
          actions={1}
        />
      ) : kind === "enclosures" ? (
        <SkeletonCards
          region={false}
          className="enclosure-grid"
          cardClassName="enclosure-card"
          count={count ?? 4}
          image={false}
          lines={1}
          actions={3}
        />
      ) : (
        <SkeletonCards
          region={false}
          className={kind === "events" ? "event-card-grid" : "content-card-grid"}
          cardClassName="content-card"
          count={count ?? (kind === "events" ? 4 : 3)}
          imageHeight="8.125rem"
          lines={2}
          actions={3}
        />
      )}
    </Delayed>
  );
}

function MetricCards({ count, heading = true }: { count: number; heading?: boolean }) {
  return (
    <section className="totals-section">
      {heading && <Skeleton variant="title" width="10rem" />}
      <div className="report-metric-grid">
        {Array.from({ length: count }, (_, index) => (
          <Card className="report-metric" key={index}>
            <Skeleton width="55%" />
            <Skeleton variant="title" width="40%" />
          </Card>
        ))}
      </div>
    </section>
  );
}

function TableCard({
  title,
  columns,
  rows = 5,
}: {
  title?: boolean;
  columns: ReadonlyArray<string>;
  rows?: number;
}) {
  return (
    <Card className="table-card">
      {title && (
        <div className="card-heading">
          <div>
            <Skeleton variant="title" width="12rem" />
          </div>
        </div>
      )}
      <SkeletonTable region={false} columns={columns} rows={rows} {...TABLE_CLASSES} />
    </Card>
  );
}

/** Reglas: se mantienen iguales a las columnas de `TicketReportView` (lo vigila un test). */
export const TICKET_REPORT_DAILY_COLUMNS = ["Fecha", "Boletos", "Adultos", "Niños", "Ingresos"] as const;
export const TICKET_REPORT_TICKET_COLUMNS = ["Folio", "Fecha y hora", "Adultos", "Niños", "Total"] as const;

/** Reportes: Boletos (4 métricas, desglose diario y boletos del periodo). */
export function TicketReportSkeleton({ label = "Cargando el reporte…", delayMs }: Delayable) {
  return (
    <Delayed label={label} delayMs={delayMs}>
      <div className="report-skeleton">
        <MetricCards count={4} />
        <TableCard title columns={TICKET_REPORT_DAILY_COLUMNS} rows={7} />
        <TableCard title columns={TICKET_REPORT_TICKET_COLUMNS} rows={6} />
      </div>
    </Delayed>
  );
}

export const CANCELLATION_BREAKDOWN_CASHIER_COLUMNS = ["Cajero", "Boletos", "Importe"] as const;
export const CANCELLATION_BREAKDOWN_REASON_COLUMNS = ["Motivo", "Boletos", "Importe"] as const;
export const CANCELLATION_DAY_COLUMNS = ["Día", "Vendido bruto", "Cancelado", "Neto"] as const;
export const CANCELLATION_CASHIER_COLUMNS = [
  "Cajero",
  "Vendido bruto",
  "Cancelado",
  "Neto",
  "Boletos vendidos",
  "% cancelación",
  "Días por revisar",
  "Días con actividad",
] as const;
export const CANCELLATION_TRAFFIC_COLUMNS = [
  "Fecha",
  "Cajero",
  "Nivel",
  "Vendidos",
  "Cancelados",
  "% cancelado",
  "Señales",
  "Revisión vigente",
  "Acción",
] as const;
export const CANCELLATION_ROW_COLUMNS = [
  "Folio",
  "Adultos",
  "Niños",
  "Importe",
  "Venta",
  "Cancelación",
  "Vendió",
  "Canceló",
  "Motivo",
  "Comentario",
  "Minutos",
  "Tardía",
  "Señales",
] as const;

/** Reportes: Cancelaciones (totales, desgloses, conciliación, semáforo y boletos cancelados). */
export function CancellationReportSkeleton({ label = "Cargando el reporte…", delayMs }: Delayable) {
  return (
    <Delayed label={label} delayMs={delayMs}>
      <div className="report-skeleton">
        <MetricCards count={2} />
        <div className="cancellation-breakdowns">
          <TableCard title columns={CANCELLATION_BREAKDOWN_CASHIER_COLUMNS} rows={3} />
          <TableCard title columns={CANCELLATION_BREAKDOWN_REASON_COLUMNS} rows={3} />
        </div>
        <Skeleton variant="title" width="9rem" />
        <TableCard title columns={CANCELLATION_DAY_COLUMNS} rows={4} />
        <TableCard title columns={CANCELLATION_CASHIER_COLUMNS} rows={3} />
        <Skeleton variant="title" width="11rem" />
        <TableCard columns={CANCELLATION_TRAFFIC_COLUMNS} rows={5} />
        <TableCard title columns={CANCELLATION_ROW_COLUMNS} rows={6} />
      </div>
    </Delayed>
  );
}

/** Panel principal: dos bloques de métricas (Hoy y 7 días) y la gráfica de barras. */
export function DashboardSummarySkeleton({ label = "Cargando el resumen…", delayMs }: Delayable) {
  return (
    <Delayed label={label} delayMs={delayMs}>
      <div className="report-skeleton">
        <MetricCards count={4} />
        <MetricCards count={4} />
        <Card className="chart-card">
          <div className="card-heading">
            <div>
              <Skeleton variant="title" width="10rem" />
              <Skeleton width="6rem" />
            </div>
          </div>
          <div className="loading-skeleton__bars">
            {Array.from({ length: 7 }, (_, index) => (
              <div className="loading-skeleton__bar-row" key={index}>
                <Skeleton width="2.5rem" />
                <Skeleton height="1.25rem" width={`${30 + ((index * 17) % 60)}%`} />
                <Skeleton width="3.5rem" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Delayed>
  );
}

/** Detalle de especie, solicitud o recuerdo: foto, datos y formulario de la ficha. */
export function DetailSkeleton({
  label = "Cargando…",
  delayMs,
  withForm = false,
}: Delayable & { withForm?: boolean }) {
  return (
    <Delayed label={label} delayMs={delayMs}>
      <Card className="loading-skeleton__detail">
        <div className="loading-skeleton__detail-head">
          <Skeleton variant="image" className="loading-skeleton__detail-photo" aspectRatio="4 / 3" />
          <div className="loading-skeleton__detail-text">
            <Skeleton variant="title" width="50%" />
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} width={`${85 - index * 9}%`} />
            ))}
            <Skeleton variant="button" />
          </div>
        </div>
        {withForm && <SkeletonForm region={false} fields={6} buttons={2} columns={2} />}
      </Card>
    </Delayed>
  );
}

/** Formulario de edición o alta mientras se cargan sus datos. */
export function FormSkeleton({
  label = "Cargando el formulario…",
  delayMs,
  fields = 4,
}: Delayable & { fields?: number }) {
  return (
    <Delayed label={label} delayMs={delayMs}>
      <Card>
        <SkeletonForm region={false} fields={fields} buttons={2} />
      </Card>
    </Delayed>
  );
}

/** Precios vigentes (Precios): las dos tarjetas de Adulto y Niño. */
export function PricesSkeleton({ label = "Cargando los precios vigentes…", delayMs }: Delayable) {
  return (
    <Delayed label={label} delayMs={delayMs}>
      <div className="ticket-type-grid">
        {["adult", "child"].map((kind) => (
          <Card className="ticket-type-card" key={kind}>
            <Skeleton variant="title" width="30%" />
            <Skeleton variant="title" width="45%" height="1.75rem" />
            <Skeleton width="70%" />
          </Card>
        ))}
      </div>
    </Delayed>
  );
}

/** Precio vigente dentro de la tarjeta de Venta (reemplaza el texto «Cargando…»). */
export function PriceLineSkeleton({ label = "Cargando el precio…", delayMs }: Delayable) {
  return (
    <Delayed label={label} delayMs={delayMs}>
      <Skeleton variant="title" width="6rem" height="1.75rem" />
    </Delayed>
  );
}
