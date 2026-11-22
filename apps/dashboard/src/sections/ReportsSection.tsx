import { ReportTabs } from "@/components/ReportTabs";
import { SectionHeading } from "@/components/SectionHeading";
import { CancellationReportSection } from "@/sections/CancellationReportSection";
import { TicketHistorySection } from "@/sections/TicketHistorySection";
import { TicketReportSection } from "@/sections/TicketReportSection";
import {
  resolveActiveReportTab,
  type ReportTab,
  type ReportTabId,
} from "@/viewmodels/report-tabs";
import type { PendingCounts } from "@/viewmodels/pending-review";
import type { TicketHistoryFocus } from "@/viewmodels/useTicketHistory";

/**
 * Apartado «Reportes» (dashboard-020 CA-02 a CA-08): monta solo la pestaña activa, así que
 * cambiar de pestaña no llama a la API de la anterior (CA-05). El historial de «Reportes»
 * no ofrece cancelar; eso lo decide `tickets.cancel`, no `cancellable` (RN-04).
 */
export function ReportsSection({
  tabs,
  selected,
  canCancel,
  canReviewCancellations = false,
  counts = {},
  onSelectTab,
  historyFocus = null,
}: {
  tabs: ReportTab[];
  selected: ReportTabId | null;
  canCancel: boolean;
  /** `reports.cancellations.view`: botón de revisión del semáforo (dashboard-021 CA-05). */
  canReviewCancellations?: boolean;
  /** Conteos de pendientes para el puntito de la pestaña (dashboard-021 CA-11). */
  counts?: PendingCounts;
  onSelectTab: (tab: ReportTabId) => void;
  historyFocus?: TicketHistoryFocus;
}) {
  const active = resolveActiveReportTab(selected, tabs);

  return (
    <>
      <SectionHeading
        eyebrow="Administración"
        title="Reportes"
        description="Consulta las ventas, las cancelaciones y el historial de boletos de la taquilla."
      />
      {active && (
        <ReportTabs tabs={tabs} active={active} counts={counts} onSelect={onSelectTab}>
          {active === "tickets" && <TicketReportSection heading={false} />}
          {active === "cancellations" && <CancellationReportSection heading={false} canReview={canReviewCancellations} />}
          {active === "history" && (
            <TicketHistorySection
              heading={false}
              canCancel={canCancel}
              focus={historyFocus}
            />
          )}
        </ReportTabs>
      )}
    </>
  );
}
