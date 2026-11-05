import { TicketPricesView } from "@/views/TicketPricesView";
import { useTicketPrices } from "@/viewmodels/useTicketPrices";

export function TicketPricesSection() {
  const viewModel = useTicketPrices();

  return <TicketPricesView {...viewModel} />;
}
