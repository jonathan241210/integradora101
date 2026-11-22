import { TicketHistoryView } from "@/views/TicketHistoryView";
import { useTicketHistory, type TicketHistoryFocus } from "@/viewmodels/useTicketHistory";

export function TicketHistorySection({
  focus = null,
  canCancel = true,
  heading = true,
}: {
  focus?: TicketHistoryFocus;
  canCancel?: boolean;
  heading?: boolean;
}) {
  const viewModel = useTicketHistory(focus);

  return <TicketHistoryView {...viewModel} canCancel={canCancel} heading={heading} />;
}
