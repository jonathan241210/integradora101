import { TicketHistoryView } from "@/views/TicketHistoryView";
import { useTicketHistory } from "@/viewmodels/useTicketHistory";

export function TicketHistorySection() {
  const viewModel = useTicketHistory();

  return <TicketHistoryView {...viewModel} />;
}
