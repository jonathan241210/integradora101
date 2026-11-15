import { SpeciesRequestsView } from "@/views/SpeciesRequestsView";
import { useSpeciesRequests } from "@/viewmodels/useSpeciesRequests";

export function SpeciesRequestsSection() {
  const viewModel = useSpeciesRequests();

  return <SpeciesRequestsView {...viewModel} />;
}
