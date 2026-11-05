import { TicketSaleView } from "@/views/TicketSaleView";
import { useTicketPrintSettings } from "@/viewmodels/useTicketPrintSettings";
import { useTicketSale } from "@/viewmodels/useTicketSale";

export function TicketSaleSection() {
  const viewModel = useTicketSale();
  const printSettings = useTicketPrintSettings();

  return <TicketSaleView {...viewModel} printSettings={printSettings} />;
}
