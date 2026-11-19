import { EventsView } from "@/views/EventsView";
import { useEventsManagement } from "@/viewmodels/useEventsManagement";

export function EventsSection({ focus = null }: { focus?: { id: number; nonce: number } | null }) {
  const viewModel = useEventsManagement();

  return <EventsView {...viewModel} focus={focus} />;
}
