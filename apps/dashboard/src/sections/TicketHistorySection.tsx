import { TicketHistoryView } from "@/views/TicketHistoryView";
import { useTicketHistory, type TicketHistoryFocus } from "@/viewmodels/useTicketHistory";

export function TicketHistorySection({ focus = null }: { focus?: TicketHistoryFocus }) {
  const viewModel = useTicketHistory(focus);

  return <TicketHistoryView {...viewModel} />;
}
