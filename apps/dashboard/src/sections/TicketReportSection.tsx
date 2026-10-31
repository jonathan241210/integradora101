import { TicketReportView } from "@/views/TicketReportView";
import { useTicketReport } from "@/viewmodels/useTicketReport";

export function TicketReportSection() {
  const viewModel = useTicketReport();

  return <TicketReportView {...viewModel} />;
}
