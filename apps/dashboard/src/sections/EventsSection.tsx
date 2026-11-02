import { EventsView } from "@/views/EventsView";
import { useEventsManagement } from "@/viewmodels/useEventsManagement";

export function EventsSection() {
  const viewModel = useEventsManagement();

  return <EventsView {...viewModel} />;
}
