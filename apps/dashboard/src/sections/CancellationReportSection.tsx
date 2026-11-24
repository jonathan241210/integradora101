import { CancellationReportView } from "@/views/CancellationReportView";
import { useCancellationReport } from "@/viewmodels/useCancellationReport";
import { useCancellationReview } from "@/viewmodels/useCancellationReview";

/** Pestaña «Cancelaciones»: reporte (dashboard-016) y revisión del semáforo (dashboard-021). */
export function CancellationReportSection({
  heading = true,
  canReview = false,
}: {
  heading?: boolean;
  canReview?: boolean;
}) {
  const viewModel = useCancellationReport();
  const review = useCancellationReview(viewModel.actions.reload);

  return <CancellationReportView {...viewModel} heading={heading} canReview={canReview} review={review} />;
}
