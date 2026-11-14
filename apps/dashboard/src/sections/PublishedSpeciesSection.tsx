import { PublishedSpeciesView } from "@/views/PublishedSpeciesView";
import { usePublishedSpecies } from "@/viewmodels/usePublishedSpecies";

export function PublishedSpeciesSection({ onOpenRequests }: { onOpenRequests?: () => void }) {
  const viewModel = usePublishedSpecies();

  return <PublishedSpeciesView {...viewModel} onOpenRequests={onOpenRequests} />;
}
