import { TicketReportView } from "@/views/TicketReportView";
import { useTicketReport } from "@/viewmodels/useTicketReport";

export function TicketReportSection({ heading = true }: { heading?: boolean }) {
  const viewModel = useTicketReport();

  return <TicketReportView {...viewModel} heading={heading} />;
}
